import { ChatMessage } from "@/types/game";

export const MOCK_MESSAGES: ChatMessage[] = [
  { id: "1", text: "Joãozinho entrou na sala", isSystem: true },
  { id: "2", text: "Maria entrou na sala", isSystem: true },
  { id: "3", playerId: "2", playerName: "Joãozinho", text: "E aí galera, prontos pra perder?", isSystem: false },
  { id: "4", playerId: "3", playerName: "Maria", text: "Sonha 😂", isSystem: false },
];
