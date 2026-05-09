export interface Player {
  id: string;
  name: string; // Used to match nickname in Phase 1
  score?: number;
  isReady?: boolean;
  isOnline?: boolean;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  isPrivate: boolean;
  playersCount: number;
  maxPlayers: number;
  rounds: number;
  status: string;
  total_rounds?: number;
}

export interface ChatMessage {
  id: string;
  playerId?: string | null;
  playerName?: string;
  text: string;
  isSystem: boolean;
}

export interface Category {
  id: string;
  name: string;
}
