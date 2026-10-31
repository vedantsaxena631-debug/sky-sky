// Tests the device API without hardware.
// Usage: DEVICE_TOKEN=<token> node scripts/simulate-device.js
// Sends a heartbeat, pulls the inbox, and acknowledges any messages.

const base = process.env.API_BASE || 'http://localhost:5000/api';
const token = process.env.DEVICE_TOKEN;

if (!token) {
  console.error('DEVICE_TOKEN is required');
  process.exit(1);
}

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

const post = async (path, body = {}) => {
  const res = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path}: ${json.message}`);
  return json.data;
};

console.log('Heartbeat:', await post('/devices/heartbeat', { rssi: -70, snr: 8, firmware: 'simulator-1.0' }));

const inbox = await post('/messages/receive');
console.log(`Inbox: ${inbox.length} message(s)`);
inbox.forEach((m) => console.log(`  [${m.from}] ${m.body}`));

if (inbox.length) {
  const remaining = await post('/messages/receive', { ackIds: inbox.map((m) => m.id) });
  console.log(`Acknowledged ${inbox.length}. Still pending: ${remaining.length}`);
}
