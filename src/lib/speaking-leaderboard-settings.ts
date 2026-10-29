export function isLeaderboardDays(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 365;
}

export function leaderboardPeriodLabel(days: number): string {
  return `Last ${days} ${days === 1 ? 'day' : 'days'}`;
}
