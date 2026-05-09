import { Database } from "@/types/database";

type Answer = Database['public']['Tables']['answers']['Row'];
type Vote = Database['public']['Tables']['validation_votes']['Row'];
type Confirmation = Database['public']['Tables']['validation_confirmations']['Row'];

export function normalizeAnswer(answer: string): string {
  if (!answer) return "";
  return answer
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export interface AnswerGroup {
  normalizedAnswer: string;
  displayAnswer: string;
  playerIds: string[];
  playerNames: string[];
  answerIds: string[];
}

export function groupAnswersByCategory(
  answers: Answer[],
  players: { id: string, name: string }[],
  categoryId: string
): AnswerGroup[] {
  const catAnswers = answers.filter(a => a.category_id === categoryId);
  const map: Record<string, AnswerGroup> = {};

  for (const player of players) {
    const ans = catAnswers.find(a => a.player_id === player.id);
    if (ans && ans.answer && ans.answer.trim() !== "") {
      const norm = normalizeAnswer(ans.answer);
      if (!map[norm]) {
        map[norm] = {
          normalizedAnswer: norm,
          displayAnswer: ans.answer.trim().toUpperCase(),
          playerIds: [],
          playerNames: [],
          answerIds: [],
        };
      }
      map[norm].playerIds.push(player.id);
      map[norm].playerNames.push(player.name);
      map[norm].answerIds.push(ans.id);
    }
  }
  return Object.values(map);
}

export function getVotesForAnswerGroup({
  votes, roundId, categoryId, normalizedAnswer,
}: {
  votes: Vote[];
  roundId: string;
  categoryId: string;
  normalizedAnswer: string;
}) {
  const relevant = votes.filter(
    v => v.round_id === roundId &&
         v.category_id === categoryId &&
         v.normalized_answer === normalizedAnswer
  );
  // Deduplicar por voter_id (manter último no array)
  const byVoter = new Map<string, string>();
  relevant.forEach(v => byVoter.set(v.voter_id, v.vote));

  let validVotes = 0;
  let invalidVotes = 0;
  byVoter.forEach(v => { if (v === 'valid') validVotes++; else invalidVotes++; });

  return { 
    validVotes, 
    invalidVotes, 
    totalVotes: byVoter.size,
    votes: Array.from(byVoter.entries()).map(([voter_id, vote]) => ({ voter_id, vote }))
  };
}

export function getConfirmedPlayerIds(
  confirmations: Confirmation[],
  roundId: string,
  categoryId: string
): string[] {
  return confirmations
    .filter(c => c.round_id === roundId && c.category_id === categoryId)
    .map(c => c.player_id);
}
