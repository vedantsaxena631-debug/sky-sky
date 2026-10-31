import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import deviceRoutes from './routes/devices.js';
import messageRoutes from './routes/messages.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

const origins = process.env.CLIENT_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);

app.disable('x-powered-by');
app.set('trust proxy', 1); // Render runs behind a proxy
app.use(helmet());
app.use(cors({ origin: origins?.length ? origins : true }));
app.use(express.json({ limit: '4kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date() } });
});

app.use('/api/devices', deviceRoutes);
app.use('/api/messages', messageRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
