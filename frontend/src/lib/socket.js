import { io } from 'socket.io-client';
import { API_BASE } from './api.js';

/** Real-time updates for the operator dashboard. */
export function connectOperatorSocket(operatorKey) {
  return io(API_BASE, {
    auth: { operatorKey },
    transports: ['websocket', 'polling'],
    reconnectionDelayMax: 10000,
  });
}
