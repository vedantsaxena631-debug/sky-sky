import { Server } from 'socket.io';
import { safeEqual } from './utils/crypto.js';

let io = null;

/**
 * Real-time channel for the operator dashboard only.
 * Clients must present the operator key in the handshake auth.
 */
export function initSocket(httpServer) {
  const origins = process.env.CLIENT_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);

  io = new Server(httpServer, {
    cors: { origin: origins?.length ? origins : '*' },
  });

  io.use((socket, next) => {
    const ok = safeEqual(socket.handshake.auth?.operatorKey, process.env.OPERATOR_API_KEY);
    return ok ? next() : next(new Error('Unauthorized'));
  });

  io.on('connection', (socket) => {
    socket.join('operators');
  });

  return io;
}

export function emitEvent(event, payload) {
  io?.to('operators').emit(event, payload);
}
