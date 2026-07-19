# SoccerScore Logic Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete pure, framework-free game-logic layer under `src/logic/` for SoccerScore — types, clock/period/stoppage/extra-time logic, all stat recording (goals/assists/shots/tackles/fouls/saves/corners/offsides/cards), substitutions, possession tracking, a penalty shootout state machine, undo, and localStorage-ready persistence — so Phase 3 (React UI) has a fully tested state layer to build screens against.

**Architecture:** Every module exports pure functions of the shape `(match: Match, ...args, nowMs: number) => Match`, returning a new object via `structuredClone` rather than mutating in place (same discipline as basketballscore). A small shared `log.ts` module (`clone`, `appendLog`, `teamOf`, `findPlayer`, `playerTag`, `makeId`) is added beyond the design doc's original file list to avoid a circular dependency between `clock.ts` and `match.ts` — see the design doc addendum this plan documents. Module dependency graph (no cycles): `types.ts` ← `log.ts` ← `clock.ts` ← `match.ts`; `log.ts`+`clock.ts` ← `stats.ts`; `log.ts`+`clock.ts` ← `shootout.ts`; `log.ts` ← `undo.ts`; `log.ts` ← `persistence.ts`.

**Tech Stack:** TypeScript, Vitest (TDD — write the failing test before the implementation for every function in this plan).

## Global Constraints

- TDD throughout: write the failing Vitest test, run it, confirm it fails for the expected reason, implement, run again, confirm it passes — every task in this plan follows this cycle.
- No React, no DOM, no `localStorage` calls inside `src/logic/` — `persistence.ts` only prepares/parses data; actually reading/writing `localStorage` is a Phase 3 (React UI) concern.
- All mutating functions take `nowMs: number` explicitly as their last parameter (never read `Date.now()` internally) so tests can control time, matching basketballscore's convention.
- `structuredClone` is the only cloning mechanism (via the shared `clone()` helper) — never hand-roll spread-based deep copies.
- File paths: everything under `C:\Users\jvosters\dev\soccerscore\src\logic\`.
- Whenever a step says "Add to `<file>`" for a file being extended across multiple tasks (`stats.ts`/`stats.test.ts`, `clock.ts`/`clock.test.ts`, `persistence.ts`/`persistence.test.ts`): add new `import` lines to the top of the file alongside the existing imports, and add new functions/`describe` blocks below the existing content — never remove, move, or reorder what's already there.

---

### Task 1: `types.ts` — data model

**Files:**
- Create: `src/logic/types.ts`

**Interfaces:**
- Produces: every type every later task in this plan and Phase 3 imports — `TeamKey`, `Period`, `SavedPlayer`, `SavedTeam`, `Player`, `Team`, `Match`, `LogEntry`, `RevEntry`.

This task has no runtime behavior to unit-test (interfaces only) — verified by `npm run build` (the TypeScript compiler) instead of Vitest.

- [ ] **Step 1: Write `src/logic/types.ts`**

```ts
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
  | { kind: 'possession'; prev: TeamKey | null; accumSecDelta: Partial<Record<TeamKey, number>> }
  | { kind: 'corner' | 'offside'; team: TeamKey; delta: number }
  | { kind: 'stoppage'; period: Period; prev: number | undefined }
  | { kind: 'shootoutAttempt' };
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: succeeds with no type errors (nothing imports this file yet, so this just checks the file itself is syntactically/structurally valid TypeScript).

- [ ] **Step 3: Commit**

```bash
git add src/logic/types.ts
git commit -m "Add logic-layer data model types"
```

---

### Task 2: `log.ts` — shared helpers

**Files:**
- Create: `src/logic/log.ts`
- Test: `src/logic/log.test.ts`

**Interfaces:**
- Consumes: `Match`, `Team`, `Player`, `TeamKey`, `LogEntry` from `./types`.
- Produces: `clone<T>(obj: T): T`, `makeId(): string`, `otherTeam(team: TeamKey): TeamKey`, `teamOf(match: Match, team: TeamKey): Team`, `findPlayer(team: Team, playerId: string): Player | null`, `playerTag(p: { num: number; name: string }): string`, `appendLog(match: Match, entry: Omit<LogEntry, 'id'>): Match` — every later task in this plan imports these.

- [ ] **Step 1: Write the failing tests**

