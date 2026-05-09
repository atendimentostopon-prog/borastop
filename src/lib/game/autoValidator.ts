import { normalizeAnswer } from "./validation";

interface AutoValidatorResult {
  suggestedValid: boolean | null;
  reason: string;
}

export function autoValidateAnswer({
  answer,
  letter,
}: {
  answer: string;
  categoryName?: string;
  letter: string;
}): AutoValidatorResult {
  if (!answer || answer.trim() === "") {
    return {
      suggestedValid: false,
      reason: "Resposta vazia",
    };
  }

  const normalized = normalizeAnswer(answer);
  const targetLetter = normalizeAnswer(letter);

  if (!normalized.startsWith(targetLetter)) {
    return {
      suggestedValid: false,
      reason: "A resposta não começa com a letra da rodada",
    };
  }

  return {
    suggestedValid: null,
    reason: "Aguardando validação dos jogadores",
  };
}
