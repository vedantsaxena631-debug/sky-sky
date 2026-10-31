import { Router } from 'express';
import { z } from 'zod';
import { Device } from '../models/Device.js';
import { requireAdmin, requireDevice, requireOperator } from '../middleware/auth.js';
import { asyncHandler } from '../utils/httpError.js';
import { validate } from '../utils/validate.js';
import { generateToken, hashToken, randomHex } from '../utils/crypto.js';
import { toPublicDevice } from '../utils/presenters.js';
import { emitEvent } from '../socket.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(60),
  team: z.enum(['A', 'B']),
});

// Admin-only. Returns the device token exactly once.
router.post(
  '/register',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { name, team } = validate(registerSchema, req.body);
    const token = generateToken();

    const device = await Device.create({
      name,
      team,
      deviceId: `TEAM-${team}-${randomHex(3).toUpperCase()}`,
      tokenHash: hashToken(token),
    });

    res.status(201).json({
      success: true,
      data: { ...toPublicDevice(device), token },
      message: 'Save this token on the device now. It is shown only once.',
    });
  }),
);

const heartbeatSchema = z.object({
  rssi: z.number().int().min(-160).max(20).optional(),
  snr: z.number().min(-40).max(30).optional(),
  firmware: z.string().max(20).optional(),
});

// Device-authenticated. This is the ONLY thing that makes a device ONLINE.
router.post(
  '/heartbeat',
  requireDevice,
  asyncHandler(async (req, res) => {
    const body = validate(heartbeatSchema, req.body ?? {});
    const device = req.device;

    device.lastSeen = new Date();
    if (body.rssi !== undefined) device.rssi = body.rssi;
    if (body.snr !== undefined) device.snr = body.snr;
    if (body.firmware !== undefined) device.firmware = body.firmware;
    await device.save();

    const pub = toPublicDevice(device);
    emitEvent('device:update', pub);

    res.json({
      success: true,
      data: { status: pub.status, serverTime: device.lastSeen, heartbeatIntervalMs: 15000 },
    });
  }),
);

// Operator dashboard.
router.get(
  '/',
  requireOperator,
  asyncHandler(async (_req, res) => {
    const devices = await Device.find({ revoked: false }).sort({ team: 1, name: 1 }).lean();
    res.json({ success: true, data: devices.map(toPublicDevice) });
  }),
);

export default router;
