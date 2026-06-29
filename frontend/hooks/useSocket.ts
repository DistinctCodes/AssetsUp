
import { useEffect, useState } from 'react';
import { getSocket, disconnectSocket } from '../lib/socket';
import { Socket } from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = getSocket();
    setSocket(newSocket);

    return () => {
      disconnectSocket();
    };
  }, []);

  const on = (event: string, callback: (...args: any[]) => void) => {
    socket?.on(event, callback);
  };

  const off = (event: string, callback: (...args: any[]) => void) => {
    socket?.off(event, callback);
  };

  return { socket, on, off };
};