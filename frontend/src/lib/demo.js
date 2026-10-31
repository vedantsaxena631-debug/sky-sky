// Demo Mode data. It exists only in this browser and is never sent to the backend or hardware.
const NOW = new Date().toISOString();

export const DEMO_DEVICES = [
  {
    id: 'demo-team-a',
    name: 'Team A Node (Demo)',
    deviceId: 'DEMO-TEAM-A',
    team: 'A',
    status: 'demo',
    lastSeen: NOW,
    rssi: -72,
    snr: 9.5,
    firmware: 'demo',
    demo: true,
  },
  {
    id: 'demo-team-b',
    name: 'Team B Node (Demo)',
    deviceId: 'DEMO-TEAM-B',
    team: 'B',
    status: 'demo',
    lastSeen: NOW,
    rssi: -78,
    snr: 7.2,
    firmware: 'demo',
    demo: true,
  },
];

export function makeDemoMessage(fromDevice, toDevice, body) {
  return {
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    from: fromDevice.deviceId,
    to: toDevice.deviceId,
    fromTeam: fromDevice.team,
    toTeam: toDevice.team,
    body,
    status: 'pending',
    failedReason: null,
    createdAt: new Date().toISOString(),
    deliveredAt: null,
    demo: true,
  };
}
