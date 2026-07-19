import { describe, it, expect } from 'vitest';
import { formatClock, parseClock, clockElapsed, startClock, stopClock, toggleClock, recordStoppage } from './clock';
import type { Match } from './types';

describe('formatClock', () => {
  it('formats whole minutes and seconds as M:SS', () => {
    expect(formatClock(125)).toBe('2:05');
  });

  it('pads single-digit seconds', () => {
    expect(formatClock(61)).toBe('1:01');
  });

  it('clamps negative input to 0:00', () => {
    expect(formatClock(-5)).toBe('0:00');
  });

  it('floors fractional seconds', () => {
    expect(formatClock(59.9)).toBe('0:59');
  });
});

describe('parseClock', () => {
  it('parses M:SS into total seconds', () => {
    expect(parseClock('2:05')).toBe(125);
  });

  it('returns null for malformed input', () => {
    expect(parseClock('not a clock')).toBeNull();
  });

  it('returns null when seconds are 60 or more', () => {
    expect(parseClock('1:60')).toBeNull();
  });
});

function emptyMatch(): Match {
  return {
    id: 'm1',
    screen: 'game',
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: false },
    teamA: { id: 'a', name: 'Alpha', collapsed: false, players: [], goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0 },
    teamB: { id: 'b', name: 'Beta', collapsed: false, players: [], goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0 },
    homeTeam: 'teamA',
    period: 1,
    clock: { elapsedSec: 0, running: false, startedAt: null },
    stoppage: {},
    score: { teamA: 0, teamB: 0 },
    possession: { current: null, since: null, accumSec: { teamA: 0, teamB: 0 } },
    periodScores: [],
    log: [],
    _seq: 0,
    date: null,
  };
}

describe('clockElapsed', () => {
  it('returns elapsedSec directly when not running', () => {
    expect(clockElapsed({ elapsedSec: 120, running: false, startedAt: null }, 999999)).toBe(120);
  });
  it('adds time since startedAt when running', () => {
    expect(clockElapsed({ elapsedSec: 100, running: true, startedAt: 1000 }, 1000 + 30000)).toBe(130);
  });
});

describe('startClock / stopClock / toggleClock', () => {
  it('startClock sets running and startedAt', () => {
    const m = startClock(emptyMatch(), 5000);
    expect(m.clock.running).toBe(true);
    expect(m.clock.startedAt).toBe(5000);
  });
  it('stopClock freezes elapsedSec and clears startedAt', () => {
    let m = startClock(emptyMatch(), 0);
    m = stopClock(m, 10000);
    expect(m.clock.running).toBe(false);
    expect(m.clock.startedAt).toBeNull();
    expect(m.clock.elapsedSec).toBe(10);
  });
  it('toggleClock flips running state', () => {
    let m = toggleClock(emptyMatch(), 0);
    expect(m.clock.running).toBe(true);
    m = toggleClock(m, 5000);
    expect(m.clock.running).toBe(false);
  });
  it('startClock on an already-running clock is a no-op', () => {
    let m = startClock(emptyMatch(), 0);
    const m2 = startClock(m, 9999);
    expect(m2.clock.startedAt).toBe(0);
  });
});

describe('recordStoppage', () => {
  it('stores added seconds for the current period and logs it', () => {
    const m = recordStoppage(emptyMatch(), 240, 0);
    expect(m.stoppage[1]).toBe(240);
    expect(m.log).toHaveLength(1);
    expect(m.log[0].rev).toEqual({ kind: 'stoppage', period: 1, prev: undefined });
  });
  it('overwriting stoppage for the same period captures the previous value for undo', () => {
    let m = recordStoppage(emptyMatch(), 120, 0);
    m = recordStoppage(m, 240, 0);
    expect(m.stoppage[1]).toBe(240);
    expect(m.log[1].rev).toEqual({ kind: 'stoppage', period: 1, prev: 120 });
  });
});
