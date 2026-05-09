import { normalizeAnswer } from "./validation";

/**
 * Validação automática básica:
 * - Não pode ser vazio
 * - Deve começar com a letra da rodada
 */
export function autoValidateAnswer(answer: string, letter: string): boolean {
  if (!answer || answer.trim().length === 0) return false;
  
  const norm = normalizeAnswer(answer);
  const normLetter = letter.trim().toLowerCase();
  
  return norm.startsWith(normLetter);
}
