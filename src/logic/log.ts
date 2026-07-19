import type { Match, Team, Player, TeamKey, LogEntry } from './types';

export function clone<T>(obj: T): T {
  return structuredClone(obj);
}

export function makeId(): string {
  return 'id' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function otherTeam(team: TeamKey): TeamKey {
  return team === 'teamA' ? 'teamB' : 'teamA';
}

export function teamOf(match: Match, team: TeamKey): Team {
  return team === 'teamA' ? match.teamA : match.teamB;
}

export function findPlayer(team: Team, playerId: string): Player | null {
  return team.players.find((p) => p.id === playerId) ?? null;
}

export function playerTag(p: { num: number; name: string }): string {
  return p.name ? `#${p.num} ${p.name}` : `#${p.num}`;
}

export function appendLog(match: Match, entry: Omit<LogEntry, 'id'>): Match {
  const m = clone(match);
  m._seq += 1;
  m.log.push({ id: m._seq, ...entry });
  return m;
}