Create `src/logic/log.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { clone, otherTeam, teamOf, findPlayer, playerTag, appendLog } from './log';
import type { Match, Team } from './types';

function emptyTeam(id: string, name: string): Team {
  return { id, name, collapsed: false, players: [], goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0 };
}

function emptyMatch(): Match {
  return {
    id: 'm1',
    screen: 'game',
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: false },
    teamA: emptyTeam('a', 'Alpha'),
    teamB: emptyTeam('b', 'Beta'),
    homeTeam: 'teamA',
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

describe('clone', () => {
  it('produces a deep copy, not the same reference', () => {
    const m = emptyMatch();
    const c = clone(m);
    expect(c).toEqual(m);
    expect(c).not.toBe(m);
    c.score.teamA = 5;
    expect(m.score.teamA).toBe(0);
  });
});

describe('otherTeam', () => {
  it('returns teamB for teamA and vice versa', () => {
    expect(otherTeam('teamA')).toBe('teamB');
    expect(otherTeam('teamB')).toBe('teamA');
  });
});

describe('teamOf', () => {
  it('returns the correct team object for each key', () => {
    const m = emptyMatch();
    expect(teamOf(m, 'teamA')).toBe(m.teamA);
    expect(teamOf(m, 'teamB')).toBe(m.teamB);
  });
});

describe('findPlayer', () => {
  it('finds a player by id, or returns null if absent', () => {
    const t = emptyTeam('a', 'Alpha');
    t.players.push({
      id: 'p1', num: 9, name: 'Sam', starter: true, goalkeeper: false,
      onField: false, inClock: null, fieldSecs: 0, goals: 0, assists: 0, shotsOnGoal: 0,
      tackles: 0, foulsCommitted: 0, saves: 0, yellowCards: 0, redCards: 0, sentOff: false,
    });
    expect(findPlayer(t, 'p1')?.name).toBe('Sam');
    expect(findPlayer(t, 'nope')).toBeNull();
  });
});

describe('playerTag', () => {
  it('formats number + name when name is present', () => {
    expect(playerTag({ num: 9, name: 'Sam' })).toBe('#9 Sam');
  });
  it('formats just the number when name is empty', () => {
    expect(playerTag({ num: 9, name: '' })).toBe('#9');
  });
});

describe('appendLog', () => {
  it('appends an entry with an incrementing id and bumps _seq', () => {
    const m = emptyMatch();
    const m2 = appendLog(m, {
      period: 1, clockText: '0:00', team: null, playerId: null, type: 'test', detail: 'test entry', rev: null,
    });
    expect(m2.log).toHaveLength(1);
    expect(m2.log[0].id).toBe(1);
    expect(m2._seq).toBe(1);
    expect(m.log).toHaveLength(0); // original untouched
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test`
Expected: FAIL — `Cannot find module './log'` (file doesn't exist yet).

- [ ] **Step 3: Implement `src/logic/log.ts`**

```ts
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
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test`
Expected: PASS — all `log.test.ts` cases green.

- [ ] **Step 5: Commit**

```bash
git add src/logic/log.ts src/logic/log.test.ts
git commit -m "Add shared logic-layer helpers (clone, appendLog, teamOf, findPlayer)"
```

---

### Task 3: `clock.ts` extensions — elapsed time, start/stop, stoppage entry

**Files:**
- Modify: `src/logic/clock.ts` (currently only has `formatClock`/`parseClock` from Phase 1)
- Modify: `src/logic/clock.test.ts` (add new describe blocks; keep the existing `formatClock`/`parseClock` tests unchanged)

**Interfaces:**
- Consumes: `Match`, `ClockState`, `RevEntry` from `./types`; `clone`, `appendLog` from `./log`.
- Produces: `clockElapsed(clock: ClockState, nowMs: number): number`, `startClock(match: Match, nowMs: number): Match`, `stopClock(match: Match, nowMs: number): Match`, `toggleClock(match: Match, nowMs: number): Match`, `recordStoppage(match: Match, addedSec: number, nowMs: number): Match` — Task 4 (`match.ts`) imports `stopClock`/`clockElapsed`/`formatClock`; Tasks 5-9 (`stats.ts`) and Task 10 (`shootout.ts`) import `clockElapsed`/`formatClock`.

- [ ] **Step 1: Write the failing tests**

Add the new `import` lines below to the top of `src/logic/clock.test.ts`, alongside the existing `import { describe, it, expect } from 'vitest';` line, and add the new `describe` blocks below the existing `formatClock`/`parseClock` ones — do not remove or move those:

```ts
import { clockElapsed, startClock, stopClock, toggleClock, recordStoppage } from './clock';
import type { Match } from './types';

function emptyMatch(): Match {
  return {
    id: 'm1',
    screen: 'game',
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: false },
    teamA: { id: 'a', name: 'Alpha', collapsed: false, players: [], goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0 },
    teamB: { id: 'b', name: 'Beta', collapsed: false, players: [], goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0 },
    homeTeam: 'teamA',
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

describe('clockElapsed', () => {
  it('returns elapsedSec directly when not running', () => {
    expect(clockElapsed({ elapsedSec: 120, running: false, startedAt: null }, 999999)).toBe(120);
  });
  it('adds time since startedAt when running', () => {
    expect(clockElapsed({ elapsedSec: 100, running: true, startedAt: 1000 }, 1000 + 30000)).toBe(130);
  });
});

describe('startClock / stopClock / toggleClock', () => {
  it('startClock sets running and startedAt', () => {
    const m = startClock(emptyMatch(), 5000);
    expect(m.clock.running).toBe(true);
    expect(m.clock.startedAt).toBe(5000);
  });
  it('stopClock freezes elapsedSec and clears startedAt', () => {
    let m = startClock(emptyMatch(), 0);
    m = stopClock(m, 10000);
    expect(m.clock.running).toBe(false);
    expect(m.clock.startedAt).toBeNull();
    expect(m.clock.elapsedSec).toBe(10);
  });
  it('toggleClock flips running state', () => {
    let m = toggleClock(emptyMatch(), 0);
    expect(m.clock.running).toBe(true);
    m = toggleClock(m, 5000);
    expect(m.clock.running).toBe(false);
  });
  it('startClock on an already-running clock is a no-op', () => {
    let m = startClock(emptyMatch(), 0);
    const m2 = startClock(m, 9999);
    expect(m2.clock.startedAt).toBe(0);
  });
});

describe('recordStoppage', () => {
  it('stores added seconds for the current period and logs it', () => {
    const m = recordStoppage(emptyMatch(), 240, 0);
    expect(m.stoppage[1]).toBe(240);
    expect(m.log).toHaveLength(1);
    expect(m.log[0].rev).toEqual({ kind: 'stoppage', period: 1, prev: undefined });
  });
  it('overwriting stoppage for the same period captures the previous value for undo', () => {
    let m = recordStoppage(emptyMatch(), 120, 0);
    m = recordStoppage(m, 240, 0);
    expect(m.stoppage[1]).toBe(240);
    expect(m.log[1].rev).toEqual({ kind: 'stoppage', period: 1, prev: 120 });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test`
Expected: FAIL — `clockElapsed`/`startClock`/etc. are not exported from `./clock` yet.

- [ ] **Step 3: Implement the additions in `src/logic/clock.ts`**

Add to the existing file (keep `formatClock`/`parseClock` as-is):

```ts
import type { ClockState, Match, RevEntry } from './types';
import { clone, appendLog } from './log';

export function clockElapsed(clock: ClockState, nowMs: number): number {
  if (clock.running && clock.startedAt != null) {
    return clock.elapsedSec + Math.floor((nowMs - clock.startedAt) / 1000);
  }
  return clock.elapsedSec;
}

export function startClock(match: Match, nowMs: number): Match {
  if (match.clock.running) return match;
  const m = clone(match);
  m.clock.running = true;
  m.clock.startedAt = nowMs;
  return m;
}

export function stopClock(match: Match, nowMs: number): Match {
  if (!match.clock.running) return match;
  const m = clone(match);
  m.clock.elapsedSec = clockElapsed(match.clock, nowMs);
  m.clock.running = false;
  m.clock.startedAt = null;
  return m;
}

export function toggleClock(match: Match, nowMs: number): Match {
  return match.clock.running ? stopClock(match, nowMs) : startClock(match, nowMs);
}

export function recordStoppage(match: Match, addedSec: number, nowMs: number): Match {
  let m = clone(match);
  const prev = m.stoppage[m.period];
  m.stoppage[m.period] = addedSec;
  const rev: RevEntry = { kind: 'stoppage', period: m.period, prev };
  m = appendLog(m, {
    period: m.period,
    clockText: formatClock(clockElapsed(m.clock, nowMs)),
    team: null,
    playerId: null,
    type: 'stoppage',
    detail: `Stoppage time: +${formatClock(addedSec)}`,
    rev,
  });
  return m;
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test`
Expected: PASS — all `clock.test.ts` cases green (original `formatClock`/`parseClock` tests plus the new ones).

- [ ] **Step 5: Commit**

```bash
git add src/logic/clock.ts src/logic/clock.test.ts
git commit -m "Extend clock.ts with elapsed-time computation, start/stop/toggle, stoppage entry"
```

---

### Task 4: `match.ts` — match lifecycle (newMatch, adjustScore, period transitions, endGame)

**Files:**
- Create: `src/logic/match.ts`
- Test: `src/logic/match.test.ts`

**Interfaces:**
- Consumes: `Match`, `Team`, `SavedTeam`, `TeamKey`, `MatchConfig`, `RevEntry` from `./types`; `clone`, `appendLog`, `teamOf`, `makeId` from `./log`; `clockElapsed`, `startClock`, `stopClock`, `formatClock` from `./clock`.
- Produces: `newMatch(args): Match`, `adjustScore(match, team, delta, nowMs): Match`, `snapshotPeriod(match): Match`, `endHalf(match, nowMs): Match`, `addExtraTime(match, nowMs): Match`, `endGame(match, nowMs): Match` — Tasks 5-9 (`stats.ts`) and Task 11 (`undo.ts`) reference the `Match`/`Team` shapes this task's `newMatch` produces; Phase 3's `useMatch` hook will call `newMatch`/`endHalf`/`addExtraTime`/`endGame` directly.

Note: `closeOutAccrual`/`reopenAccrual` (flushing `fieldSecs`/possession `accumSec` at period boundaries) and `isLevel` are internal (non-exported) helpers within this file — only exported functions above are part of the public interface.

- [ ] **Step 1: Write the failing tests**

Create `src/logic/match.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { newMatch, adjustScore, snapshotPeriod, endHalf, addExtraTime, endGame } from './match';
import type { SavedTeam } from './types';

function savedTeam(id: string, name: string): SavedTeam {
  return {
    id, name,
    players: [
      { id: 'p1', num: 1, name: 'Keeper', starter: true, goalkeeper: true },
      { id: 'p2', num: 9, name: 'Striker', starter: true, goalkeeper: false },
      { id: 'p3', num: 12, name: 'Bench', starter: false, goalkeeper: false },
    ],
  };
}

const baseConfig = { halfLengthMin: 45, hasExtraTime: true, extraTimeLengthMin: 15, hasShootout: true };

function makeStartingMatch() {
  return newMatch({
    config: baseConfig,
    teamA: savedTeam('a', 'Alpha'), activeIdsA: ['p1', 'p2'], collapsedA: false,
    teamB: savedTeam('b', 'Beta'), activeIdsB: ['p1', 'p2', 'p3'], collapsedB: false,
    homeTeam: 'teamA',
  });
}

describe('newMatch', () => {
  it('builds each team from only the active roster ids', () => {
    const m = makeStartingMatch();
    expect(m.teamA.players.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(m.teamB.players.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });
  it('initializes match-only fields to zero/false/null on every player', () => {
    const m = makeStartingMatch();
    const p = m.teamA.players[0];
    expect(p.onField).toBe(false);
    expect(p.fieldSecs).toBe(0);
    expect(p.goals).toBe(0);
    expect(p.sentOff).toBe(false);
  });
  it('sets goalkeeperId from the active roster', () => {
    const m = makeStartingMatch();
    expect(m.teamA.goalkeeperId).toBe('p1');
  });
  it('a collapsed team gets an empty players array regardless of activeIds', () => {
    const m = newMatch({
      config: baseConfig,
      teamA: savedTeam('a', 'Alpha'), activeIdsA: ['p1'], collapsedA: true,
      teamB: savedTeam('b', 'Beta'), activeIdsB: ['p1'], collapsedB: false,
      homeTeam: 'teamA',
    });
    expect(m.teamA.collapsed).toBe(true);
    expect(m.teamA.players).toEqual([]);
    expect(m.teamA.goalkeeperId).toBeNull();
  });
  it('starts at period 1, screen game, zero score, empty log', () => {
    const m = makeStartingMatch();
    expect(m.period).toBe(1);
    expect(m.screen).toBe('game');
    expect(m.score).toEqual({ teamA: 0, teamB: 0 });
    expect(m.log).toEqual([]);
  });
});

describe('adjustScore', () => {
  it('increases score and logs the change', () => {
    const m = adjustScore(makeStartingMatch(), 'teamA', 1, 0);
    expect(m.score.teamA).toBe(1);
    expect(m.log).toHaveLength(1);
  });
  it('clamps at 0 and does not log a no-op', () => {
    const m = adjustScore(makeStartingMatch(), 'teamA', -1, 0);
    expect(m.score.teamA).toBe(0);
    expect(m.log).toHaveLength(0);
  });
});

describe('snapshotPeriod', () => {
  it('appends the current score to periodScores', () => {
    let m = makeStartingMatch();
    m = adjustScore(m, 'teamA', 2, 0);
    m = snapshotPeriod(m);
    expect(m.periodScores).toEqual([{ teamA: 2, teamB: 0 }]);
  });
});

describe('endHalf', () => {
  it('advances from period 1 to 2, resets the clock, snapshots the score', () => {
    let m = makeStartingMatch();
    m = adjustScore(m, 'teamA', 1, 0);
    m = endHalf(m, 45 * 60 * 1000);
    expect(m.period).toBe(2);
    expect(m.clock).toEqual({ elapsedSec: 0, running: false, startedAt: null });
    expect(m.periodScores).toEqual([{ teamA: 1, teamB: 0 }]);
  });
  it('is a no-op when period is not 1', () => {
    let m = makeStartingMatch();
    m = endHalf(m, 0);
    const m2 = endHalf(m, 0);
    expect(m2.period).toBe(2); // unchanged by the second call
    expect(m2.periodScores).toHaveLength(1); // no duplicate snapshot
  });
});

describe('addExtraTime', () => {
  it('advances period 2 to ET1 when hasExtraTime is configured', () => {
    let m = makeStartingMatch();
    m = endHalf(m, 0);
    m = addExtraTime(m, 0);
    expect(m.period).toBe('ET1');
  });
  it('advances ET1 to ET2', () => {
    let m = makeStartingMatch();
    m = endHalf(m, 0);
    m = addExtraTime(m, 0);
    m = addExtraTime(m, 0);
    expect(m.period).toBe('ET2');
  });
  it('is a no-op when hasExtraTime is not configured', () => {
    let m = newMatch({
      config: { ...baseConfig, hasExtraTime: false },
      teamA: savedTeam('a', 'Alpha'), activeIdsA: ['p1'], collapsedA: false,
      teamB: savedTeam('b', 'Beta'), activeIdsB: ['p1'], collapsedB: false,
      homeTeam: 'teamA',
    });
    m = endHalf(m, 0);
    const m2 = addExtraTime(m, 0);
    expect(m2.period).toBe(2);
  });
});

describe('endGame', () => {
  it('sets screen to summary, records the date, snapshots the final score', () => {
    let m = makeStartingMatch();
    m = adjustScore(m, 'teamB', 3, 0);
    m = endGame(m, 123456);
    expect(m.screen).toBe('summary');
    expect(m.date).toBe(123456);
    expect(m.periodScores).toEqual([{ teamA: 0, teamB: 3 }]);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test`
Expected: FAIL — `Cannot find module './match'`.

- [ ] **Step 3: Implement `src/logic/match.ts`**

```ts
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

function closeOutAccrual(match: Match): Match {
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
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test`
Expected: PASS — all `match.test.ts` cases green, plus every earlier test file still passing.

- [ ] **Step 5: Commit**

```bash
git add src/logic/match.ts src/logic/match.test.ts
git commit -m "Add match.ts: newMatch, adjustScore, period transitions, endGame"
```

---

### Task 5: `stats.ts` part A — player stat recording (goals, assists, shots, tackles, fouls, saves)

**Files:**
- Create: `src/logic/stats.ts`
- Test: `src/logic/stats.test.ts`

**Interfaces:**
- Consumes: `Match`, `TeamKey`, `RevEntry` from `./types`; `clone`, `appendLog`, `teamOf`, `findPlayer`, `playerTag` from `./log`; `clockElapsed`, `formatClock` from `./clock`.
- Produces: `PlayerStatField` type, `recordPlayerStat(match, team, playerId, stat, nowMs): Match` — later tasks in this file (5-9 share this same file) and Phase 3's Game screen call this directly for each stat button.

- [ ] **Step 1: Write the failing tests**

Create `src/logic/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { recordPlayerStat } from './stats';
import type { Match } from './types';

function matchWithPlayer(): Match {
  return {
    id: 'm1',
    screen: 'game',
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: false },
    teamA: {
      id: 'a', name: 'Alpha', collapsed: false, goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0,
      players: [{
        id: 'p1', num: 9, name: 'Sam', starter: true, goalkeeper: false,
        onField: true, inClock: 0, fieldSecs: 0, goals: 0, assists: 0, shotsOnGoal: 0,
        tackles: 0, foulsCommitted: 0, saves: 0, yellowCards: 0, redCards: 0, sentOff: false,
      }],
    },
    teamB: { id: 'b', name: 'Beta', collapsed: false, players: [], goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0 },
    homeTeam: 'teamA',
    period: 1,
    clock: { elapsedSec: 600, running: false, startedAt: null },
    stoppage: {},
    score: { teamA: 0, teamB: 0 },
    possession: { current: null, since: null, accumSec: { teamA: 0, teamB: 0 } },
    periodScores: [],
    log: [],
    _seq: 0,
    date: null,
  };
}

describe('recordPlayerStat', () => {
  it('increments the given stat field on the player', () => {
    const m = recordPlayerStat(matchWithPlayer(), 'teamA', 'p1', 'tackles', 0);
    expect(m.teamA.players[0].tackles).toBe(1);
  });
  it('recording a goal also increments the team score', () => {
    const m = recordPlayerStat(matchWithPlayer(), 'teamA', 'p1', 'goals', 0);
    expect(m.teamA.players[0].goals).toBe(1);
    expect(m.score.teamA).toBe(1);
  });
  it('recording a non-goal stat does not change the score', () => {
    const m = recordPlayerStat(matchWithPlayer(), 'teamA', 'p1', 'assists', 0);
    expect(m.score.teamA).toBe(0);
  });
  it('logs a descriptive entry with a stat-kind rev', () => {
    const m = recordPlayerStat(matchWithPlayer(), 'teamA', 'p1', 'shotsOnGoal', 0);
    expect(m.log).toHaveLength(1);
    expect(m.log[0].detail).toContain('#9 Sam');
    expect(m.log[0].rev).toEqual({ kind: 'stat', team: 'teamA', playerId: 'p1', fields: { shotsOnGoal: 1 }, score: 0 });
  });
  it('is a no-op when the player does not exist', () => {
    const original = matchWithPlayer();
    const m = recordPlayerStat(original, 'teamA', 'nope', 'goals', 0);
    expect(m).toBe(original);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test`
Expected: FAIL — `Cannot find module './stats'`.

- [ ] **Step 3: Implement `src/logic/stats.ts`**

```ts
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
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/stats.ts src/logic/stats.test.ts
git commit -m "Add stats.ts: recordPlayerStat (goals/assists/shots/tackles/fouls/saves)"
```

---

### Task 6: `stats.ts` part B — cards (auto-red on 2nd yellow, collapsed-team tally)

**Files:**
- Modify: `src/logic/stats.ts`
- Modify: `src/logic/stats.test.ts`

**Interfaces:**
- Produces: `recordCard(match, team, playerId, color, nowMs): Match` where `playerId: string | null` and `color: 'yellow' | 'red'`.

- [ ] **Step 1: Write the failing tests**

Add to `src/logic/stats.test.ts`:

```ts
import { recordCard } from './stats';

describe('recordCard', () => {
  it('a yellow card increments both team and player tallies', () => {
    const m = recordCard(matchWithPlayer(), 'teamA', 'p1', 'yellow', 0);
    expect(m.teamA.yellowCards).toBe(1);
    expect(m.teamA.players[0].yellowCards).toBe(1);
    expect(m.teamA.players[0].sentOff).toBe(false);
  });
  it('a direct red card sends the player off', () => {
    const m = recordCard(matchWithPlayer(), 'teamA', 'p1', 'red', 0);
    expect(m.teamA.redCards).toBe(1);
    expect(m.teamA.players[0].redCards).toBe(1);
    expect(m.teamA.players[0].sentOff).toBe(true);
  });
  it('a 2nd yellow auto-escalates to a red and sends the player off', () => {
    let m = recordCard(matchWithPlayer(), 'teamA', 'p1', 'yellow', 0);
    m = recordCard(m, 'teamA', 'p1', 'yellow', 0);
    expect(m.teamA.players[0].yellowCards).toBe(2);
    expect(m.teamA.players[0].redCards).toBe(1);
    expect(m.teamA.players[0].sentOff).toBe(true);
    expect(m.teamA.redCards).toBe(1);
    expect(m.log[m.log.length - 1].type).toBe('card_2nd_yellow');
  });
  it('a collapsed team (no player) still increments the team tally', () => {
    const collapsed = matchWithPlayer();
    collapsed.teamA.collapsed = true;
    const m = recordCard(collapsed, 'teamA', null, 'yellow', 0);
    expect(m.teamA.yellowCards).toBe(1);
    expect(m.log[0].detail).toBe('Alpha yellow card');
  });
  it('the rev entry captures enough to undo (yellow/red deltas and prior sentOff)', () => {
    const m = recordCard(matchWithPlayer(), 'teamA', 'p1', 'red', 0);
    expect(m.log[0].rev).toEqual({ kind: 'card', team: 'teamA', playerId: 'p1', yellow: 0, red: 1, sentOffPrev: false });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test`
Expected: FAIL — `recordCard` is not exported from `./stats` yet.

- [ ] **Step 3: Add `recordCard` to `src/logic/stats.ts`**

Append to the file:

```ts
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
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/stats.ts src/logic/stats.test.ts
git commit -m "Add recordCard: team+player tallying, auto-red on 2nd yellow, sentOff"
```

---

### Task 7: `stats.ts` part C — corners and offsides

**Files:**
- Modify: `src/logic/stats.ts`
- Modify: `src/logic/stats.test.ts`

**Interfaces:**
- Produces: `recordCorner(match, team, nowMs): Match`, `recordOffside(match, team, nowMs): Match`.

- [ ] **Step 1: Write the failing tests**

Add to `src/logic/stats.test.ts`:

```ts
import { recordCorner, recordOffside } from './stats';

describe('recordCorner / recordOffside', () => {
  it('recordCorner increments the team corner count and logs it', () => {
    const m = recordCorner(matchWithPlayer(), 'teamA', 0);
    expect(m.teamA.corners).toBe(1);
    expect(m.log[0].detail).toBe('Alpha corner');
    expect(m.log[0].rev).toEqual({ kind: 'corner', team: 'teamA', delta: 1 });
  });
  it('recordOffside increments the team offside count and logs it', () => {
    const m = recordOffside(matchWithPlayer(), 'teamB', 0);
    expect(m.teamB.offsides).toBe(1);
    expect(m.log[0].rev).toEqual({ kind: 'offside', team: 'teamB', delta: 1 });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test`
Expected: FAIL — `recordCorner`/`recordOffside` not exported yet.

- [ ] **Step 3: Add both functions to `src/logic/stats.ts`**

```ts
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
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/stats.ts src/logic/stats.test.ts
git commit -m "Add recordCorner/recordOffside team-level counters"
```

---

### Task 8: `stats.ts` part D — substitutions (fieldSecs accrual, sentOff exclusion)

**Files:**
- Modify: `src/logic/stats.ts`
- Modify: `src/logic/stats.test.ts`

**Interfaces:**
- Produces: `subIn(match, team, playerId, nowMs): Match`, `subOut(match, team, playerId, nowMs): Match`.

- [ ] **Step 1: Write the failing tests**

Add to `src/logic/stats.test.ts`:

```ts
import { subIn, subOut } from './stats';

function matchWithBenchedPlayer(): Match {
  const m = matchWithPlayer();
  m.teamA.players[0].onField = false;
  m.teamA.players[0].inClock = null;
  return m;
}

describe('subIn / subOut', () => {
  it('subIn puts the player onField and records inClock at the current elapsed time', () => {
    const m = subIn(matchWithBenchedPlayer(), 'teamA', 'p1', 600000);
    expect(m.teamA.players[0].onField).toBe(true);
    expect(m.teamA.players[0].inClock).toBe(600);
  });
  it('subIn is a no-op if the player is already on field', () => {
    const original = matchWithPlayer(); // p1 already onField from the fixture
    const m = subIn(original, 'teamA', 'p1', 0);
    expect(m).toBe(original);
  });
  it('subIn is a no-op for a sent-off player', () => {
    const m0 = matchWithBenchedPlayer();
    m0.teamA.players[0].sentOff = true;
    const m = subIn(m0, 'teamA', 'p1', 0);
    expect(m).toBe(m0);
  });
  it('subOut accrues fieldSecs based on the clock delta since subIn', () => {
    const m0 = matchWithPlayer(); // onField true, inClock 0, clock.elapsedSec 600
    const m = subOut(m0, 'teamA', 'p1', 600000);
    expect(m.teamA.players[0].onField).toBe(false);
    expect(m.teamA.players[0].inClock).toBeNull();
    expect(m.teamA.players[0].fieldSecs).toBe(600);
  });
  it('subOut is a no-op if the player is not on field', () => {
    const original = matchWithBenchedPlayer();
    const m = subOut(original, 'teamA', 'p1', 0);
    expect(m).toBe(original);
  });
  it('subOut logs a rev with enough to undo the accrual', () => {
    const m = subOut(matchWithPlayer(), 'teamA', 'p1', 600000);
    expect(m.log[0].rev).toEqual({ kind: 'sub', team: 'teamA', playerId: 'p1', onField: true, inClock: 0, fieldSecsDelta: 600 });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test`
Expected: FAIL — `subIn`/`subOut` not exported yet.

- [ ] **Step 3: Add both functions to `src/logic/stats.ts`**

```ts
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
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/stats.ts src/logic/stats.test.ts
git commit -m "Add subIn/subOut with fieldSecs accrual and sent-off exclusion"
```

---

### Task 9: `stats.ts` part E — possession

**Files:**
- Modify: `src/logic/stats.ts`
- Modify: `src/logic/stats.test.ts`

**Interfaces:**
- Produces: `setPossession(match, team, nowMs): Match`.

- [ ] **Step 1: Write the failing tests**

Add to `src/logic/stats.test.ts`:

```ts
import { setPossession } from './stats';

describe('setPossession', () => {
  it('sets current possession and since when none was set before', () => {
    const m = setPossession(matchWithPlayer(), 'teamA', 600000);
    expect(m.possession.current).toBe('teamA');
    expect(m.possession.since).toBe(600);
    expect(m.possession.accumSec).toEqual({ teamA: 0, teamB: 0 });
  });
  it('accrues time to the previous holder before switching', () => {
    let m = matchWithPlayer();
    m.possession = { current: 'teamA', since: 100, accumSec: { teamA: 0, teamB: 0 } };
    m = setPossession(m, 'teamB', 400000); // elapsedSec at nowMs=400000 is still 600 per fixture clock (stopped)
    expect(m.possession.accumSec.teamA).toBe(500); // 600 - 100
    expect(m.possession.current).toBe('teamB');
    expect(m.possession.since).toBe(600);
  });
  it('is a no-op if already the current holder', () => {
    const m0 = matchWithPlayer();
    m0.possession.current = 'teamA';
    const m = setPossession(m0, 'teamA', 0);
    expect(m).toBe(m0);
  });
  it('the rev entry captures the previous holder and the accrual delta for undo', () => {
    let m = matchWithPlayer();
    m.possession = { current: 'teamA', since: 100, accumSec: { teamA: 0, teamB: 0 } };
    m = setPossession(m, 'teamB', 0);
    expect(m.log[0].rev).toEqual({ kind: 'possession', prev: 'teamA', accumSecDelta: { teamA: 500 } });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test`
Expected: FAIL — `setPossession` not exported yet.

- [ ] **Step 3: Add `setPossession` to `src/logic/stats.ts`**

```ts
export function setPossession(match: Match, team: TeamKey, nowMs: number): Match {
  if (match.possession.current === team) return match;
  let m = clone(match);
  const elapsed = clockElapsed(m.clock, nowMs);
  const prev = m.possession.current;
  const accumSecDelta: Partial<Record<TeamKey, number>> = {};
  if (prev && m.possession.since != null) {
    const delta = elapsed - m.possession.since;
    m.possession.accumSec[prev] += delta;
    accumSecDelta[prev] = delta;
  }
  m.possession.current = team;
  m.possession.since = elapsed;
  const rev: RevEntry = { kind: 'possession', prev, accumSecDelta };
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
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test`
Expected: PASS — every test in `stats.test.ts` (Tasks 5-9 combined) green.

- [ ] **Step 5: Commit**

```bash
git add src/logic/stats.ts src/logic/stats.test.ts
git commit -m "Add setPossession with time-accrual tracking"
```

---

### Task 10: `shootout.ts` — penalty shootout state machine

**Files:**
- Create: `src/logic/shootout.ts`
- Test: `src/logic/shootout.test.ts`

**Interfaces:**
- Consumes: `Match`, `TeamKey`, `RevEntry` from `./types`; `clone`, `appendLog`, `teamOf` from `./log`; `clockElapsed`, `formatClock` from `./clock`.
- Produces: `startShootout(match, nowMs): Match`, `recordAttempt(match, team, scored, nowMs): Match`.

- [ ] **Step 1: Write the failing tests**

Create `src/logic/shootout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { startShootout, recordAttempt } from './shootout';
import type { Match } from './types';

function baseMatch(): Match {
  return {
    id: 'm1',
    screen: 'game',
    config: { halfLengthMin: 45, hasExtraTime: true, extraTimeLengthMin: 15, hasShootout: true },
    teamA: { id: 'a', name: 'Alpha', collapsed: false, players: [], goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0 },
    teamB: { id: 'b', name: 'Beta', collapsed: false, players: [], goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0 },
    homeTeam: 'teamA',
    period: 'ET2',
    clock: { elapsedSec: 0, running: false, startedAt: null },
    stoppage: {},
    score: { teamA: 1, teamB: 1 },
    possession: { current: null, since: null, accumSec: { teamA: 0, teamB: 0 } },
    periodScores: [],
    log: [],
    _seq: 0,
    date: null,
  };
}

function playRound(m: Match, resultsA: boolean, resultsB: boolean): Match {
  m = recordAttempt(m, 'teamA', resultsA, 0);
  if (m.shootout!.winner) return m;
  return recordAttempt(m, 'teamB', resultsB, 0);
}

describe('startShootout', () => {
  it('sets screen and period to shootout with empty attempts', () => {
    const m = startShootout(baseMatch(), 0);
    expect(m.screen).toBe('shootout');
    expect(m.period).toBe('shootout');
    expect(m.shootout).toEqual({ attempts: [], winner: null });
  });
});

describe('recordAttempt', () => {
  it('appends an attempt and does not touch match score', () => {
    let m = startShootout(baseMatch(), 0);
    m = recordAttempt(m, 'teamA', true, 0);
    expect(m.shootout!.attempts).toEqual([{ team: 'teamA', scored: true }]);
    expect(m.score).toEqual({ teamA: 1, teamB: 1 });
  });
  it('declares a winner as soon as the outcome is mathematically certain before round 5', () => {
    let m = startShootout(baseMatch(), 0);
    m = playRound(m, true, false);   // A:1 B:0
    m = playRound(m, true, false);   // A:2 B:0
    m = playRound(m, true, false);   // A:3 B:0 -- B can get at most 2 more (2 kicks left) so A has won
    expect(m.shootout!.winner).toBe('teamA');
  });
  it('goes the full 5 rounds when the outcome stays undecided that long', () => {
    let m = startShootout(baseMatch(), 0);
    m = playRound(m, true, true);
    m = playRound(m, true, true);
    m = playRound(m, false, true);
    m = playRound(m, true, false);
    m = playRound(m, false, false); // 3-3 after 5 each -- still tied
    expect(m.shootout!.winner).toBeNull();
    expect(m.shootout!.attempts).toHaveLength(10);
  });
  it('resolves in sudden death as soon as one team scores and the other misses', () => {
    let m = startShootout(baseMatch(), 0);
    for (let i = 0; i < 5; i++) m = playRound(m, true, true); // 5-5 tied
    expect(m.shootout!.winner).toBeNull();
    m = playRound(m, true, false); // sudden-death round 6: A scores, B misses
    expect(m.shootout!.winner).toBe('teamA');
  });
  it('is a no-op once a winner is already decided', () => {
    let m = startShootout(baseMatch(), 0);
    m = playRound(m, true, false);
    m = playRound(m, true, false);
    m = playRound(m, true, false); // decided for teamA
    const decided = m;
    m = recordAttempt(m, 'teamB', true, 0);
    expect(m).toBe(decided);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test`
Expected: FAIL — `Cannot find module './shootout'`.

- [ ] **Step 3: Implement `src/logic/shootout.ts`**

```ts
import type { Match, TeamKey } from './types';
import { clone, appendLog, teamOf } from './log';
import { clockElapsed, formatClock } from './clock';

export function startShootout(match: Match, nowMs: number): Match {
  let m = clone(match);
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
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/shootout.ts src/logic/shootout.test.ts
git commit -m "Add shootout.ts: penalty shootout state machine"
```

---

### Task 11: `undo.ts` — reversible undo log

**Files:**
- Create: `src/logic/undo.ts`
- Test: `src/logic/undo.test.ts`

**Interfaces:**
- Consumes: `Match`, `RevEntry` from `./types`; `clone`, `teamOf`, `findPlayer` from `./log`.
- Produces: `undo(match: Match): Match`.

- [ ] **Step 1: Write the failing tests**

Create `src/logic/undo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { undo } from './undo';
import { adjustScore } from './match';
import { recordPlayerStat, recordCard, subOut, setPossession, recordCorner, recordOffside } from './stats';
import { recordStoppage } from './clock';
import { recordAttempt, startShootout } from './shootout';
import type { Match } from './types';

function matchWithPlayer(): Match {
  return {
    id: 'm1',
    screen: 'game',
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: true },
    teamA: {
      id: 'a', name: 'Alpha', collapsed: false, goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0,
      players: [{
        id: 'p1', num: 9, name: 'Sam', starter: true, goalkeeper: false,
        onField: true, inClock: 0, fieldSecs: 0, goals: 0, assists: 0, shotsOnGoal: 0,
        tackles: 0, foulsCommitted: 0, saves: 0, yellowCards: 0, redCards: 0, sentOff: false,
      }],
    },
    teamB: { id: 'b', name: 'Beta', collapsed: false, players: [], goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0 },
    homeTeam: 'teamA',
    period: 1,
    clock: { elapsedSec: 600, running: false, startedAt: null },
    stoppage: {},
    score: { teamA: 0, teamB: 0 },
    possession: { current: null, since: null, accumSec: { teamA: 0, teamB: 0 } },
    periodScores: [],
    log: [],
    _seq: 0,
    date: null,
  };
}

describe('undo', () => {
  it('is a no-op on an empty log', () => {
    const m0 = matchWithPlayer();
    expect(undo(m0)).toBe(m0);
  });

  it('reverses a score adjustment', () => {
    const m0 = matchWithPlayer();
    const m1 = adjustScore(m0, 'teamA', 2, 0);
    const m2 = undo(m1);
    expect(m2.score.teamA).toBe(0);
    expect(m2.log).toHaveLength(0);
  });

  it('reverses a player stat (including a goal touching score)', () => {
    const m0 = matchWithPlayer();
    const m1 = recordPlayerStat(m0, 'teamA', 'p1', 'goals', 0);
    const m2 = undo(m1);
    expect(m2.teamA.players[0].goals).toBe(0);
    expect(m2.score.teamA).toBe(0);
  });

  it('reverses a card, including restoring sentOff to its prior value', () => {
    const m0 = matchWithPlayer();
    const m1 = recordCard(m0, 'teamA', 'p1', 'red', 0);
    const m2 = undo(m1);
    expect(m2.teamA.redCards).toBe(0);
    expect(m2.teamA.players[0].redCards).toBe(0);
    expect(m2.teamA.players[0].sentOff).toBe(false);
  });

  it('reverses an auto-red 2nd yellow back to a single yellow, not sent off', () => {
    let m = recordCard(matchWithPlayer(), 'teamA', 'p1', 'yellow', 0);
    m = recordCard(m, 'teamA', 'p1', 'yellow', 0); // 2nd yellow, auto-red
    m = undo(m); // undo only reverses the LAST log entry (the 2nd-yellow-plus-auto-red action)
    expect(m.teamA.players[0].yellowCards).toBe(1);
    expect(m.teamA.players[0].redCards).toBe(0);
    expect(m.teamA.players[0].sentOff).toBe(false);
  });

  it('reverses a substitution (onField, inClock, fieldSecs)', () => {
    const m0 = matchWithPlayer(); // onField true, inClock 0
    const m1 = subOut(m0, 'teamA', 'p1', 600000); // elapsedSec 600, accrues 600 fieldSecs
    const m2 = undo(m1);
    expect(m2.teamA.players[0].onField).toBe(true);
    expect(m2.teamA.players[0].inClock).toBe(0);
    expect(m2.teamA.players[0].fieldSecs).toBe(0);
  });

  it('reverses possession accrual and the prior holder', () => {
    let m = matchWithPlayer();
    m.possession = { current: 'teamA', since: 100, accumSec: { teamA: 0, teamB: 0 } };
    m = setPossession(m, 'teamB', 0); // elapsedSec 600, accrues 500 to teamA
    m = undo(m);
    expect(m.possession.current).toBe('teamA');
    expect(m.possession.accumSec.teamA).toBe(0);
  });

  it('reverses a corner and an offside', () => {
    let m = recordCorner(matchWithPlayer(), 'teamA', 0);
    m = undo(m);
    expect(m.teamA.corners).toBe(0);

    m = recordOffside(m, 'teamB', 0);
    m = undo(m);
    expect(m.teamB.offsides).toBe(0);
  });

  it('reverses a stoppage-time entry back to its previous value (undefined if unset)', () => {
    let m = recordStoppage(matchWithPlayer(), 240, 0);
    m = undo(m);
    expect(m.stoppage[1]).toBeUndefined();
  });

  it('reverses a shootout attempt, clearing a decided winner if the popped attempt decided it', () => {
    // detectWinner only evaluates once both sides have taken equal kicks, so a decision
    // needs 3 full A-then-B rounds at minimum (A scores, B misses, every round) -- see
    // shootout.test.ts's "declares a winner..." case for the same 6-attempt shape.
    let m = startShootout(matchWithPlayer(), 0);
    m = recordAttempt(m, 'teamA', true, 0);
    m = recordAttempt(m, 'teamB', false, 0);
    m = recordAttempt(m, 'teamA', true, 0);
    m = recordAttempt(m, 'teamB', false, 0);
    m = recordAttempt(m, 'teamA', true, 0);
    m = recordAttempt(m, 'teamB', false, 0); // 6th attempt (teamB's 3rd miss) is what decides it
    expect(m.shootout!.winner).toBe('teamA');
    m = undo(m);
    expect(m.shootout!.attempts).toHaveLength(5);
    expect(m.shootout!.winner).toBeNull();
  });

  it('a sequence of several actions undone in reverse restores the original state', () => {
    const m0 = matchWithPlayer();
    let m = adjustScore(m0, 'teamA', 1, 0);
    m = recordPlayerStat(m, 'teamA', 'p1', 'tackles', 0);
    m = recordCorner(m, 'teamB', 0);
    m = undo(m);
    m = undo(m);
    m = undo(m);
    expect(m.score).toEqual(m0.score);
    expect(m.teamA.players[0].tackles).toBe(0);
    expect(m.teamB.corners).toBe(0);
    expect(m.log).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test`
Expected: FAIL — `Cannot find module './undo'`.

- [ ] **Step 3: Implement `src/logic/undo.ts`**

```ts
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
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/undo.ts src/logic/undo.test.ts
git commit -m "Add undo.ts: reversible undo covering every rev.kind"
```

---

### Task 12: `persistence.ts` part A — serialize, SavedTeam/history CRUD, isResumable

**Files:**
- Create: `src/logic/persistence.ts`
- Test: `src/logic/persistence.test.ts`

**Interfaces:**
- Consumes: `Match`, `SavedTeam` from `./types`.
- Produces: `serialize(value: unknown): string`, `deserialize<T>(str: string | null): T | null`, `isResumable(match: Match | null): boolean`, `upsertTeam(teams, team): SavedTeam[]`, `removeTeam(teams, id): SavedTeam[]`, `upsertHistory(history, match): Match[]`, `removeFromHistory(history, id): Match[]`.

- [ ] **Step 1: Write the failing tests**

Create `src/logic/persistence.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { serialize, deserialize, isResumable, upsertTeam, removeTeam, upsertHistory, removeFromHistory } from './persistence';
import type { Match, SavedTeam } from './types';

describe('serialize / deserialize', () => {
  it('round-trips a plain object', () => {
    const obj = { a: 1, b: ['x', 'y'] };
    expect(deserialize(serialize(obj))).toEqual(obj);
  });
  it('deserialize returns null for null input', () => {
    expect(deserialize(null)).toBeNull();
  });
  it('deserialize returns null for malformed JSON instead of throwing', () => {
    expect(deserialize('{not json')).toBeNull();
  });
});

describe('isResumable', () => {
  it('true only when screen is game', () => {
    // as unknown as Match: isResumable only ever reads `.screen`, so these stubs are deliberately partial.
    expect(isResumable({ screen: 'game' } as unknown as Match)).toBe(true);
    expect(isResumable({ screen: 'summary' } as unknown as Match)).toBe(false);
    expect(isResumable({ screen: 'shootout' } as unknown as Match)).toBe(false);
    expect(isResumable(null)).toBe(false);
  });
});

function team(id: string, name: string): SavedTeam {
  return { id, name, players: [] };
}

describe('upsertTeam / removeTeam', () => {
  it('adds a new team', () => {
    const teams = upsertTeam([], team('a', 'Alpha'));
    expect(teams).toHaveLength(1);
  });
  it('updates an existing team by id instead of duplicating', () => {
    let teams = upsertTeam([], team('a', 'Alpha'));
    teams = upsertTeam(teams, team('a', 'Alpha United'));
    expect(teams).toHaveLength(1);
    expect(teams[0].name).toBe('Alpha United');
  });
  it('removeTeam filters out the given id', () => {
    let teams = upsertTeam([], team('a', 'Alpha'));
    teams = upsertTeam(teams, team('b', 'Beta'));
    teams = removeTeam(teams, 'a');
    expect(teams.map((t) => t.id)).toEqual(['b']);
  });
});

function match(id: string, screen: Match['screen'] = 'summary'): Match {
  // history CRUD (and isResumable/mergeBackup) only ever read `.id` and `.screen` in these tests;
  // `as unknown as Match` sidesteps TS's type-overlap check for this deliberately partial stub.
  return { id, screen } as unknown as Match;
}

describe('upsertHistory / removeFromHistory', () => {
  it('adds a new match to history', () => {
    const history = upsertHistory([], match('m1'));
    expect(history).toHaveLength(1);
  });
  it('updates an existing history entry by id instead of duplicating', () => {
    let history = upsertHistory([], match('m1'));
    history = upsertHistory(history, match('m1'));
    expect(history).toHaveLength(1);
  });
  it('removeFromHistory filters out the given id', () => {
    let history = upsertHistory([], match('m1'));
    history = upsertHistory(history, match('m2'));
    history = removeFromHistory(history, 'm1');
    expect(history.map((m) => m.id)).toEqual(['m2']);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test`
Expected: FAIL — `Cannot find module './persistence'`.

- [ ] **Step 3: Implement `src/logic/persistence.ts`**

```ts
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
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/persistence.ts src/logic/persistence.test.ts
git commit -m "Add persistence.ts: serialize/deserialize, SavedTeam and history CRUD, isResumable"
```

---

### Task 13: `persistence.ts` part B — backup export/import (buildBackup, validateBackup, mergeBackup)

**Files:**
- Modify: `src/logic/persistence.ts`
- Modify: `src/logic/persistence.test.ts`

**Interfaces:**
- Consumes: `clone` from `./log` (new import this task adds to `persistence.ts`).
- Produces: `AppState`, `Backup`, `ValidateResult` types; `buildBackup(state, nowMs): Backup`, `validateBackup(obj: unknown): ValidateResult`, `mergeBackup(state, backup): { state: AppState; summary: MergeSummary }` — Phase 3's Setup screen (export/import buttons) calls these directly.

- [ ] **Step 1: Write the failing tests**

Add to `src/logic/persistence.test.ts`:

```ts
import { buildBackup, validateBackup, mergeBackup } from './persistence';
import type { AppState } from './persistence';

function emptyState(): AppState {
  return { teams: [], history: [], match: null };
}

describe('buildBackup', () => {
  it('captures app id, format version, timestamp, and a deep copy of state', () => {
    const state: AppState = { teams: [team('a', 'Alpha')], history: [], match: null };
    const backup = buildBackup(state, 1700000000000);
    expect(backup.app).toBe('soccerscore');
    expect(backup.formatVersion).toBe(1);
    expect(backup.exportedAt).toBe(new Date(1700000000000).toISOString());
    expect(backup.teams).toEqual(state.teams);
    expect(backup.teams).not.toBe(state.teams); // deep copy, not same reference
  });
});

describe('validateBackup', () => {
  it('rejects a non-object', () => {
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup('nope').ok).toBe(false);
  });
  it("rejects an object missing app: 'soccerscore'", () => {
    expect(validateBackup({ app: 'other' }).ok).toBe(false);
  });
  it('rejects a backup from a newer format version', () => {
    const result = validateBackup({ app: 'soccerscore', formatVersion: 2 });
    expect(result.ok).toBe(false);
  });
  it('accepts a valid backup and defaults missing arrays to empty', () => {
    const result = validateBackup({ app: 'soccerscore', formatVersion: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.teams).toEqual([]);
      expect(result.backup.history).toEqual([]);
      expect(result.backup.match).toBeNull();
    }
  });
});

describe('mergeBackup', () => {
  it('adds new teams and counts them as added', () => {
    const { state, summary } = mergeBackup(emptyState(), { teams: [team('a', 'Alpha')], history: [], match: null });
    expect(state.teams).toHaveLength(1);
    expect(summary.teamsAdded).toBe(1);
    expect(summary.teamsUpdated).toBe(0);
  });
  it('updates existing teams by id and counts them as updated', () => {
    const existing: AppState = { teams: [team('a', 'Alpha')], history: [], match: null };
    const { state, summary } = mergeBackup(existing, { teams: [team('a', 'Alpha United')], history: [], match: null });
    expect(state.teams[0].name).toBe('Alpha United');
    expect(summary.teamsUpdated).toBe(1);
    expect(summary.teamsAdded).toBe(0);
  });
  it('adds new history entries and counts them as added', () => {
    const { state, summary } = mergeBackup(emptyState(), { teams: [], history: [match('m1')], match: null });
    expect(state.history).toHaveLength(1);
    expect(summary.gamesAdded).toBe(1);
  });
  it('restores a backed-up in-progress match when there is no current one', () => {
    const backupMatch = match('m1', 'game');
    const { state, summary } = mergeBackup(emptyState(), { teams: [], history: [], match: backupMatch });
    expect(state.match).toEqual(backupMatch);
    expect(summary.matchRestored).toBe(true);
    expect(summary.matchSkipped).toBe(false);
  });
  it('skips restoring a backed-up match if one is already in progress', () => {
    const current = match('current', 'game');
    const backupMatch = match('m1', 'game');
    const existing: AppState = { teams: [], history: [], match: current };
    const { state, summary } = mergeBackup(existing, { teams: [], history: [], match: backupMatch });
    expect(state.match).toBe(current);
    expect(summary.matchSkipped).toBe(true);
    expect(summary.matchRestored).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test`
Expected: FAIL — `buildBackup`/`validateBackup`/`mergeBackup`/`AppState` not exported yet.

- [ ] **Step 3: Add to `src/logic/persistence.ts`**

Add `import { clone } from './log';` to the top of the file, alongside the existing `import type { Match, SavedTeam } from './types';` line, then add:

```ts
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
  for (const m of backup.history) {
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
      match = backup.match;
      matchRestored = true;
    }
  }

  return {
    state: { teams, history, match },
    summary: { teamsAdded, teamsUpdated, gamesAdded, gamesUpdated, matchRestored, matchSkipped },
  };
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test`
Expected: PASS — every test file in `src/logic/` green (Tasks 1-13 combined).

- [ ] **Step 5: Run the full verification suite**

```bash
npm run lint
npm run build
npm run test
```

Expected: all three pass with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/logic/persistence.ts src/logic/persistence.test.ts
git commit -m "Add backup export/import: buildBackup, validateBackup, mergeBackup"
```

---

## Self-Review Notes

- **Spec coverage:** every module in the design doc's Repo Layout has a task (`types.ts` → Task 1, `clock.ts` extensions → Task 3, `match.ts` → Task 4, `stats.ts` → Tasks 5-9, `shootout.ts` → Task 10, `undo.ts` → Task 11, `persistence.ts` → Tasks 12-13). The one addition beyond the design doc — `log.ts` (Task 2) — is called out explicitly in this plan's Architecture section as a circular-dependency fix, not silent scope creep. The `possession.since`/`ClockState`/`MatchConfig`/`ShootoutState` helper types weren't spelled out individually in the design doc's inline `Match` sketch but are direct, necessary refinements of what the design doc's prose described (e.g. "accrues by the elapsed-time delta since possession last changed" requires a `since` field, analogous to `Player.inClock`).
- **Placeholder scan:** no TBD/TODO; every step has complete, runnable code.
- **Type consistency:** `RevEntry`'s `kind` values (Task 1) match exactly what `undo.ts`'s `applyRev` (Task 11) switches on, and every mutating function across Tasks 3-10 produces exactly one of those `kind` values. `PlayerStatField`, `TeamKey`, `Period` names are used identically across every task that references them.
- **Task ordering:** Tasks are ordered by dependency (types → shared helpers → clock → match → stats → shootout → undo → persistence) so each task's implementer only ever needs modules already built by an earlier, completed task.
