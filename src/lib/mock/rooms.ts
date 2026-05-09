import { Room } from "@/types/game";

export const MOCK_ROOMS: Room[] = [
  {
    id: "1",
    code: "XJ9P2",
    name: "Galera do Fundão",
    isPrivate: false,
    playersCount: 4,
    maxPlayers: 8,
    rounds: 5,
    status: "waiting"
  },
  {
    id: "2",
    code: "B4R7T",
    name: "Só os Nerds",
    isPrivate: true,
    playersCount: 7,
    maxPlayers: 10,
    rounds: 10,
    status: "waiting"
  },
  {
    id: "3",
    code: "L0L0L",
    name: "Sextou com Stop",
    isPrivate: false,
    playersCount: 2,
    maxPlayers: 5,
    rounds: 3,
    status: "waiting"
  }
];
