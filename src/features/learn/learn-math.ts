export const XP_PER_LEVEL = 50;

export function levelFromXp(totalXp: number): number {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1;
}

export function xpProgressInLevel(totalXp: number): { current: number; max: number } {
  const current = totalXp % XP_PER_LEVEL;
  return { current, max: XP_PER_LEVEL };
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
