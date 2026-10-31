import 'dotenv/config';
import http from 'node:http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket.js';
import { startMonitor } from './services/monitor.js';

const PORT = process.env.PORT || 5000;

const requiredEnv = ['MONGODB_URI', 'ADMIN_API_KEY', 'OPERATOR_API_KEY'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

await connectDB();

const server = http.createServer(app);
initSocket(server);
startMonitor();

server.listen(PORT, () => {
  console.log(`SkyBridge API listening on port ${PORT}`);
});
