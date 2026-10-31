// Usage:
//   ADMIN_API_KEY=... node scripts/register-device.js "Team A Node" A
//   API_BASE=https://your-backend.onrender.com/api ADMIN_API_KEY=... node scripts/register-device.js "Team B Node" B

const [, , name, team] = process.argv;
const base = process.env.API_BASE || 'http://localhost:5000/api';

if (!name || !['A', 'B'].includes(team)) {
  console.error('Usage: node scripts/register-device.js "<device name>" <A|B>');
  process.exit(1);
}

const res = await fetch(`${base}/devices/register`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-key': process.env.ADMIN_API_KEY || '',
  },
  body: JSON.stringify({ name, team }),
});

const json = await res.json();
if (!res.ok) {
  console.error('Registration failed:', json.message, json.details ?? '');
  process.exit(1);
}

console.log('\nDevice registered. Put these into the ESP32 sketch (the token is shown ONCE):\n');
console.log(`DEVICE_ID    = ${json.data.deviceId}`);
console.log(`DEVICE_TOKEN = ${json.data.token}\n`);
