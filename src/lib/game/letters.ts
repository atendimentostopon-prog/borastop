export const DEFAULT_LETTERS = "ABCDEFGHIJKLMNOPRSTUV".split("");

export function getRandomLetter(allowedLetters: string[], usedLetters: string[] = []): string {
  const availableLetters = allowedLetters.length > 0 
    ? allowedLetters.filter(l => !usedLetters.includes(l))
    : DEFAULT_LETTERS.filter(l => !usedLetters.includes(l));

  // Se todas as letras já foram usadas, ignora o usedLetters (permite repetir)
  const lettersToUse = availableLetters.length > 0 
    ? availableLetters 
    : (allowedLetters.length > 0 ? allowedLetters : DEFAULT_LETTERS);

  const randomIndex = Math.floor(Math.random() * lettersToUse.length);
  return lettersToUse[randomIndex].toUpperCase();
}
