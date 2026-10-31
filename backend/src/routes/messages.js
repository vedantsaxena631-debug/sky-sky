import { Router } from 'express';
import { z } from 'zod';
import { Device } from '../models/Device.js';
import { Message, MESSAGE_STATUSES } from '../models/Message.js';
import { requireDevice, requireOperator, requireSenderAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/httpError.js';
import { validate } from '../utils/validate.js';
import { toPublicMessage } from '../utils/presenters.js';
import { emitEvent } from '../socket.js';

const router = Router();

const deviceId = z.string().regex(/^TEAM-[AB]-[A-F0-9]{6}$/, 'Invalid device id');
const objectId = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid message id');

const sendSchema = z.object({
  to: deviceId,
  body: z.string().trim().min(1).max(240),
  from: deviceId.optional(), // only used with the operator key
});

// POST /api/messages/send  (device token, or operator key + "from")
router.post(
  '/send',
  requireSenderAuth,
  asyncHandler(async (req, res) => {
    const { to, body, from } = validate(sendSchema, req.body);

    let sender = req.device;
    if (!sender && req.viaOperator && from) {
      sender = await Device.findOne({ deviceId: from, revoked: false });
    }
    if (!sender) throw new HttpError(400, 'Sender could not be determined. With the operator key, provide "from".');

    const recipient = await Device.findOne({ deviceId: to, revoked: false });
    if (!recipient) throw new HttpError(404, 'Recipient device not found');
    if (recipient.team === sender.team) {
      throw new HttpError(400, 'Messages must travel between Team A and Team B');
    }

    const message = await Message.create({
      from: sender.deviceId,
      to: recipient.deviceId,
      fromTeam: sender.team,
      toTeam: recipient.team,
      body,
      status: 'pending',
    });

    const pub = toPublicMessage(message);
    emitEvent('message:new', pub);
    res.status(201).json({ success: true, data: pub });
  }),
);

const statusSchema = z.object({
  status: z.enum(['sent', 'failed']),
  reason: z.string().max(120).optional(),
});

// The sending node reports LoRa transmit result: pending -> sent | failed
router.post(
  '/:id/status',
  requireDevice,
  asyncHandler(async (req, res) => {
    const messageId = validate(objectId, req.params.id);
    const { status, reason } = validate(statusSchema, req.body);

    const message = await Message.findById(messageId);
    if (!message) throw new HttpError(404, 'Message not found');
    if (message.from !== req.device.deviceId) {
      throw new HttpError(403, 'Only the sending device can update this message');
    }
    if (!['pending', 'sent'].includes(message.status)) {
      throw new HttpError(409, `Message is already ${message.status}`);
    }

    message.status = status;
    if (status === 'failed') message.failedReason = reason || 'Reported failed by device';
    await message.save();

    const pub = toPublicMessage(message);
    emitEvent('message:update', pub);
    res.json({ success: true, data: pub });
  }),
);

const receiveSchema = z.object({
  ackIds: z.array(objectId).max(50).default([]),
});

// The receiving node pulls its inbox and acknowledges what it got.
// ackIds from this call mark messages as delivered; the response is the remaining inbox.
router.post(
  '/receive',
  requireDevice,
  asyncHandler(async (req, res) => {
    const { ackIds } = validate(receiveSchema, req.body ?? {});
    const me = req.device.deviceId;

    if (ackIds.length) {
      const result = await Message.updateMany(
        { _id: { $in: ackIds }, to: me, status: { $in: ['pending', 'sent'] } },
        { $set: { status: 'delivered', deliveredAt: new Date() } },
      );
      if (result.modifiedCount) {
        const updated = await Message.find({ _id: { $in: ackIds }, to: me, status: 'delivered' }).lean();
        updated.forEach((m) => emitEvent('message:update', toPublicMessage(m)));
      }
    }

    const inbox = await Message.find({ to: me, status: { $in: ['pending', 'sent'] } })
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();

    res.json({ success: true, data: inbox.map(toPublicMessage) });
  }),
);

const listSchema = z.object({
  team: z.enum(['A', 'B']).optional(),
  status: z.enum(MESSAGE_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// Operator dashboard: newest first.
router.get(
  '/',
  requireOperator,
  asyncHandler(async (req, res) => {
    const query = validate(listSchema, req.query);
    const filter = {};
    if (query.team) filter.$or = [{ fromTeam: query.team }, { toTeam: query.team }];
    if (query.status) filter.status = query.status;

    const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(query.limit).lean();
    res.json({ success: true, data: messages.map(toPublicMessage) });
  }),
);

export default router;
