import { Server } from 'socket.io';

let _io: Server | null = null;

export function setIO(instance: Server) {
  _io = instance;
}

// Retorna null em vez de lançar exceção se chamado antes do servidor subir
export function getIO(): Server | null {
  return _io;
}
