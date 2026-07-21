import type { ClockState, Match, RevEntry } from './types';
import { clone, appendLog } from './log';

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

export function clockElapsed(clock: ClockState, nowMs: number): number {
  if (clock.running && clock.startedAt != null) {
    return clock.elapsedSec + Math.floor((nowMs - clock.startedAt) / 1000);
  }
  return clock.elapsedSec;
}

export function startClock(match: Match, nowMs: number): Match {
  if (match.clock.running) return match;
  const m = clone(match);
  m.clock.running = true;
  m.clock.startedAt = nowMs;
  return m;
}

export function stopClock(match: Match, nowMs: number): Match {
  if (!match.clock.running) return match;
  const m = clone(match);
  m.clock.elapsedSec = clockElapsed(match.clock, nowMs);
  m.clock.running = false;
  m.clock.startedAt = null;
  return m;
}

export function toggleClock(match: Match, nowMs: number): Match {
  return match.clock.running ? stopClock(match, nowMs) : startClock(match, nowMs);
}

export function adjustClock(match: Match, deltaSec: number, nowMs: number): Match {
  const m = clone(match);
  const cur = clockElapsed(m.clock, nowMs);
  m.clock.elapsedSec = Math.max(0, cur + deltaSec);
  if (m.clock.running) m.clock.startedAt = nowMs;
  return m;
}

// A rough, coach-side estimate timer for how much stoppage time to add --
// separate from the official value recorded by recordStoppage, which is the
// referee's call. Mirrors startClock/stopClock but operates on stoppageWatch.
export function startStoppageWatch(match: Match, nowMs: number): Match {
  if (match.stoppageWatch.running) return match;
  const m = clone(match);
  m.stoppageWatch.running = true;
  m.stoppageWatch.startedAt = nowMs;
  return m;
}

export function stopStoppageWatch(match: Match, nowMs: number): Match {
  if (!match.stoppageWatch.running) return match;
  const m = clone(match);
  m.stoppageWatch.elapsedSec = clockElapsed(match.stoppageWatch, nowMs);
  m.stoppageWatch.running = false;
  m.stoppageWatch.startedAt = null;
  return m;
}

export function toggleStoppageWatch(match: Match, nowMs: number): Match {
  return match.stoppageWatch.running
    ? stopStoppageWatch(match, nowMs)
    : startStoppageWatch(match, nowMs);
}

export function recordStoppage(match: Match, addedSec: number, nowMs: number): Match {
  let m = clone(match);
  const prev = m.stoppage[m.period];
  m.stoppage[m.period] = addedSec;
  const rev: RevEntry = { kind: 'stoppage', period: m.period, prev };
  m = appendLog(m, {
    period: m.period,
    clockText: formatClock(clockElapsed(m.clock, nowMs)),
    team: null,
    playerId: null,
    type: 'stoppage',
    detail: `Stoppage time: +${formatClock(addedSec)}`,
    rev,
  });
  return m;
}
