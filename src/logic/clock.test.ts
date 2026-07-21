import { describe, it, expect } from 'vitest';
import {
  formatClock,
  parseClock,
  clockElapsed,
  startClock,
  stopClock,
  toggleClock,
  recordStoppage,
  adjustClock,
  startStoppageWatch,
  stopStoppageWatch,
  toggleStoppageWatch,
} from './clock';
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
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: false, hasStoppageTime: false },
    teamA: { id: 'a', name: 'Alpha', collapsed: false, players: [], goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0, assists: 0, shotsOnGoal: 0, targetsOnGoal: 0, tackles: 0, foulsCommitted: 0, saves: 0 },
    teamB: { id: 'b', name: 'Beta', collapsed: false, players: [], goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0, assists: 0, shotsOnGoal: 0, targetsOnGoal: 0, tackles: 0, foulsCommitted: 0, saves: 0 },
    homeTeam: 'teamA',
    period: 1,
    clock: { elapsedSec: 0, running: false, startedAt: null },
    stoppageWatch: { elapsedSec: 0, running: false, startedAt: null },
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

describe('adjustClock', () => {
  it('adds seconds to a stopped clock', () => {
    const m = adjustClock(emptyMatch(), 10, 0);
    expect(m.clock.elapsedSec).toBe(10);
  });

  it('subtracts seconds from a stopped clock, clamped at 0', () => {
    let m = emptyMatch();
    m.clock.elapsedSec = 5;
    m = adjustClock(m, -10, 0);
    expect(m.clock.elapsedSec).toBe(0);
  });

  it('adjusts a running clock and rebases startedAt so it keeps counting from the new value', () => {
    let m = startClock(emptyMatch(), 0);
    m = adjustClock(m, 10, 5000); // 5s elapsed (0 + 5000ms) + 10 = 15
    expect(m.clock.running).toBe(true);
    expect(m.clock.startedAt).toBe(5000);
    expect(clockElapsed(m.clock, 5000)).toBe(15);
  });
});

describe('startStoppageWatch / stopStoppageWatch / toggleStoppageWatch', () => {
  it('startStoppageWatch sets running and startedAt', () => {
    const m = startStoppageWatch(emptyMatch(), 5000);
    expect(m.stoppageWatch.running).toBe(true);
    expect(m.stoppageWatch.startedAt).toBe(5000);
  });
  it('stopStoppageWatch freezes elapsedSec and clears startedAt', () => {
    let m = startStoppageWatch(emptyMatch(), 0);
    m = stopStoppageWatch(m, 45000);
    expect(m.stoppageWatch.running).toBe(false);
    expect(m.stoppageWatch.startedAt).toBeNull();
    expect(m.stoppageWatch.elapsedSec).toBe(45);
  });
  it('toggleStoppageWatch flips running state', () => {
    let m = toggleStoppageWatch(emptyMatch(), 0);
    expect(m.stoppageWatch.running).toBe(true);
    m = toggleStoppageWatch(m, 5000);
    expect(m.stoppageWatch.running).toBe(false);
    expect(m.stoppageWatch.elapsedSec).toBe(5);
  });
  it('stopStoppageWatch on an already-stopped watch is a no-op', () => {
    const m = stopStoppageWatch(emptyMatch(), 9999);
    expect(m.stoppageWatch.elapsedSec).toBe(0);
    expect(m.stoppageWatch.startedAt).toBeNull();
  });
  it('does not affect the main game clock', () => {
    let m = startClock(emptyMatch(), 0);
    m = startStoppageWatch(m, 0);
    m = stopStoppageWatch(m, 20000);
    expect(m.clock.running).toBe(true);
    expect(m.stoppageWatch.running).toBe(false);
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
