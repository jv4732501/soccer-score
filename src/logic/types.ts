export type TeamKey = 'teamA' | 'teamB';
export type Period = 1 | 2 | 'ET1' | 'ET2' | 'shootout';

export interface SavedPlayer {
  id: string;
  num: number;
  name: string;
  starter: boolean;
  goalkeeper: boolean;
}

export interface SavedTeam {
  id: string;
  name: string;
  players: SavedPlayer[];
}

export interface Player extends SavedPlayer {
  onField: boolean;
  inClock: number | null;
  fieldSecs: number;
  goals: number;
  assists: number;
  shotsOnGoal: number;
  tackles: number;
  foulsCommitted: number;
  saves: number;
  yellowCards: number;
  redCards: number;
  sentOff: boolean;
}

export interface Team {
  id: string;
  name: string;
  collapsed: boolean;
  players: Player[];
  goalkeeperId: string | null;
  corners: number;
  offsides: number;
  yellowCards: number;
  redCards: number;
}

export interface ClockState {
  elapsedSec: number;
  running: boolean;
  startedAt: number | null;
}

export interface PossessionState {
  current: TeamKey | null;
  since: number | null;
  accumSec: Record<TeamKey, number>;
}

export interface ShootoutState {
  attempts: { team: TeamKey; scored: boolean }[];
  winner: TeamKey | null;
}

export interface MatchConfig {
  halfLengthMin: number;
  hasExtraTime: boolean;
  extraTimeLengthMin: number;
  hasShootout: boolean;
}

export interface Match {
  id: string;
  screen: 'game' | 'shootout' | 'summary';
  config: MatchConfig;
  teamA: Team;
  teamB: Team;
  homeTeam: TeamKey;
  period: Period;
  clock: ClockState;
  stoppage: Partial<Record<Period, number>>;
  score: Record<TeamKey, number>;
  possession: PossessionState;
  periodScores: Record<TeamKey, number>[];
  shootout?: ShootoutState;
  log: LogEntry[];
  _seq: number;
  date: number | null;
}

export interface LogEntry {
  id: number;
  period: Period;
  clockText: string;
  team: TeamKey | null;
  playerId: string | null;
  type: string;
  detail: string;
  rev: RevEntry | null;
}

export type RevEntry =
  | { kind: 'score'; team: TeamKey; score: number }
  | { kind: 'stat'; team: TeamKey; playerId: string | null; fields: Record<string, number>; score: number }
  | { kind: 'card'; team: TeamKey; playerId: string | null; yellow: number; red: number; sentOffPrev: boolean }
  | { kind: 'sub'; team: TeamKey; playerId: string; onField: boolean; inClock: number | null; fieldSecsDelta: number }
  | { kind: 'possession'; prev: TeamKey | null; prevSince: number | null; accumSecDelta: Partial<Record<TeamKey, number>> }
  | { kind: 'corner' | 'offside'; team: TeamKey; delta: number }
  | { kind: 'stoppage'; period: Period; prev: number | undefined }
  | { kind: 'shootoutAttempt' };
