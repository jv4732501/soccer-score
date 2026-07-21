import { describe, it, expect } from 'vitest';
import { startShootout, recordAttempt } from './shootout';
import { endGame } from './match';
import { startClock } from './clock';
import { subIn, setPossession } from './stats';
import type { Match } from './types';

function baseMatch(): Match {
  return {
    id: 'm1',
    screen: 'game',
    config: { halfLengthMin: 45, hasExtraTime: true, extraTimeLengthMin: 15, hasShootout: true, hasStoppageTime: false },
    teamA: { id: 'a', name: 'Alpha', collapsed: false, players: [], goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0, assists: 0, shotsOnGoal: 0, targetsOnGoal: 0, tackles: 0, foulsCommitted: 0, saves: 0 },
    teamB: { id: 'b', name: 'Beta', collapsed: false, players: [], goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0, assists: 0, shotsOnGoal: 0, targetsOnGoal: 0, tackles: 0, foulsCommitted: 0, saves: 0 },
    homeTeam: 'teamA',
    period: 'ET2',
    clock: { elapsedSec: 0, running: false, startedAt: null },
    stoppageWatch: { elapsedSec: 0, running: false, startedAt: null },
    stoppage: {},
    score: { teamA: 1, teamB: 1 },
    possession: { current: null, since: null, accumSec: { teamA: 0, teamB: 0 } },
    periodScores: [],
    log: [],
    _seq: 0,
    date: null,
  };
}

function playRound(m: Match, resultsA: boolean, resultsB: boolean): Match {
  m = recordAttempt(m, 'teamA', resultsA, 0);
  if (m.shootout!.winner) return m;
  return recordAttempt(m, 'teamB', resultsB, 0);
}

describe('startShootout', () => {
  it('sets screen and period to shootout with empty attempts', () => {
    const m = startShootout(baseMatch(), 0);
    expect(m.screen).toBe('shootout');
    expect(m.period).toBe('shootout');
    expect(m.shootout).toEqual({ attempts: [], winner: null });
  });

  it('freezes the clock and flushes accrual when a shootout starts with the clock still running', () => {
    // Build a match with an on-field teamA player and active teamA possession, then start the
    // clock -- mirroring match.test.ts's "closes out on-field time and possession accrual when a
    // half ends" integration test, but for the sibling startShootout transition.
    let m = baseMatch();
    m.teamA.players.push({
      id: 'p1',
      num: 9,
      name: 'Striker',
      starter: true,
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
    m = startClock(m, 0);
    m = subIn(m, 'teamA', 'p1', 0);
    m = setPossession(m, 'teamA', 0);

    m = startShootout(m, 5 * 60 * 1000); // 5 minutes elapsed when the shootout starts

    // The clock is now frozen at the elapsed time up to the shootout start, and closeOutAccrual
    // flushed that time into fieldSecs/accumSec immediately -- it did not wait for the shootout
    // (or a later endGame) to realize it.
    expect(m.clock.running).toBe(false);
    expect(m.clock.elapsedSec).toBe(5 * 60);
    const flushedFieldSecs = m.teamA.players.find((p) => p.id === 'p1')!.fieldSecs;
    expect(flushedFieldSecs).toBe(5 * 60);
    expect(m.possession.accumSec.teamA).toBe(5 * 60);

    // Simulate the shootout taking 10 real minutes, then endGame is called much later. Because
    // startShootout froze the clock (and did not reopen accrual), no further time should accrue
    // during the shootout -- fieldSecs must not grow beyond what was already flushed.
    m = endGame(m, 15 * 60 * 1000);
    expect(m.teamA.players.find((p) => p.id === 'p1')!.fieldSecs).toBe(flushedFieldSecs);
    expect(m.possession.accumSec.teamA).toBe(5 * 60);
  });
});

describe('recordAttempt', () => {
  it('appends an attempt and does not touch match score', () => {
    let m = startShootout(baseMatch(), 0);
    m = recordAttempt(m, 'teamA', true, 0);
    expect(m.shootout!.attempts).toEqual([{ team: 'teamA', scored: true }]);
    expect(m.score).toEqual({ teamA: 1, teamB: 1 });
  });
  it('declares a winner as soon as the outcome is mathematically certain before round 5', () => {
    let m = startShootout(baseMatch(), 0);
    m = playRound(m, true, false);   // A:1 B:0
    m = playRound(m, true, false);   // A:2 B:0
    m = playRound(m, true, false);   // A:3 B:0 -- B can get at most 2 more (2 kicks left) so A has won
    expect(m.shootout!.winner).toBe('teamA');
  });
  it('goes the full 5 rounds when the outcome stays undecided that long', () => {
    let m = startShootout(baseMatch(), 0);
    m = playRound(m, true, true);
    m = playRound(m, true, true);
    m = playRound(m, false, true);
    m = playRound(m, true, false);
    m = playRound(m, false, false); // 3-3 after 5 each -- still tied
    expect(m.shootout!.winner).toBeNull();
    expect(m.shootout!.attempts).toHaveLength(10);
  });
  it('resolves in sudden death as soon as one team scores and the other misses', () => {
    let m = startShootout(baseMatch(), 0);
    for (let i = 0; i < 5; i++) m = playRound(m, true, true); // 5-5 tied
    expect(m.shootout!.winner).toBeNull();
    m = playRound(m, true, false); // sudden-death round 6: A scores, B misses
    expect(m.shootout!.winner).toBe('teamA');
  });
  it('is a no-op once a winner is already decided', () => {
    let m = startShootout(baseMatch(), 0);
    m = playRound(m, true, false);
    m = playRound(m, true, false);
    m = playRound(m, true, false); // decided for teamA
    const decided = m;
    m = recordAttempt(m, 'teamB', true, 0);
    expect(m).toBe(decided);
  });
  it('does not declare a winner after only one team has kicked in a round', () => {
    let m = startShootout(baseMatch(), 0);
    m = recordAttempt(m, 'teamA', true, 0); // teamB has not kicked yet this round
    expect(m.shootout!.winner).toBeNull();
  });
  it('continues sudden death when a round stays tied, then resolves once it differs', () => {
    let m = startShootout(baseMatch(), 0);
    for (let i = 0; i < 5; i++) m = playRound(m, true, true); // 5-5 tied
    expect(m.shootout!.attempts).toHaveLength(10);
    m = playRound(m, true, true); // sudden-death round 6: both score, still tied
    expect(m.shootout!.winner).toBeNull();
    expect(m.shootout!.attempts).toHaveLength(12);
    m = playRound(m, true, false); // sudden-death round 7: A scores, B misses
    expect(m.shootout!.winner).toBe('teamA');
  });
});
