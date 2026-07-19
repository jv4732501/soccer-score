import { describe, it, expect } from 'vitest';
import { undo } from './undo';
import { adjustScore } from './match';
import { recordPlayerStat, recordCard, subIn, subOut, setPossession, recordCorner, recordOffside } from './stats';
import { recordStoppage } from './clock';
import { recordAttempt, startShootout } from './shootout';
import type { Match } from './types';

function matchWithPlayer(): Match {
  return {
    id: 'm1',
    screen: 'game',
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: true },
    teamA: {
      id: 'a', name: 'Alpha', collapsed: false, goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0,
      players: [{
        id: 'p1', num: 9, name: 'Sam', starter: true, goalkeeper: false,
        onField: true, inClock: 0, fieldSecs: 0, goals: 0, assists: 0, shotsOnGoal: 0,
        tackles: 0, foulsCommitted: 0, saves: 0, yellowCards: 0, redCards: 0, sentOff: false,
      }],
    },
    teamB: { id: 'b', name: 'Beta', collapsed: false, players: [], goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0 },
    homeTeam: 'teamA',
    period: 1,
    clock: { elapsedSec: 600, running: false, startedAt: null },
    stoppage: {},
    score: { teamA: 0, teamB: 0 },
    possession: { current: null, since: null, accumSec: { teamA: 0, teamB: 0 } },
    periodScores: [],
    log: [],
    _seq: 0,
    date: null,
  };
}

