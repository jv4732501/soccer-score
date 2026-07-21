import { describe, it, expect } from 'vitest';
import {
  newMatch,
  adjustScore,
  snapshotPeriod,
  endHalf,
  addExtraTime,
  endGame,
  updateConfig,
  periodTargetSec,
  addPlayer,
} from './match';
import { subIn, subOut, setPossession } from './stats';
import { startClock, startStoppageWatch } from './clock';
import { startShootout } from './shootout';
import type { SavedTeam } from './types';

function savedTeam(id: string, name: string): SavedTeam {
  return {
    id, name,
    players: [
      { id: 'p1', num: 1, name: 'Keeper', starter: true, position: 1 },
      { id: 'p2', num: 9, name: 'Striker', starter: true, position: null },
      { id: 'p3', num: 12, name: 'Bench', starter: false, position: null },
    ],
  };
}

const baseConfig = {
  halfLengthMin: 45,
  hasExtraTime: true,
  extraTimeLengthMin: 15,
  hasShootout: true,
  hasStoppageTime: false,
};

function makeStartingMatch() {
  return newMatch({
    config: baseConfig,
    teamA: savedTeam('a', 'Alpha'), activeIdsA: ['p1', 'p2'], collapsedA: false,
    teamB: savedTeam('b', 'Beta'), activeIdsB: ['p1', 'p2', 'p3'], collapsedB: false,
    homeTeam: 'teamA',
  });
}

