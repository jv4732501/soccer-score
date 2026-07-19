import { describe, it, expect } from 'vitest';
import { recordPlayerStat, recordCard } from './stats';
import type { Match } from './types';

function matchWithPlayer(): Match {
  return {
    id: 'm1',
    screen: 'game',
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: false },
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

describe('recordPlayerStat', () => {
  it('increments the given stat field on the player', () => {
    const m = recordPlayerStat(matchWithPlayer(), 'teamA', 'p1', 'tackles', 0);
    expect(m.teamA.players[0].tackles).toBe(1);
  });
  it('recording a goal also increments the team score', () => {
    const m = recordPlayerStat(matchWithPlayer(), 'teamA', 'p1', 'goals', 0);
    expect(m.teamA.players[0].goals).toBe(1);
    expect(m.score.teamA).toBe(1);
  });
  it('recording a non-goal stat does not change the score', () => {
    const m = recordPlayerStat(matchWithPlayer(), 'teamA', 'p1', 'assists', 0);
    expect(m.score.teamA).toBe(0);
  });
  it('logs a descriptive entry with a stat-kind rev', () => {
    const m = recordPlayerStat(matchWithPlayer(), 'teamA', 'p1', 'shotsOnGoal', 0);
    expect(m.log).toHaveLength(1);
    expect(m.log[0].detail).toContain('#9 Sam');
    expect(m.log[0].rev).toEqual({ kind: 'stat', team: 'teamA', playerId: 'p1', fields: { shotsOnGoal: 1 }, score: 0 });
  });
  it('is a no-op when the player does not exist', () => {
    const original = matchWithPlayer();
    const m = recordPlayerStat(original, 'teamA', 'nope', 'goals', 0);
    expect(m).toBe(original);
  });
});

describe('recordCard', () => {
  it('a yellow card increments both team and player tallies', () => {
    const m = recordCard(matchWithPlayer(), 'teamA', 'p1', 'yellow', 0);
    expect(m.teamA.yellowCards).toBe(1);
    expect(m.teamA.players[0].yellowCards).toBe(1);
    expect(m.teamA.players[0].sentOff).toBe(false);
  });
  it('a direct red card sends the player off', () => {
    const m = recordCard(matchWithPlayer(), 'teamA', 'p1', 'red', 0);
    expect(m.teamA.redCards).toBe(1);
    expect(m.teamA.players[0].redCards).toBe(1);
    expect(m.teamA.players[0].sentOff).toBe(true);
  });
  it('a 2nd yellow auto-escalates to a red and sends the player off', () => {
    let m = recordCard(matchWithPlayer(), 'teamA', 'p1', 'yellow', 0);
    m = recordCard(m, 'teamA', 'p1', 'yellow', 0);
    expect(m.teamA.players[0].yellowCards).toBe(2);
    expect(m.teamA.players[0].redCards).toBe(1);
    expect(m.teamA.players[0].sentOff).toBe(true);
    expect(m.teamA.redCards).toBe(1);
    expect(m.log[m.log.length - 1].type).toBe('card_2nd_yellow');
  });
  it('a collapsed team (no player) still increments the team tally', () => {
    const collapsed = matchWithPlayer();
    collapsed.teamA.collapsed = true;
    const m = recordCard(collapsed, 'teamA', null, 'yellow', 0);
    expect(m.teamA.yellowCards).toBe(1);
    expect(m.log[0].detail).toBe('Alpha yellow card');
  });
  it('the rev entry captures enough to undo (yellow/red deltas and prior sentOff)', () => {
    const m = recordCard(matchWithPlayer(), 'teamA', 'p1', 'red', 0);
    expect(m.log[0].rev).toEqual({ kind: 'card', team: 'teamA', playerId: 'p1', yellow: 0, red: 1, sentOffPrev: false });
  });
  it('the 2nd-yellow auto-red rev entry captures both deltas for undo', () => {
    let m = recordCard(matchWithPlayer(), 'teamA', 'p1', 'yellow', 0);
    m = recordCard(m, 'teamA', 'p1', 'yellow', 0);
    expect(m.log[m.log.length - 1].rev).toEqual({
      kind: 'card', team: 'teamA', playerId: 'p1', yellow: 1, red: 1, sentOffPrev: false,
    });
  });
  it('a card recorded against an already-sent-off player does not re-trigger auto-escalation', () => {
    let m = recordCard(matchWithPlayer(), 'teamA', 'p1', 'yellow', 0);
    m = recordCard(m, 'teamA', 'p1', 'yellow', 0); // 2nd yellow -> auto-red, sentOff true, redCards 1
    m = recordCard(m, 'teamA', 'p1', 'yellow', 0); // 3rd yellow on an already-sent-off player
    expect(m.teamA.players[0].yellowCards).toBe(3);
    expect(m.teamA.players[0].redCards).toBe(1); // still just the one auto-escalated red, not a 2nd
    expect(m.teamA.players[0].sentOff).toBe(true);
  });
});
