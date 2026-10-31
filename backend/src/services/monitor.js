import { Device } from '../models/Device.js';
import { Message } from '../models/Message.js';
import { deviceStatus, toPublicDevice, toPublicMessage } from '../utils/presenters.js';
import { emitEvent } from '../socket.js';

const lastStatus = new Map();

/**
 * Periodic checks:
 *  - Messages older than MESSAGE_TTL_MS that are still pending/sent are marked failed.
 *  - Devices whose status changed (e.g. heartbeat timed out) are pushed to the dashboard.
 */
export function startMonitor(intervalMs = 5000) {
  const tick = async () => {
    try {
      const ttl = Number(process.env.MESSAGE_TTL_MS) || 600000;
      const cutoff = new Date(Date.now() - ttl);

      const expired = await Message.find({
        status: { $in: ['pending', 'sent'] },
        createdAt: { $lt: cutoff },
      })
        .select('_id')
        .lean();

      if (expired.length) {
        const ids = expired.map((m) => m._id);
        await Message.updateMany(
          { _id: { $in: ids } },
          { $set: { status: 'failed', failedReason: 'Timed out before delivery' } },
        );
        const failed = await Message.find({ _id: { $in: ids } }).lean();
        failed.forEach((m) => emitEvent('message:update', toPublicMessage(m)));
      }

      const devices = await Device.find({ revoked: false }).lean();
      for (const device of devices) {
        const status = deviceStatus(device);
        if (lastStatus.get(device.deviceId) !== status) {
          lastStatus.set(device.deviceId, status);
          emitEvent('device:update', toPublicDevice(device));
        }
      }
    } catch (err) {
      console.error('Monitor error:', err.message);
    }
  };

  tick();
  return setInterval(tick, intervalMs);
}
