import { Database } from "@/types/database";
import { normalizeAnswer } from "./validation";

type Answer = Database['public']['Tables']['answers']['Row'];
type Vote = Database['public']['Tables']['validation_votes']['Row'];

export function dedupeVotesByVoter(votes: Vote[]) {
  const byVoter = new Map<string, string>();
  // Mantém o voto mais recente de cada voter_id
  votes.forEach(v => byVoter.set(v.voter_id, v.vote));
  return byVoter;
}

export function countVotesForGroup({
  votes,
  roundId,
  categoryId,
  normalizedAnswer
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

  const byVoter = dedupeVotesByVoter(relevant);

  let validVotes = 0;
  let invalidVotes = 0;
  byVoter.forEach(v => {
    if (v === 'valid') validVotes++;
    else invalidVotes++;
  });

  return { validVotes, invalidVotes, totalVotes: byVoter.size };
}

export function calculatePointsForAnswerGroup({
  playerCountInGroup,
  validVotes,
  invalidVotes
}: {
  playerCountInGroup: number;
  validVotes: number;
  invalidVotes: number;
}) {
  // Regra: validVotes > invalidVotes = resposta válida
  // Se invalidVotes >= validVotes = resposta inválida
  const isValid = validVotes > invalidVotes;

  if (!isValid) return 0;

  // Resposta válida única: 10 pontos
  // Resposta válida repetida por 2 ou mais: 5 pontos cada
  return playerCountInGroup === 1 ? 10 : 5;
}


/**
 * Calcula as atualizações necessárias para a tabela 'answers' de uma categoria específica.
 */
export function calculateCategoryAnswerUpdates({
  answers,
  votes,
  roundId,
  categoryId
}: {
  answers: Answer[];
  votes: Vote[];
  roundId: string;
  categoryId: string;
}) {
  const updates: { id: string, points: number, is_valid: boolean }[] = [];

  // 1. Filtrar answers da categoria e rodada atual
  const catAnswers = answers.filter(a => a.round_id === roundId && a.category_id === categoryId);

  // 2. Separar vazias
  const emptyAnswers = catAnswers.filter(a => !a.answer || a.answer.trim() === '');
  emptyAnswers.forEach(a => {
    updates.push({ id: a.id, points: 0, is_valid: false });
  });

  // 3. Agrupar preenchidas por normalização
  const filledAnswers = catAnswers.filter(a => a.answer && a.answer.trim() !== '');
  const groups = new Map<string, Answer[]>();

  filledAnswers.forEach(a => {
    const norm = normalizeAnswer(a.answer || "");
    if (!groups.has(norm)) groups.set(norm, []);
    groups.get(norm)!.push(a);
  });

  // 4. Processar cada grupo
  groups.forEach((groupAns, norm) => {
    const { validVotes, invalidVotes } = countVotesForGroup({
      votes,
      roundId,
      categoryId,
      normalizedAnswer: norm
    });

    const pts = calculatePointsForAnswerGroup({
      playerCountInGroup: groupAns.length,
      validVotes,
      invalidVotes
    });

    const isValid = validVotes > invalidVotes;

    groupAns.forEach(a => {
      updates.push({ id: a.id, points: pts, is_valid: isValid });
    });
  });

  return updates;
}

export function calculateScoresByPlayer(answers: Pick<Answer, 'player_id' | 'points'>[]): Record<string, number> {
  const scores: Record<string, number> = {};
  answers.forEach(a => {
    if (a.player_id) {
      if (!scores[a.player_id]) scores[a.player_id] = 0;
      scores[a.player_id] += Number(a.points || 0);
    }
  });
  return scores;
}
