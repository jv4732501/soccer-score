import type { Match, TeamKey, RevEntry } from './types';
import { clone, appendLog, teamOf, findPlayer, playerTag } from './log';
import { clockElapsed, formatClock } from './clock';
import { positionAbbr } from './position';

const PLAYER_STAT_FIELDS = ['goals', 'assists', 'shotsOnGoal', 'tackles', 'foulsCommitted', 'saves'] as const;
export type PlayerStatField = (typeof PLAYER_STAT_FIELDS)[number];

const STAT_LABEL: Record<PlayerStatField, string> = {
  goals: 'goal',
  assists: 'assist',
  shotsOnGoal: 'shot on goal',
  tackles: 'tackle',
  foulsCommitted: 'foul',
  saves: 'save',
};

export function recordPlayerStat(
  match: Match,
  team: TeamKey,
  playerId: string,
  stat: PlayerStatField,
  nowMs: number,
): Match {
  let m = clone(match);
  const t = teamOf(m, team);
  const p = findPlayer(t, playerId);
  if (!p) return match;
  p[stat] += 1;
  const scoreDelta = stat === 'goals' ? 1 : 0;
  if (scoreDelta) m.score[team] += scoreDelta;
  const isSharedField = (SHARED_STAT_FIELDS as readonly string[]).includes(stat);
  if (isSharedField) t[stat as SharedStatField] += 1;
  const teamFields = isSharedField ? { [stat]: 1 } : {};
  const rev: RevEntry = { kind: 'stat', team, playerId, fields: { [stat]: 1 }, teamFields, score: scoreDelta };
  m = appendLog(m, {
    period: m.period,
    clockText: formatClock(clockElapsed(m.clock, nowMs)),
    team,
    playerId,
    type: stat,
    detail: `${playerTag(p)} ${STAT_LABEL[stat]}`,
    rev,
  });
  return m;
}

export function recordCard(
  match: Match,
  team: TeamKey,
  playerId: string | null,
  color: 'yellow' | 'red',
  nowMs: number,
): Match {
  let m = clone(match);
  const t = teamOf(m, team);
  const p = playerId ? findPlayer(t, playerId) : null;
  if (playerId && !p) return match;

  const prevSentOff = p ? p.sentOff : false;
  let autoRed = false;
  let yellowDelta = 0;
  let redDelta = 0;

  if (color === 'yellow') {
    t.yellowCards += 1;
    yellowDelta = 1;
    if (p) {
      p.yellowCards += 1;
      if (p.yellowCards >= 2 && !p.sentOff) autoRed = true;
    }
  } else {
    t.redCards += 1;
    redDelta = 1;
    if (p) p.redCards += 1;
  }

  if (autoRed && p) {
    t.redCards += 1;
    p.redCards += 1;
    redDelta += 1;
  }

  if (p && (color === 'red' || autoRed)) p.sentOff = true;

  const rev: RevEntry = { kind: 'card', team, playerId, yellow: yellowDelta, red: redDelta, sentOffPrev: prevSentOff };
  const detail = p
    ? `${playerTag(p)} ${color} card${autoRed ? ' (2nd yellow — sent off)' : ''}`
    : `${t.name} ${color} card`;
  m = appendLog(m, {
    period: m.period,
    clockText: formatClock(clockElapsed(m.clock, nowMs)),
    team,
    playerId,
    type: autoRed ? 'card_2nd_yellow' : `card_${color}`,
    detail,
    rev,
  });
  return m;
}

export function recordCorner(match: Match, team: TeamKey, nowMs: number): Match {
  let m = clone(match);
  const t = teamOf(m, team);
  t.corners += 1;
  const rev: RevEntry = { kind: 'corner', team, delta: 1 };
  m = appendLog(m, {
    period: m.period,
    clockText: formatClock(clockElapsed(m.clock, nowMs)),
    team,
    playerId: null,
    type: 'corner',
    detail: `${t.name} corner`,
    rev,
  });
  return m;
}

export function recordOffside(match: Match, team: TeamKey, nowMs: number): Match {
  let m = clone(match);
  const t = teamOf(m, team);
  t.offsides += 1;
  const rev: RevEntry = { kind: 'offside', team, delta: 1 };
  m = appendLog(m, {
    period: m.period,
    clockText: formatClock(clockElapsed(m.clock, nowMs)),
    team,
    playerId: null,
    type: 'offside',
    detail: `${t.name} offside`,
    rev,
  });
  return m;
}

const TEAM_STAT_FIELDS = [
  'assists',
  'shotsOnGoal',
  'targetsOnGoal',
  'tackles',
  'foulsCommitted',
  'saves',
] as const;
export type TeamStatField = (typeof TEAM_STAT_FIELDS)[number];

