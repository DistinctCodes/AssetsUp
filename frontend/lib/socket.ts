
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

const URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

let socket: Socket;

export const getSocket = (): Socket => {
  if (!socket) {
    const { accessToken } = useAuthStore.getState();
    socket = io(URL, {
      auth: {
        token: accessToken,
      },
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};