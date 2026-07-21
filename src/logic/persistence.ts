import { clone } from './log';
import type { Match, SavedTeam, Team } from './types';

export function serialize(value: unknown): string {
  return JSON.stringify(value);
}

export function deserialize<T>(str: string | null): T | null {
  try {
    return str == null ? null : (JSON.parse(str) as T);
  } catch {
    return null;
  }
}

export function isResumable(match: Match | null): boolean {
  return !!match && match.screen === 'game';
}

// Fills team-level stat fields introduced after this match/backup may have been
// saved, so older localStorage data and older backup files don't render blank
// or NaN counts (undefined + 1 === NaN) once loaded into the current schema.
function normalizeTeam(t: Team): Team {
  return {
    ...t,
    corners: t.corners ?? 0,
    offsides: t.offsides ?? 0,
    yellowCards: t.yellowCards ?? 0,
    redCards: t.redCards ?? 0,
    assists: t.assists ?? 0,
    shotsOnGoal: t.shotsOnGoal ?? 0,
    targetsOnGoal: t.targetsOnGoal ?? 0,
    tackles: t.tackles ?? 0,
    foulsCommitted: t.foulsCommitted ?? 0,
    saves: t.saves ?? 0,
  };
}

export function migrateMatch(match: Match): Match {
  return {
    ...match,
    teamA: match.teamA ? normalizeTeam(match.teamA) : match.teamA,
    teamB: match.teamB ? normalizeTeam(match.teamB) : match.teamB,
  };
}

export function migrateHistory(history: Match[]): Match[] {
  return history.map(migrateMatch);
}

export function upsertTeam(teams: SavedTeam[], team: SavedTeam): SavedTeam[] {
  const arr = teams.slice();
  const i = arr.findIndex((t) => t.id === team.id);
  if (i >= 0) arr[i] = team;
  else arr.push(team);
  return arr;
}

export function removeTeam(teams: SavedTeam[], id: string): SavedTeam[] {
  return teams.filter((t) => t.id !== id);
}

export function upsertHistory(history: Match[], match: Match): Match[] {
  const arr = history.slice();
  const i = arr.findIndex((m) => m.id === match.id);
  if (i >= 0) arr[i] = match;
  else arr.push(match);
  return arr;
}

export function removeFromHistory(history: Match[], id: string): Match[] {
  return history.filter((m) => m.id !== id);
}

export interface AppState {
  teams: SavedTeam[];
  history: Match[];
  match: Match | null;
}

export interface Backup {
  app: 'soccerscore';
  formatVersion: 1;
  exportedAt: string;
  teams: SavedTeam[];
  history: Match[];
  match: Match | null;
}

export function buildBackup(state: AppState, nowMs: number): Backup {
  return {
    app: 'soccerscore',
    formatVersion: 1,
    exportedAt: new Date(nowMs).toISOString(),
    teams: clone(state.teams),
    history: clone(state.history),
    match: state.match ? clone(state.match) : null,
  };
}

export type ValidateResult =
  | { ok: true; backup: { teams: SavedTeam[]; history: Match[]; match: Match | null } }
  | { ok: false; reason: string };

export function validateBackup(obj: unknown): ValidateResult {
  const notBackup: ValidateResult = { ok: false, reason: 'Not a Soccer Score backup file.' };
  if (!obj || typeof obj !== 'object') return notBackup;
  const o = obj as Record<string, unknown>;
  if (o.app !== 'soccerscore') return notBackup;
  if (typeof o.formatVersion === 'number' && o.formatVersion > 1) {
    return { ok: false, reason: 'This backup was made by a newer version of Soccer Score.' };
  }
  const teams = Array.isArray(o.teams) ? (o.teams as SavedTeam[]) : [];
  const history = Array.isArray(o.history) ? (o.history as Match[]) : [];
  return {
    ok: true,
    backup: {
      teams: teams.filter((t) => t && typeof t === 'object'),
      history: history.filter((m) => m && typeof m === 'object'),
      match: o.match && typeof o.match === 'object' ? (o.match as Match) : null,
    },
  };
}

export interface MergeSummary {
  teamsAdded: number;
  teamsUpdated: number;
  gamesAdded: number;
  gamesUpdated: number;
  matchRestored: boolean;
  matchSkipped: boolean;
}

export function mergeBackup(
  state: AppState,
  backup: { teams: SavedTeam[]; history: Match[]; match: Match | null },
): { state: AppState; summary: MergeSummary } {
  const teams = state.teams.slice();
  let teamsAdded = 0;
  let teamsUpdated = 0;
  for (const t of backup.teams) {
    const i = teams.findIndex((x) => x.id === t.id);
    if (i >= 0) {
      teams[i] = t;
      teamsUpdated += 1;
    } else {
      teams.push(t);
      teamsAdded += 1;
    }
  }

  let history = state.history;
  let gamesAdded = 0;
  let gamesUpdated = 0;
  for (const m of migrateHistory(backup.history)) {
    if (history.some((x) => x.id === m.id)) gamesUpdated += 1;
    else gamesAdded += 1;
    history = upsertHistory(history, m);
  }

  let match = state.match;
  let matchRestored = false;
  let matchSkipped = false;
  if (backup.match) {
    if (isResumable(state.match)) {
      matchSkipped = true;
    } else {
      match = migrateMatch(backup.match);
      matchRestored = true;
    }
  }

  return {
    state: { teams, history, match },
    summary: { teamsAdded, teamsUpdated, gamesAdded, gamesUpdated, matchRestored, matchSkipped },
  };
}