describe('newMatch', () => {
  it('builds each team from only the active roster ids', () => {
    const m = makeStartingMatch();
    expect(m.teamA.players.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(m.teamB.players.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });
  it('initializes match-only fields to zero/false/null on every player', () => {
    const m = makeStartingMatch();
    const p = m.teamA.players[0];
    expect(p.onField).toBe(false);
    expect(p.fieldSecs).toBe(0);
    expect(p.goals).toBe(0);
    expect(p.sentOff).toBe(false);
  });
  it('sets goalkeeperId from the active roster', () => {
    const m = makeStartingMatch();
    expect(m.teamA.goalkeeperId).toBe('p1');
  });
  it('a collapsed team gets an empty players array regardless of activeIds', () => {
    const m = newMatch({
      config: baseConfig,
      teamA: savedTeam('a', 'Alpha'), activeIdsA: ['p1'], collapsedA: true,
      teamB: savedTeam('b', 'Beta'), activeIdsB: ['p1'], collapsedB: false,
      homeTeam: 'teamA',
    });
    expect(m.teamA.collapsed).toBe(true);
    expect(m.teamA.players).toEqual([]);
    expect(m.teamA.goalkeeperId).toBeNull();
  });
  it('starts at period 1, screen game, zero score, empty log', () => {
    const m = makeStartingMatch();
    expect(m.period).toBe(1);
    expect(m.screen).toBe('game');
    expect(m.score).toEqual({ teamA: 0, teamB: 0 });
    expect(m.log).toEqual([]);
  });
});

describe('addPlayer', () => {
  it('appends a new bench player with all match fields defaulted', () => {
    const m = addPlayer(makeStartingMatch(), 'teamA', { id: 'new1', num: 22, name: 'Rookie' });
    const p = m.teamA.players[m.teamA.players.length - 1];
    expect(p).toEqual({
      id: 'new1',
      num: 22,
      name: 'Rookie',
      starter: false,
      position: null,
      onField: false,
      inClock: null,
      fieldSecs: 0,
      goals: 0,
      assists: 0,
      shotsOnGoal: 0,
      tackles: 0,
      foulsCommitted: 0,
      saves: 0,
      yellowCards: 0,
      redCards: 0,
      sentOff: false,
    });
  });
  it('does not affect the other team or existing players', () => {
    const m0 = makeStartingMatch();
    const m = addPlayer(m0, 'teamA', { id: 'new1', num: 22, name: 'Rookie' });
    expect(m.teamA.players).toHaveLength(m0.teamA.players.length + 1);
    expect(m.teamB.players).toEqual(m0.teamB.players);
  });
});

describe('adjustScore', () => {
  it('increases score and logs the change', () => {
    const m = adjustScore(makeStartingMatch(), 'teamA', 1, 0);
    expect(m.score.teamA).toBe(1);
    expect(m.log).toHaveLength(1);
  });
  it('clamps at 0 and does not log a no-op', () => {
    const m = adjustScore(makeStartingMatch(), 'teamA', -1, 0);
    expect(m.score.teamA).toBe(0);
    expect(m.log).toHaveLength(0);
  });
});

describe('snapshotPeriod', () => {
  it('appends the current score to periodScores', () => {
    let m = makeStartingMatch();
    m = adjustScore(m, 'teamA', 2, 0);
    m = snapshotPeriod(m);
    expect(m.periodScores).toEqual([{ teamA: 2, teamB: 0 }]);
  });
});

describe('endHalf', () => {
  it('advances from period 1 to 2, resets the clock, snapshots the score', () => {
    let m = makeStartingMatch();
    m = adjustScore(m, 'teamA', 1, 0);
    m = endHalf(m, 45 * 60 * 1000);
    expect(m.period).toBe(2);
    expect(m.clock).toEqual({ elapsedSec: 0, running: false, startedAt: null });
    expect(m.periodScores).toEqual([{ teamA: 1, teamB: 0 }]);
  });
  it('resets the stoppage watch for the new period', () => {
    let m = makeStartingMatch();
    m = startStoppageWatch(m, 0);
    m = endHalf(m, 45 * 60 * 1000);
    expect(m.stoppageWatch).toEqual({ elapsedSec: 0, running: false, startedAt: null });
  });
  it('is a no-op when period is not 1', () => {
    let m = makeStartingMatch();
    m = endHalf(m, 0);
    const m2 = endHalf(m, 0);
    expect(m2.period).toBe(2); // unchanged by the second call
    expect(m2.periodScores).toHaveLength(1); // no duplicate snapshot
  });
  it('closes out on-field time and possession accrual when a half ends', () => {
    // The clock must actually be running for elapsed time to accrue -- endHalf's stopClock()
    // is a no-op on a never-started clock, so we start it before subbing in / setting possession.
    let m = makeStartingMatch();
    m = startClock(m, 0);
    // p3 is only active for teamB in makeStartingMatch (activeIdsA is ['p1', 'p2']), so we use
    // p2 -- an active-but-benched (onField: false) teamA player -- instead.
    m = subIn(m, 'teamA', 'p2', 0);
    m = setPossession(m, 'teamA', 0);
    m = endHalf(m, 20 * 60 * 1000); // 20 minutes elapsed when the half ends
    // closeOutAccrual flushes the accrued 20 minutes directly into fieldSecs/accumSec as part of
    // ending the half -- it does not wait for a later subOut/setPossession call to realize it.
    expect(m.teamA.players.find((p) => p.id === 'p2')!.fieldSecs).toBe(20 * 60);
    expect(m.possession.accumSec.teamA).toBe(20 * 60);
    // reopenAccrual rebases inClock/since to 0 for the new period (whose clock also reset to 0),
    // so subbing out immediately in period 2 (elapsed 0 again) should add no further delta --
    // confirming the baseline was rebased rather than left stale or double-counted.
    m = subOut(m, 'teamA', 'p2', 0);
    expect(m.teamA.players.find((p) => p.id === 'p2')!.fieldSecs).toBe(20 * 60);
    expect(m.possession.current).toBe('teamA'); // possession holder persists across the half, just re-based
  });
});

describe('addExtraTime', () => {
  it('advances period 2 to ET1 when hasExtraTime is configured', () => {
    let m = makeStartingMatch();
    m = endHalf(m, 0);
    m = addExtraTime(m, 0);
    expect(m.period).toBe('ET1');
  });
  it('advances ET1 to ET2', () => {
    let m = makeStartingMatch();
    m = endHalf(m, 0);
    m = addExtraTime(m, 0);
    m = addExtraTime(m, 0);
    expect(m.period).toBe('ET2');
  });
  it('resets the stoppage watch for the new period', () => {
    let m = makeStartingMatch();
    m = endHalf(m, 0);
    m = startStoppageWatch(m, 0);
    m = addExtraTime(m, 15 * 60 * 1000);
    expect(m.stoppageWatch).toEqual({ elapsedSec: 0, running: false, startedAt: null });
  });
  it('is a no-op when hasExtraTime is not configured', () => {
    let m = newMatch({
      config: { ...baseConfig, hasExtraTime: false },
      teamA: savedTeam('a', 'Alpha'), activeIdsA: ['p1'], collapsedA: false,
      teamB: savedTeam('b', 'Beta'), activeIdsB: ['p1'], collapsedB: false,
      homeTeam: 'teamA',
    });
    m = endHalf(m, 0);
    const m2 = addExtraTime(m, 0);
    expect(m2.period).toBe(2);
  });
});

describe('endGame', () => {
  it('sets screen to summary, records the date, snapshots the final score', () => {
    let m = makeStartingMatch();
    m = adjustScore(m, 'teamB', 3, 0);
    m = endGame(m, 123456);
    expect(m.screen).toBe('summary');
    expect(m.date).toBe(123456);
    expect(m.periodScores).toEqual([{ teamA: 0, teamB: 3 }]);
  });
  it('does not push a duplicate periodScores entry when the match already went through a shootout', () => {
    let m = makeStartingMatch();
    m = endHalf(m, 0); // period 1 -> 2 (1st snapshot)
    m = addExtraTime(m, 0); // period 2 -> ET1 (2nd snapshot)
    m = addExtraTime(m, 0); // ET1 -> ET2 (3rd snapshot)
    m = startShootout(m, 0); // snapshots the regulation/ET score before penalties (4th snapshot)
    expect(m.periodScores).toHaveLength(4);
    m = endGame(m, 0);
    // endGame must NOT push a 5th, redundant snapshot -- the shootout already captured the final score
    expect(m.periodScores).toHaveLength(4);
  });
});

describe('updateConfig', () => {
  it('merges a partial patch into match.config', () => {
    const m = updateConfig(makeStartingMatch(), { halfLengthMin: 30 });
    expect(m.config).toEqual({ ...baseConfig, halfLengthMin: 30 });
  });

  it('can enable extra time and the shootout mid-match', () => {
    const configless = newMatch({
      config: {
        halfLengthMin: 45,
        hasExtraTime: false,
        extraTimeLengthMin: 15,
        hasShootout: false,
        hasStoppageTime: false,
      },
      teamA: savedTeam('a', 'Alpha'), activeIdsA: ['p1', 'p2'], collapsedA: false,
      teamB: savedTeam('b', 'Beta'), activeIdsB: ['p1', 'p2', 'p3'], collapsedB: false,
      homeTeam: 'teamA',
    });
    const m = updateConfig(configless, { hasExtraTime: true, hasShootout: true });
    expect(m.config.hasExtraTime).toBe(true);
    expect(m.config.hasShootout).toBe(true);
  });

  it('does not mutate the original match object', () => {
    const original = makeStartingMatch();
    updateConfig(original, { halfLengthMin: 30 });
    expect(original.config.halfLengthMin).toBe(45);
  });
});

describe('periodTargetSec', () => {
  it('uses halfLengthMin during periods 1 and 2', () => {
    let m = makeStartingMatch();
    expect(periodTargetSec(m)).toBe(45 * 60);
    m = endHalf(m, 0);
    expect(periodTargetSec(m)).toBe(45 * 60);
  });

  it('uses extraTimeLengthMin during ET1 and ET2', () => {
    let m = makeStartingMatch();
    m = endHalf(m, 0);
    m = addExtraTime(m, 0);
    expect(periodTargetSec(m)).toBe(15 * 60);
    m = addExtraTime(m, 0);
    expect(periodTargetSec(m)).toBe(15 * 60);
  });
});
