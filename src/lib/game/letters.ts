const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function getRandomLetter(allowedLetters: string[] = [], usedLetters: string[] = []): string {
  const pool = allowedLetters.length > 0 ? allowedLetters : ALL_LETTERS;
  const available = pool.filter(l => !usedLetters.includes(l));
  
  // Se todas as letras permitidas já foram usadas, resetamos o pool (exceto a última para evitar repetição imediata)
  if (available.length === 0) {
    const last = usedLetters[usedLetters.length - 1];
    const resetPool = pool.filter(l => l !== last);
    return resetPool[Math.floor(Math.random() * resetPool.length)];
  }

  return available[Math.floor(Math.random() * available.length)];
}
