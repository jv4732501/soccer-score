export function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function parseClock(text: string): number | null {
  const match = /^(\d+):([0-5]\d)$/.exec(text.trim());
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}
