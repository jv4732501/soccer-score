import type { Match, TeamKey } from './types';
import { clone, appendLog, teamOf } from './log';
import { clockElapsed, formatClock, stopClock } from './clock';
import { closeOutAccrual, snapshotPeriod } from './match';

export function startShootout(match: Match, nowMs: number): Match {
  let m = stopClock(match, nowMs);
  m = closeOutAccrual(m);
  m = snapshotPeriod(m);
  m.screen = 'shootout';
  m.period = 'shootout';
  m.shootout = { attempts: [], winner: null };
  m = appendLog(m, {
    period: 'shootout',
    clockText: formatClock(clockElapsed(m.clock, nowMs)),
    team: null,
    playerId: null,
    type: 'shootout_start',
    detail: 'Penalty shootout begins',
    rev: null,
  });
  return m;
}

function detectWinner(attempts: { team: TeamKey; scored: boolean }[]): TeamKey | null {
  const takenOf = (team: TeamKey) => attempts.filter((a) => a.team === team).length;
  const scoreOf = (team: TeamKey) => attempts.filter((a) => a.team === team && a.scored).length;
  const aTaken = takenOf('teamA');
  const bTaken = takenOf('teamB');
  const aScore = scoreOf('teamA');
  const bScore = scoreOf('teamB');

  if (aTaken <= 5 && bTaken <= 5 && aTaken === bTaken && aTaken > 0) {
    const remainingA = 5 - aTaken;
    const remainingB = 5 - bTaken;
    if (aScore > bScore + remainingB) return 'teamA';
    if (bScore > aScore + remainingA) return 'teamB';
    if (aTaken === 5 && bTaken === 5 && aScore !== bScore) return aScore > bScore ? 'teamA' : 'teamB';
  }

  if (aTaken > 5 && bTaken > 5 && aTaken === bTaken) {
    const lastA = attempts.filter((a) => a.team === 'teamA')[aTaken - 1];
    const lastB = attempts.filter((a) => a.team === 'teamB')[bTaken - 1];
    if (lastA.scored !== lastB.scored) return lastA.scored ? 'teamA' : 'teamB';
  }

  return null;
}

export function recordAttempt(match: Match, team: TeamKey, scored: boolean, nowMs: number): Match {
  if (!match.shootout || match.shootout.winner) return match;
  let m = clone(match);
  m.shootout!.attempts.push({ team, scored });
  m.shootout!.winner = detectWinner(m.shootout!.attempts);
  m = appendLog(m, {
    period: 'shootout',
    clockText: formatClock(clockElapsed(m.clock, nowMs)),
    team,
    playerId: null,
    type: 'shootout_attempt',
    detail: `${teamOf(m, team).name} ${scored ? 'scored' : 'missed'}`,
    rev: { kind: 'shootoutAttempt' },
  });
  return m;
}
