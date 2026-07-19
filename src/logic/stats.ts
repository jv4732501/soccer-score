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