describe('undo', () => {
  it('is a no-op on an empty log', () => {
    const m0 = matchWithPlayer();
    expect(undo(m0)).toBe(m0);
  });

  it('reverses a score adjustment', () => {
    const m0 = matchWithPlayer();
    const m1 = adjustScore(m0, 'teamA', 2, 0);
    const m2 = undo(m1);
    expect(m2.score.teamA).toBe(0);
    expect(m2.log).toHaveLength(0);
  });

  it('reverses a player stat (including a goal touching score)', () => {
    const m0 = matchWithPlayer();
    const m1 = recordPlayerStat(m0, 'teamA', 'p1', 'goals', 0);
    const m2 = undo(m1);
    expect(m2.teamA.players[0].goals).toBe(0);
    expect(m2.score.teamA).toBe(0);
  });

  it('reverses a card, including restoring sentOff to its prior value', () => {
    const m0 = matchWithPlayer();
    const m1 = recordCard(m0, 'teamA', 'p1', 'red', 0);
    const m2 = undo(m1);
    expect(m2.teamA.redCards).toBe(0);
    expect(m2.teamA.players[0].redCards).toBe(0);
    expect(m2.teamA.players[0].sentOff).toBe(false);
  });

  it('reverses an auto-red 2nd yellow back to a single yellow, not sent off', () => {
    let m = recordCard(matchWithPlayer(), 'teamA', 'p1', 'yellow', 0);
    m = recordCard(m, 'teamA', 'p1', 'yellow', 0); // 2nd yellow, auto-red
    m = undo(m); // undo only reverses the LAST log entry (the 2nd-yellow-plus-auto-red action)
    expect(m.teamA.players[0].yellowCards).toBe(1);
    expect(m.teamA.players[0].redCards).toBe(0);
    expect(m.teamA.players[0].sentOff).toBe(false);
  });

  it('reverses a substitution (onField, inClock, fieldSecs)', () => {
    const m0 = matchWithPlayer(); // onField true, inClock 0
    const m1 = subOut(m0, 'teamA', 'p1', 600000); // elapsedSec 600, accrues 600 fieldSecs
    const m2 = undo(m1);
    expect(m2.teamA.players[0].onField).toBe(true);
    expect(m2.teamA.players[0].inClock).toBe(0);
    expect(m2.teamA.players[0].fieldSecs).toBe(0);
  });

  it('reverses possession accrual and the prior holder', () => {
    let m = matchWithPlayer();
    m.possession = { current: 'teamA', since: 100, accumSec: { teamA: 0, teamB: 0 } };
    m = setPossession(m, 'teamB', 0); // elapsedSec 600, accrues 500 to teamA
    m = undo(m);
    expect(m.possession.current).toBe('teamA');
    expect(m.possession.accumSec.teamA).toBe(0);
    expect(m.possession.since).toBe(100);
  });

  it('reverses a corner and an offside', () => {
    let m = recordCorner(matchWithPlayer(), 'teamA', 0);
    m = undo(m);
    expect(m.teamA.corners).toBe(0);

    m = recordOffside(m, 'teamB', 0);
    m = undo(m);
    expect(m.teamB.offsides).toBe(0);
  });

  it('reverses a stoppage-time entry back to its previous value (undefined if unset)', () => {
    let m = recordStoppage(matchWithPlayer(), 240, 0);
    m = undo(m);
    expect(m.stoppage[1]).toBeUndefined();
  });

  it('reverses a stoppage-time entry back to a previously-set value', () => {
    let m = recordStoppage(matchWithPlayer(), 120, 0);
    m = recordStoppage(m, 240, 0);
    m = undo(m);
    expect(m.stoppage[1]).toBe(120);
  });

  it('reverses a subIn (onField/inClock reset to false/null)', () => {
    const benched = matchWithPlayer();
    benched.teamA.players[0].onField = false;
    benched.teamA.players[0].inClock = null;
    const m0 = subIn(benched, 'teamA', 'p1', 0);
    const m = undo(m0);
    expect(m.teamA.players[0].onField).toBe(false);
    expect(m.teamA.players[0].inClock).toBeNull();
  });

  it('reverses a team-only card (collapsed team, no player)', () => {
    const collapsed = matchWithPlayer();
    collapsed.teamA.collapsed = true;
    const m0 = recordCard(collapsed, 'teamA', null, 'yellow', 0);
    const m = undo(m0);
    expect(m.teamA.yellowCards).toBe(0);
  });

  it("reverses possession's very first assignment back to no holder", () => {
    const m0 = matchWithPlayer(); // possession.current starts null per fixture
    const m1 = setPossession(m0, 'teamA', 0);
    const m = undo(m1);
    expect(m.possession.current).toBeNull();
    expect(m.possession.accumSec).toEqual({ teamA: 0, teamB: 0 });
  });

  it('reverses a shootout attempt, clearing a decided winner if the popped attempt decided it', () => {
    // detectWinner only evaluates once both sides have taken equal kicks, so a decision
    // needs 3 full A-then-B rounds at minimum (A scores, B misses, every round) -- see
    // shootout.test.ts's "declares a winner..." case for the same 6-attempt shape.
    let m = startShootout(matchWithPlayer(), 0);
    m = recordAttempt(m, 'teamA', true, 0);
    m = recordAttempt(m, 'teamB', false, 0);
    m = recordAttempt(m, 'teamA', true, 0);
    m = recordAttempt(m, 'teamB', false, 0);
    m = recordAttempt(m, 'teamA', true, 0);
    m = recordAttempt(m, 'teamB', false, 0); // 6th attempt (teamB's 3rd miss) is what decides it
    expect(m.shootout!.winner).toBe('teamA');
    m = undo(m);
    expect(m.shootout!.attempts).toHaveLength(5);
    expect(m.shootout!.winner).toBeNull();
  });

  it('a sequence of several actions undone in reverse restores the original state', () => {
    const m0 = matchWithPlayer();
    let m = adjustScore(m0, 'teamA', 1, 0);
    m = recordPlayerStat(m, 'teamA', 'p1', 'tackles', 0);
    m = recordCorner(m, 'teamB', 0);
    m = undo(m);
    m = undo(m);
    m = undo(m);
    expect(m.score).toEqual(m0.score);
    expect(m.teamA.players[0].tackles).toBe(0);
    expect(m.teamB.corners).toBe(0);
    expect(m.log).toHaveLength(0);
  });
});
