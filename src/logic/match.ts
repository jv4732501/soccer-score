import type { Match, Team, SavedTeam, TeamKey, MatchConfig, RevEntry } from './types';
import { clone, appendLog, teamOf, makeId } from './log';
import { clockElapsed, stopClock, formatClock } from './clock';

function buildTeam(saved: SavedTeam, activeIds: string[], collapsed: boolean): Team {
  return {
    id: saved.id,
    name: saved.name,
    collapsed,
    players: collapsed
      ? []
      : saved.players
          .filter((p) => activeIds.includes(p.id))
          .map((p) => ({
            ...p,
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
          })),
    goalkeeperId: collapsed
      ? null
      : (saved.players.find((p) => p.goalkeeper && activeIds.includes(p.id))?.id ?? null),
    corners: 0,
    offsides: 0,
    yellowCards: 0,
    redCards: 0,
  };
}

export function newMatch(args: {
  config: MatchConfig;
  teamA: SavedTeam;
  activeIdsA: string[];
  collapsedA: boolean;
  teamB: SavedTeam;
  activeIdsB: string[];
  collapsedB: boolean;
  homeTeam: TeamKey;
}): Match {
  return {
    id: makeId(),
    screen: 'game',
    config: { ...args.config },
    teamA: buildTeam(args.teamA, args.activeIdsA, args.collapsedA),
    teamB: buildTeam(args.teamB, args.activeIdsB, args.collapsedB),
    homeTeam: args.homeTeam,
    period: 1,
    clock: { elapsedSec: 0, running: false, startedAt: null },
    stoppage: {},
    score: { teamA: 0, teamB: 0 },
    possession: { current: null, since: null, accumSec: { teamA: 0, teamB: 0 } },
    periodScores: [],
    log: [],
    _seq: 0,
    date: null,
  };
}

export function adjustScore(match: Match, team: TeamKey, delta: number, nowMs: number): Match {
  let m = clone(match);
  const next = Math.max(0, m.score[team] + delta);
  const applied = next - m.score[team];
  if (applied === 0) return match;
  m.score[team] = next;
  const sign = applied >= 0 ? `+${applied}` : String(applied);
  const rev: RevEntry = { kind: 'score', team, score: applied };
  m = appendLog(m, {
    period: m.period,
    clockText: formatClock(clockElapsed(m.clock, nowMs)),
    team,
    playerId: null,
    type: 'score_adj',
    detail: `${teamOf(m, team).name} score ${sign}`,
    rev,
  });
  return m;
}

export function snapshotPeriod(match: Match): Match {
  const m = clone(match);
  m.periodScores.push({ teamA: m.score.teamA, teamB: m.score.teamB });
  return m;
}

export function closeOutAccrual(match: Match): Match {
  const m = clone(match);
  const elapsed = m.clock.elapsedSec;
  for (const key of ['teamA', 'teamB'] as TeamKey[]) {
    for (const p of teamOf(m, key).players) {
      if (p.onField && p.inClock != null) {
        p.fieldSecs += elapsed - p.inClock;
        p.inClock = elapsed;
      }
    }
  }
  if (m.possession.current && m.possession.since != null) {
    m.possession.accumSec[m.possession.current] += elapsed - m.possession.since;
    m.possession.since = elapsed;
  }
  return m;
}

function reopenAccrual(match: Match): Match {
  const m = clone(match);
  for (const key of ['teamA', 'teamB'] as TeamKey[]) {
    for (const p of teamOf(m, key).players) {
      if (p.onField) p.inClock = 0;
    }
  }
  if (m.possession.current) m.possession.since = 0;
  return m;
}

export function endHalf(match: Match, nowMs: number): Match {
  if (match.period !== 1) return match;
  let m = stopClock(match, nowMs);
  m = closeOutAccrual(m);
  m = snapshotPeriod(m);
  m.period = 2;
  m.clock = { elapsedSec: 0, running: false, startedAt: null };
  m = reopenAccrual(m);
  m = appendLog(m, {
    period: 1,
    clockText: formatClock(clockElapsed(match.clock, nowMs)),
    team: null,
    playerId: null,
    type: 'end_period',
    detail: 'End of Half 1',
    rev: null,
  });
  return m;
}

export function addExtraTime(match: Match, nowMs: number): Match {
  if (match.period !== 2 && match.period !== 'ET1') return match;
  if (!match.config.hasExtraTime) return match;
  let m = stopClock(match, nowMs);
  m = closeOutAccrual(m);
  m = snapshotPeriod(m);
  const finished = m.period as 2 | 'ET1';
  m.period = finished === 2 ? 'ET1' : 'ET2';
  m.clock = { elapsedSec: 0, running: false, startedAt: null };
  m = reopenAccrual(m);
  m = appendLog(m, {
    period: finished,
    clockText: formatClock(clockElapsed(match.clock, nowMs)),
    team: null,
    playerId: null,
    type: 'end_period',
    detail: `End of ${finished === 2 ? 'Half 2' : 'Extra Time 1'} — extra time`,
    rev: null,
  });
  return m;
}

export function endGame(match: Match, nowMs: number): Match {
  let m = stopClock(match, nowMs);
  m = closeOutAccrual(m);
  m = snapshotPeriod(m);
  m.screen = 'summary';
  m.date = nowMs;
  m = appendLog(m, {
    period: m.period,
    clockText: formatClock(clockElapsed(match.clock, nowMs)),
    team: null,
    playerId: null,
    type: 'end_game',
    detail: 'Final',
    rev: null,
  });
  return m;
}
