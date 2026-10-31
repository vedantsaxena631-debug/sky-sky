const DEFAULT_TIMEOUT_MS = 60000;

/**
 * A device is ONLINE only when its last valid heartbeat is within the timeout.
 * Nothing is marked online by default.
 */
export function deviceStatus(device, now = Date.now()) {
  if (device.revoked) return 'revoked';
  if (!device.lastSeen) return 'never';
  const timeout = Number(process.env.DEVICE_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  return now - new Date(device.lastSeen).getTime() <= timeout ? 'online' : 'offline';
}

export function toPublicDevice(device) {
  return {
    id: String(device._id),
    name: device.name,
    deviceId: device.deviceId,
    team: device.team,
    status: deviceStatus(device),
    lastSeen: device.lastSeen ?? null,
    rssi: device.rssi ?? null,
    snr: device.snr ?? null,
    firmware: device.firmware ?? null,
  };
}

export function toPublicMessage(message) {
  return {
    id: String(message._id),
    from: message.from,
    to: message.to,
    fromTeam: message.fromTeam,
    toTeam: message.toTeam,
    body: message.body,
    status: message.status,
    failedReason: message.failedReason ?? null,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    deliveredAt: message.deliveredAt ?? null,
  };
}
