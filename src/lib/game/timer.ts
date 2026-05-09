export function getRemainingSeconds(startedAt: string, roundTime: number): number {
  if (!startedAt) return roundTime;

  const start = new Date(startedAt).getTime();
  const now = new Date().getTime();
  
  const elapsedMs = now - start;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  
  const remaining = roundTime - elapsedSeconds;
  return Math.max(0, remaining);
}

export function isRoundExpired(startedAt: string, roundTime: number): boolean {
  return getRemainingSeconds(startedAt, roundTime) <= 0;
}