const TEAM_STAT_LABEL: Record<TeamStatField, string> = {
  assists: 'assist',
  shotsOnGoal: 'shot on goal',
  targetsOnGoal: 'target on goal',
  tackles: 'tackle',
  foulsCommitted: 'foul',
  saves: 'save',
};

export function recordTeamStat(match: Match, team: TeamKey, stat: TeamStatField, nowMs: number): Match {
  let m = clone(match);
  const t = teamOf(m, team);
  t[stat] += 1;
  const rev: RevEntry = { kind: 'teamStat', team, stat, delta: 1 };
  m = appendLog(m, {
    period: m.period,
    clockText: formatClock(clockElapsed(m.clock, nowMs)),
    team,
    playerId: null,
    type: `team_${stat}`,
    detail: `${t.name} ${TEAM_STAT_LABEL[stat]}`,
    rev,
  });
  return m;
}

export const SHARED_STAT_FIELDS = ['assists', 'shotsOnGoal', 'tackles', 'foulsCommitted', 'saves'] as const;
export type SharedStatField = (typeof SHARED_STAT_FIELDS)[number];

export function recordAttributedTeamStat(
  match: Match,
  team: TeamKey,
  playerId: string,
  stat: SharedStatField,
  nowMs: number,
): Match {
  let m = clone(match);
  const t = teamOf(m, team);
  const p = findPlayer(t, playerId);
  if (!p) return match;
  t[stat] += 1;
  p[stat] += 1;
  const rev: RevEntry = { kind: 'attributedTeamStat', team, playerId, stat, delta: 1 };
  m = appendLog(m, {
    period: m.period,
    clockText: formatClock(clockElapsed(m.clock, nowMs)),
    team,
    playerId,
    type: `team_${stat}`,
    detail: `${playerTag(p)} ${TEAM_STAT_LABEL[stat]}`,
    rev,
  });
  return m;
}

export function subIn(
  match: Match,
  team: TeamKey,
  playerId: string,
  nowMs: number,
  position?: number | null,
): Match {
  const t0 = teamOf(match, team);
  const p0 = findPlayer(t0, playerId);
  if (!p0 || p0.onField || p0.sentOff) return match;
  let m = clone(match);
  const t = teamOf(m, team);
  const p = findPlayer(t, playerId)!;
  const elapsed = clockElapsed(m.clock, nowMs);
  const positionPrev = p.position;
  p.onField = true;
  p.inClock = elapsed;
  if (position !== undefined) p.position = position;
  const rev: RevEntry = {
    kind: 'sub',
    team,
    playerId,
    onField: false,
    inClock: null,
    fieldSecsDelta: 0,
    positionPrev,
  };
  const posAbbr = position !== undefined ? positionAbbr(position) : null;
  m = appendLog(m, {
    period: m.period,
    clockText: formatClock(elapsed),
    team,
    playerId,
    type: 'sub_in',
    detail: `${playerTag(p)} subs in${posAbbr ? ` as ${posAbbr}` : ''}`,
    rev,
  });
  return m;
}

export function subOut(match: Match, team: TeamKey, playerId: string, nowMs: number): Match {
  const t0 = teamOf(match, team);
  const p0 = findPlayer(t0, playerId);
  if (!p0 || !p0.onField) return match;
  let m = clone(match);
  const t = teamOf(m, team);
  const p = findPlayer(t, playerId)!;
  const elapsed = clockElapsed(m.clock, nowMs);
  const prevInClock = p.inClock;
  const delta = prevInClock != null ? elapsed - prevInClock : 0;
  p.fieldSecs += delta;
  p.onField = false;
  p.inClock = null;
  const rev: RevEntry = {
    kind: 'sub',
    team,
    playerId,
    onField: true,
    inClock: prevInClock,
    fieldSecsDelta: delta,
    positionPrev: p.position,
  };
  m = appendLog(m, {
    period: m.period,
    clockText: formatClock(elapsed),
    team,
    playerId,
    type: 'sub_out',
    detail: `${playerTag(p)} subs out`,
    rev,
  });
  return m;
}

export function setPossession(match: Match, team: TeamKey, nowMs: number): Match {
  if (match.possession.current === team) return match;
  let m = clone(match);
  const elapsed = clockElapsed(m.clock, nowMs);
  const prev = m.possession.current;
  const prevSince = m.possession.since;
  const accumSecDelta: Partial<Record<TeamKey, number>> = {};
  if (prev && m.possession.since != null) {
    const delta = elapsed - m.possession.since;
    m.possession.accumSec[prev] += delta;
    accumSecDelta[prev] = delta;
  }
  m.possession.current = team;
  m.possession.since = elapsed;
  const rev: RevEntry = { kind: 'possession', prev, prevSince, accumSecDelta };
  m = appendLog(m, {
    period: m.period,
    clockText: formatClock(elapsed),
    team,
    playerId: null,
    type: 'possession',
    detail: `Possession: ${teamOf(m, team).name}`,
    rev,
  });
  return m;
}
