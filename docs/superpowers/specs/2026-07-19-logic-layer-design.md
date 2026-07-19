# SoccerScore Logic Layer — Design

Date: 2026-07-19

## Overview

This is Phase 2 of 4 for SoccerScore (see `docs/superpowers/specs/2026-07-18-soccerscore-design.md` for the full app design). Phase 1 (scaffolding & tooling) is complete and merged. This phase builds the entire pure, framework-free game-logic layer under `src/logic/` — the types, state transitions, and persistence that Phase 3 (React UI) will consume via a `useMatch` hook. No React, no DOM, no components in this phase.

## Goals

- Define the complete data model: `Match`, `Team`, `Player`, plus a `SavedTeam`/`SavedPlayer` roster library distinct from in-match state (a gap in the original app design doc, resolved here).
- Implement every state transition as a pure function: `(match, ...args, nowMs) => Match`, returning a new object via `structuredClone`, never mutating in place — same pattern as basketballscore.
- Cover clock/period/stoppage-time/extra-time/shootout logic, goal/assist/shot/tackle/foul/save/corner/offside/card recording, free substitution with time-on-field accrual, possession time accrual, a reversible undo log, and `localStorage`-ready persistence (serialize/deserialize, backup export/import, saved-team and match-history CRUD).
- Build all of it TDD-first with Vitest: every function gets its failing test written before its implementation.

## Explicitly Out of Scope (this phase)

- The `useMatch` React hook (`useReducer` + `localStorage` wiring) — deferred to Phase 3, so this phase stays 100% framework-free and testable without a DOM.
- Any UI/components/screens.
- Toggling a team's collapsed/expanded state mid-match (already out of scope per the app design doc).
- Sub-limit enforcement (already out of scope — free re-entry, no cap).

## Repo Layout (additions this phase)

```
src/logic/
  types.ts          # Match, Team, Player, SavedTeam, SavedPlayer, LogEntry, RevEntry, TeamKey, Period
  clock.ts           # (extends existing formatClock/parseClock) elapsed computation, start/stop, stoppage, period transitions
  clock.test.ts
  match.ts           # newMatch (from SavedTeams + active player selection), adjustScore, snapshotPeriod, endGame
  match.test.ts
  stats.ts           # recordGoal/Assist/ShotOnGoal/Tackle/Foul/Save/Corner/Offside, recordCard, subIn/subOut, setPossession
  stats.test.ts
  shootout.ts        # startShootout, recordAttempt, winner detection
  shootout.test.ts
  undo.ts            # undo(match), one branch per rev.kind
  undo.test.ts
  persistence.ts     # serialize/deserialize, SavedTeam CRUD, history CRUD, buildBackup/validateBackup/mergeBackup, isResumable
  persistence.test.ts
```

## Data Model

