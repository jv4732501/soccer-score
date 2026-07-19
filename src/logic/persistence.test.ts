import { describe, it, expect } from 'vitest';
import { serialize, deserialize, isResumable, upsertTeam, removeTeam, upsertHistory, removeFromHistory, buildBackup, validateBackup, mergeBackup } from './persistence';
import type { Match, SavedTeam } from './types';
import type { AppState } from './persistence';

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

function emptyState(): AppState {
  return { teams: [], history: [], match: null };
}

describe('buildBackup', () => {
  it('captures app id, format version, timestamp, and a deep copy of state', () => {
    const state: AppState = { teams: [team('a', 'Alpha')], history: [], match: null };
    const backup = buildBackup(state, 1700000000000);
    expect(backup.app).toBe('soccerscore');
    expect(backup.formatVersion).toBe(1);
    expect(backup.exportedAt).toBe(new Date(1700000000000).toISOString());
    expect(backup.teams).toEqual(state.teams);
    expect(backup.teams).not.toBe(state.teams); // deep copy, not same reference
  });
});

describe('validateBackup', () => {
  it('rejects a non-object', () => {
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup('nope').ok).toBe(false);
  });
  it("rejects an object missing app: 'soccerscore'", () => {
    expect(validateBackup({ app: 'other' }).ok).toBe(false);
  });
  it('rejects a backup from a newer format version', () => {
    const result = validateBackup({ app: 'soccerscore', formatVersion: 2 });
    expect(result.ok).toBe(false);
  });
  it('accepts a valid backup and defaults missing arrays to empty', () => {
    const result = validateBackup({ app: 'soccerscore', formatVersion: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.teams).toEqual([]);
      expect(result.backup.history).toEqual([]);
      expect(result.backup.match).toBeNull();
    }
  });
});

describe('mergeBackup', () => {
  it('adds new teams and counts them as added', () => {
    const { state, summary } = mergeBackup(emptyState(), { teams: [team('a', 'Alpha')], history: [], match: null });
    expect(state.teams).toHaveLength(1);
    expect(summary.teamsAdded).toBe(1);
    expect(summary.teamsUpdated).toBe(0);
  });
  it('updates existing teams by id and counts them as updated', () => {
    const existing: AppState = { teams: [team('a', 'Alpha')], history: [], match: null };
    const { state, summary } = mergeBackup(existing, { teams: [team('a', 'Alpha United')], history: [], match: null });
    expect(state.teams[0].name).toBe('Alpha United');
    expect(summary.teamsUpdated).toBe(1);
    expect(summary.teamsAdded).toBe(0);
  });
  it('adds new history entries and counts them as added', () => {
    const { state, summary } = mergeBackup(emptyState(), { teams: [], history: [match('m1')], match: null });
    expect(state.history).toHaveLength(1);
    expect(summary.gamesAdded).toBe(1);
  });
  it('restores a backed-up in-progress match when there is no current one', () => {
    const backupMatch = match('m1', 'game');
    const { state, summary } = mergeBackup(emptyState(), { teams: [], history: [], match: backupMatch });
    expect(state.match).toEqual(backupMatch);
    expect(summary.matchRestored).toBe(true);
    expect(summary.matchSkipped).toBe(false);
  });
  it('skips restoring a backed-up match if one is already in progress', () => {
    const current = match('current', 'game');
    const backupMatch = match('m1', 'game');
    const existing: AppState = { teams: [], history: [], match: current };
    const { state, summary } = mergeBackup(existing, { teams: [], history: [], match: backupMatch });
    expect(state.match).toBe(current);
    expect(summary.matchSkipped).toBe(true);
    expect(summary.matchRestored).toBe(false);
  });
});
