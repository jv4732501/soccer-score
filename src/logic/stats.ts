import type { Match, TeamKey, RevEntry } from './types';
import { clone, appendLog, teamOf, findPlayer, playerTag } from './log';
import { clockElapsed, formatClock } from './clock';

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
  const rev: RevEntry = { kind: 'stat', team, playerId, fields: { [stat]: 1 }, score: scoreDelta };
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

export function subIn(match: Match, team: TeamKey, playerId: string, nowMs: number): Match {
  const t0 = teamOf(match, team);
  const p0 = findPlayer(t0, playerId);
  if (!p0 || p0.onField || p0.sentOff) return match;
  let m = clone(match);
  const t = teamOf(m, team);
  const p = findPlayer(t, playerId)!;
  const elapsed = clockElapsed(m.clock, nowMs);
  p.onField = true;
  p.inClock = elapsed;
  const rev: RevEntry = { kind: 'sub', team, playerId, onField: false, inClock: null, fieldSecsDelta: 0 };
  m = appendLog(m, {
    period: m.period,
    clockText: formatClock(elapsed),
    team,
    playerId,
    type: 'sub_in',
    detail: `${playerTag(p)} subs in`,
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
  const rev: RevEntry = { kind: 'sub', team, playerId, onField: true, inClock: prevInClock, fieldSecsDelta: delta };
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