```ts
type TeamKey = 'teamA' | 'teamB';
type Period = 1 | 2 | 'ET1' | 'ET2' | 'shootout';

interface SavedPlayer {
  id: string;
  num: number;
  name: string;
  starter: boolean;
  goalkeeper: boolean;
}

interface SavedTeam {
  id: string;
  name: string;
  players: SavedPlayer[];
}

interface Player extends SavedPlayer {
  onField: boolean;
  inClock: number | null;      // elapsedSec when subbed in, for fieldSecs accrual
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

interface Team {
  id: string;
  name: string;
  collapsed: boolean;          // true = light tracking only (score/cards/corners), no roster
  players: Player[];
  goalkeeperId: string | null;
  corners: number;
  offsides: number;
  yellowCards: number;         // team-level tally; authoritative when collapsed, else derived by summing players
  redCards: number;
}

interface Match {
  id: string;
  screen: 'game' | 'shootout' | 'summary';
  config: {
    halfLengthMin: number;
    hasExtraTime: boolean;
    extraTimeLengthMin: number;
    hasShootout: boolean;
  };
  teamA: Team;
  teamB: Team;
  homeTeam: TeamKey;
  period: Period;
  clock: { elapsedSec: number; running: boolean; startedAt: number | null };
  stoppage: Partial<Record<Period, number>>;  // added seconds, set once announced per period
  score: Record<TeamKey, number>;
  possession: {
    current: TeamKey | null;
    accumSec: Record<TeamKey, number>;        // same accrual pattern as player fieldSecs
  };
  periodScores: Record<TeamKey, number>[];
  shootout?: {
    attempts: { team: TeamKey; scored: boolean }[];
    winner: TeamKey | null;
  };
  log: LogEntry[];
  _seq: number;
  date: number | null;   // set on endGame, for History sorting
}

interface LogEntry {
  id: number;
  period: Period;
  clockText: string;
  team: TeamKey | null;
  playerId: string | null;
  type: string;
  detail: string;
  rev: RevEntry | null;
}

type RevEntry =
  | { kind: 'score'; team: TeamKey; score: number }
  | { kind: 'stat'; team: TeamKey; playerId: string | null; fields: Record<string, number>; score: number }
  | { kind: 'card'; team: TeamKey; playerId: string | null; yellow: number; red: number; sentOffPrev: boolean }
  | { kind: 'sub'; team: TeamKey; playerId: string; onField: boolean; inClock: number | null; fieldSecsDelta: number }
  | { kind: 'possession'; prev: TeamKey | null; accumSecDelta: Partial<Record<TeamKey, number>> }
  | { kind: 'corner' | 'offside'; team: TeamKey; delta: number }
  | { kind: 'stoppage'; period: Period; prev: number | undefined }
  | { kind: 'shootoutAttempt' };
```

`newMatch({ config, teamA: SavedTeam, activeIdsA, teamB: SavedTeam, activeIdsB, homeTeam }, nowMs)` builds each `Team.players` from the `SavedTeam`'s roster filtered to `activeIdsA`/`activeIdsB`, extending each `SavedPlayer` with the match-only fields (`onField: false`, `fieldSecs: 0`, all stat counters `0`, `sentOff: false`) — the same shape-extension pattern as basketballscore's `emptyMyStats()`.

## Key Behaviors

**Clock.** `elapsedSec` is computed from a `startedAt` timestamp (`elapsed = now - startedAt`), never a live-ticking stored value — survives tab backgrounding without drift, same technique as basketballscore's `clockRemaining`. Reaching the regulation length does not auto-stop the clock. **Stoppage time** is a manual "+N seconds" entry per period once the referee announces it, stored in `stoppage[period]`; recording it a second time for the same period overwrites (with an undo `rev.kind: 'stoppage'` capturing the previous value, `undefined` if it was unset).

**Period transitions.** `endHalf(match, nowMs)`: stops the clock, snapshots `periodScores`, closes out `fieldSecs`/possession accrual for every player/team, advances `period` (`1 → 2`, or `2 → 'ET1'` if tied + `hasExtraTime`, or `2 → 'shootout'` if tied + no extra time but `hasShootout`, or `2 →` game effectively over otherwise), resets the clock to `0` for the new period. `addExtraTime` is a distinct explicit action (not automatic) callable only when regulation just ended level and `hasExtraTime` is configured. If still level after extra time and `hasShootout`, the caller transitions `screen: 'shootout'` explicitly (not a period value change).

**Substitutions.** Free/unlimited, re-entry allowed. `subIn`/`subOut` accrue `fieldSecs` via `elapsedSec - inClock` at sub-out time, mirroring basketballscore's `courtSecs`/`inClock` pattern exactly. Sent-off players (`sentOff: true`) cannot be `subIn`'d.

**Possession.** `setPossession(match, team, nowMs)` — a toggle, not a repeatable stat button. `accumSec[team]` accrues by the elapsed-time delta since possession last changed, using the same clock-delta accrual math as `fieldSecs`. Closed out (flushed) at every period transition the same way on-field time is.

