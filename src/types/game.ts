import type { Database } from './database';

export type Room = Database['public']['Tables']['rooms']['Row'] & {
  playersCount?: number;
};

export type Player = Database['public']['Tables']['players']['Row'];

export type GameStatus = 'waiting' | 'starting' | 'playing' | 'validating' | 'results' | 'finished';

export interface GameState {
  roomId: string;
  roomCode: string;
  status: GameStatus;
  currentRound: number;
  totalRounds: number;
  letter?: string;
  hostId: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: 'chat' | 'system';
}
