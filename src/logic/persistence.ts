import type { Match, SavedTeam } from './types';

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
