import { describe, it, expect } from 'vitest';
import { recordPlayerStat } from './stats';
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
