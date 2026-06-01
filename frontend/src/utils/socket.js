import { useEffect } from 'react';
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
// Socket connects to the server origin, not the /api REST prefix.
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

let socket = null;

export const getSocket = () => {
  const token = localStorage.getItem('auth_token');
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  } else if (token && socket.auth?.token !== token) {
    // Token changed (re-login) — refresh the handshake.
    socket.auth = { token };
    socket.disconnect().connect();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Subscribe to live queue updates. `onUpdate` is called whenever any station
 * pushes a change; the consumer typically refetches its queue.
 */
export const useQueueSocket = (onUpdate) => {
  useEffect(() => {
    const s = getSocket();
    const handler = (payload) => onUpdate?.(payload);
    s.on('queue:update', handler);
    return () => {
      s.off('queue:update', handler);
    };
  }, [onUpdate]);
};
