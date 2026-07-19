import type { Match, RevEntry, TeamKey } from './types';
import { clone, teamOf, findPlayer } from './log';

export function undo(match: Match): Match {
  if (match.log.length === 0) return match;
  const last = match.log[match.log.length - 1];
  const rev = last.rev;
  if (!rev) return match;

  const m = clone(match);
  m.log.pop();
  applyRev(m, rev);
  return m;
}

function applyRev(m: Match, rev: RevEntry): void {
  switch (rev.kind) {
    case 'score': {
      m.score[rev.team] -= rev.score;
      break;
    }
    case 'stat': {
      const t = teamOf(m, rev.team);
      if (rev.playerId) {
        const p = findPlayer(t, rev.playerId);
        if (p) {
          for (const [field, n] of Object.entries(rev.fields)) {
            (p as unknown as Record<string, number>)[field] -= n;
          }
        }
      }
      m.score[rev.team] -= rev.score;
      break;
    }
    case 'card': {
      const t = teamOf(m, rev.team);
      t.yellowCards -= rev.yellow;
      t.redCards -= rev.red;
      if (rev.playerId) {
        const p = findPlayer(t, rev.playerId);
        if (p) {
          p.yellowCards -= rev.yellow;
          p.redCards -= rev.red;
          p.sentOff = rev.sentOffPrev;
        }
      }
      break;
    }
    case 'sub': {
      const t = teamOf(m, rev.team);
      const p = findPlayer(t, rev.playerId);
      if (p) {
        p.onField = rev.onField;
        p.inClock = rev.inClock;
        p.fieldSecs -= rev.fieldSecsDelta;
      }
      break;
    }
    case 'possession': {
      m.possession.current = rev.prev;
      m.possession.since = rev.prevSince;
      for (const [team, delta] of Object.entries(rev.accumSecDelta)) {
        m.possession.accumSec[team as TeamKey] -= delta as number;
      }
      break;
    }
    case 'corner': {
      teamOf(m, rev.team).corners -= rev.delta;
      break;
    }
    case 'offside': {
      teamOf(m, rev.team).offsides -= rev.delta;
      break;
    }
    case 'stoppage': {
      if (rev.prev === undefined) delete m.stoppage[rev.period];
      else m.stoppage[rev.period] = rev.prev;
      break;
    }
    case 'shootoutAttempt': {
      if (m.shootout) {
        m.shootout.attempts.pop();
        m.shootout.winner = null;
      }
      break;
    }
    default: {
      const _exhaustive: never = rev;
      throw new Error(`undo: unhandled rev.kind: ${(_exhaustive as { kind: string }).kind}`);
    }
  }
}
