'use client';

import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';
import { getToken } from './auth';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (socket) return socket;

  socket = io(API_URL, {
    transports: ['websocket'],
    auth: { token: getToken() },
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
