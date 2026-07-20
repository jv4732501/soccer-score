import { describe, it, expect } from 'vitest';
import { newMatch, adjustScore, snapshotPeriod, endHalf, addExtraTime, endGame } from './match';
import { subIn, subOut, setPossession } from './stats';
import { startClock } from './clock';
import { startShootout } from './shootout';
import type { SavedTeam } from './types';

function savedTeam(id: string, name: string): SavedTeam {
  return {
    id, name,
    players: [
      { id: 'p1', num: 1, name: 'Keeper', starter: true, goalkeeper: true },
      { id: 'p2', num: 9, name: 'Striker', starter: true, goalkeeper: false },
      { id: 'p3', num: 12, name: 'Bench', starter: false, goalkeeper: false },
    ],
  };
}

const baseConfig = { halfLengthMin: 45, hasExtraTime: true, extraTimeLengthMin: 15, hasShootout: true };

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
