import { describe, it, expect } from 'vitest';
import { clone, otherTeam, teamOf, findPlayer, playerTag, appendLog } from './log';
import type { Match, Team } from './types';

function emptyTeam(id: string, name: string): Team {
  return {
    id, name, collapsed: false, players: [], goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0,
    assists: 0, shotsOnGoal: 0, targetsOnGoal: 0, tackles: 0, foulsCommitted: 0, saves: 0,
  };
}

function emptyMatch(): Match {
  return {
    id: 'm1',
    screen: 'game',
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: false, hasStoppageTime: false },
    teamA: emptyTeam('a', 'Alpha'),
    teamB: emptyTeam('b', 'Beta'),
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

describe('clone', () => {
  it('produces a deep copy, not the same reference', () => {
    const m = emptyMatch();
    const c = clone(m);
    expect(c).toEqual(m);
    expect(c).not.toBe(m);
    c.score.teamA = 5;
    expect(m.score.teamA).toBe(0);
  });
});

describe('otherTeam', () => {
  it('returns teamB for teamA and vice versa', () => {
    expect(otherTeam('teamA')).toBe('teamB');
    expect(otherTeam('teamB')).toBe('teamA');
  });
});

describe('teamOf', () => {
  it('returns the correct team object for each key', () => {
    const m = emptyMatch();
    expect(teamOf(m, 'teamA')).toBe(m.teamA);
    expect(teamOf(m, 'teamB')).toBe(m.teamB);
  });
});

describe('findPlayer', () => {
  it('finds a player by id, or returns null if absent', () => {
    const t = emptyTeam('a', 'Alpha');
    t.players.push({
      id: 'p1', num: 9, name: 'Sam', starter: true, position: null,
      onField: false, inClock: null, fieldSecs: 0, goals: 0, assists: 0, shotsOnGoal: 0,
      tackles: 0, foulsCommitted: 0, saves: 0, yellowCards: 0, redCards: 0, sentOff: false,
    });
    expect(findPlayer(t, 'p1')?.name).toBe('Sam');
    expect(findPlayer(t, 'nope')).toBeNull();
  });
});

describe('playerTag', () => {
  it('formats number + name when name is present', () => {
    expect(playerTag({ num: 9, name: 'Sam' })).toBe('#9 Sam');
  });
  it('formats just the number when name is empty', () => {
    expect(playerTag({ num: 9, name: '' })).toBe('#9');
  });
});

describe('appendLog', () => {
  it('appends an entry with an incrementing id and bumps _seq', () => {
    const m = emptyMatch();
    const m2 = appendLog(m, {
      period: 1, clockText: '0:00', team: null, playerId: null, type: 'test', detail: 'test entry', rev: null,
    });
    expect(m2.log).toHaveLength(1);
    expect(m2.log[0].id).toBe(1);
    expect(m2._seq).toBe(1);
    expect(m.log).toHaveLength(0); // original untouched
  });
});