**Cards.** `recordCard(match, team, playerId | null, color, nowMs)`: always increments `Team.yellowCards`/`redCards`. If `playerId` is provided (expanded team), also increments that `Player`'s counts. If this is the player's 2nd yellow, automatically also records a red card and sets `sentOff: true` — this auto-red detection is only possible with a `playerId` (collapsed teams have no per-player history, so every red there is recorded directly, never auto-derived).

**Shootout.** `startShootout(match, nowMs)` sets both `screen: 'shootout'` and `period: 'shootout'` (so every `LogEntry` logged during the shootout consistently reports its period from `match.period`, same as every other action) and initializes `shootout: { attempts: [], winner: null }`. `recordAttempt(match, team, scored, nowMs)` appends to `attempts` and re-evaluates: after both teams have taken 5 attempts, if scores differ, set `winner`; if tied, continue in alternating sudden-death pairs, checking after each pair. Does not modify `score`.

**Undo.** Every mutating function above pushes a `LogEntry` with a `rev` descriptor as its last step. `undo(match)` pops the last `LogEntry` and reverses state based on `rev.kind` — one `switch` branch per kind listed in the `RevEntry` union above. Any new mutating function added later must extend both the union and the `undo` switch, or it silently won't be undoable (same discipline note as basketballscore's `undo()`).

**Persistence.** Three independent `localStorage`-serializable pieces, mirroring basketballscore's key structure: a `SavedTeam[]` roster library (CRUD via `upsertTeam`/`removeTeam`, independent of any match), a `Match[]` history of completed matches, and the current in-progress `Match | null`. `serialize`/`deserialize` are thin `JSON.stringify`/`try-catch JSON.parse` wrappers. `buildBackup(state, nowMs)`/`validateBackup(obj)`/`mergeBackup(state, backup)` cover JSON export/import of all three together, following basketballscore's add-vs-update-count merge semantics. `isResumable(match)` is `match?.screen === 'game'`.

## Testing

TDD throughout — write the failing Vitest test before each function's implementation, extending the pattern already established for `formatClock`/`parseClock` in Phase 1. Test files co-located as `*.test.ts` next to their module.

- **`match.test.ts`**: `newMatch` builds correct `Team.players` from a `SavedTeam` + active-player filtering (including omitting inactive roster players); `adjustScore` clamps at 0 and logs a no-op-free entry; `snapshotPeriod`/`endGame` produce correct `periodScores`/`date`.
- **`clock.test.ts`** (extended): elapsed-time computation under running/stopped states; stoppage-time entry and overwrite; `endHalf` period advancement logic for all four transition cases (next half / extra time / shootout / game-effectively-over); `addExtraTime` only callable when eligible.
- **`stats.test.ts`**: every recorder's happy path; the 2nd-yellow-auto-red rule (including that a collapsed team's red is never auto-derived); collapsed vs. expanded card tallying; `subIn`/`subOut` `fieldSecs` accrual math including the sent-off exclusion; `setPossession` accrual math including flush-on-period-transition.
- **`shootout.test.ts`**: best-of-5 winner detection when scores differ before round 5 completes; sudden-death continuation and resolution when tied after 5; `attempts` never affects `score`.
- **`undo.test.ts`**: every `rev.kind` reverses correctly in isolation; a multi-step sequence (record several different stat types, then undo them all in reverse order) restores the exact pre-recording state.
- **`persistence.test.ts`**: serialize/deserialize round-trip including malformed-JSON handling; `buildBackup`/`validateBackup`/`mergeBackup` add-vs-update counts for teams/history/in-progress match; `isResumable` for each `screen` value.

## Self-Review Notes

- **Spec coverage:** every section of the app design doc's "Data Model", "Key Behaviors", and the two gaps resolved in brainstorming (SavedTeam library, useMatch deferred to Phase 3) has a corresponding module/task here.
- **Placeholder scan:** no TBD/TODO; every type and behavior is fully specified.
- **Type consistency:** `RevEntry`'s `kind` values match exactly what "Undo" describes reversing; `SavedPlayer`/`Player` extension relationship matches what `newMatch` is described as doing.
