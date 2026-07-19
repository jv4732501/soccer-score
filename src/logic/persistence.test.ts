import { describe, it, expect } from 'vitest';
import { serialize, deserialize, isResumable, upsertTeam, removeTeam, upsertHistory, removeFromHistory } from './persistence';
import type { Match, SavedTeam } from './types';

describe('serialize / deserialize', () => {
  it('round-trips a plain object', () => {
    const obj = { a: 1, b: ['x', 'y'] };
    expect(deserialize(serialize(obj))).toEqual(obj);
  });
  it('deserialize returns null for null input', () => {
    expect(deserialize(null)).toBeNull();
  });
  it('deserialize returns null for malformed JSON instead of throwing', () => {
    expect(deserialize('{not json')).toBeNull();
  });
});

describe('isResumable', () => {
  it('true only when screen is game', () => {
    // as unknown as Match: isResumable only ever reads `.screen`, so these stubs are deliberately partial.
    expect(isResumable({ screen: 'game' } as unknown as Match)).toBe(true);
    expect(isResumable({ screen: 'summary' } as unknown as Match)).toBe(false);
    expect(isResumable({ screen: 'shootout' } as unknown as Match)).toBe(false);
    expect(isResumable(null)).toBe(false);
  });
});

function team(id: string, name: string): SavedTeam {
  return { id, name, players: [] };
}

describe('upsertTeam / removeTeam', () => {
  it('adds a new team', () => {
    const teams = upsertTeam([], team('a', 'Alpha'));
    expect(teams).toHaveLength(1);
  });
  it('updates an existing team by id instead of duplicating', () => {
    let teams = upsertTeam([], team('a', 'Alpha'));
    teams = upsertTeam(teams, team('a', 'Alpha United'));
    expect(teams).toHaveLength(1);
    expect(teams[0].name).toBe('Alpha United');
  });
  it('removeTeam filters out the given id', () => {
    let teams = upsertTeam([], team('a', 'Alpha'));
    teams = upsertTeam(teams, team('b', 'Beta'));
    teams = removeTeam(teams, 'a');
    expect(teams.map((t) => t.id)).toEqual(['b']);
  });
});

function match(id: string, screen: Match['screen'] = 'summary'): Match {
  // history CRUD (and isResumable/mergeBackup) only ever read `.id` and `.screen` in these tests;
  // `as unknown as Match` sidesteps TS's type-overlap check for this deliberately partial stub.
  return { id, screen } as unknown as Match;
}

describe('upsertHistory / removeFromHistory', () => {
  it('adds a new match to history', () => {
    const history = upsertHistory([], match('m1'));
    expect(history).toHaveLength(1);
  });
  it('updates an existing history entry by id instead of duplicating', () => {
    let history = upsertHistory([], match('m1'));
    history = upsertHistory(history, match('m1'));
    expect(history).toHaveLength(1);
  });
  it('removeFromHistory filters out the given id', () => {
    let history = upsertHistory([], match('m1'));
    history = upsertHistory(history, match('m2'));
    history = removeFromHistory(history, 'm1');
    expect(history.map((m) => m.id)).toEqual(['m2']);
  });
});
