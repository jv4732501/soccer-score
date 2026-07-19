# Soccer Score — Design

Date: 2026-07-18

## Overview

SoccerScore is a single-page soccer/football match scorer, sibling to `basketballscore` but built with React instead of vanilla JS. It runs entirely client-side (no backend), persists to `localStorage`, and is hosted as a static site on GitHub Pages. Unlike basketball's zero-build-step philosophy, this project accepts a Vite build step in exchange for React + TypeScript ergonomics.

## Goals

- Track a live soccer match: running clock, score, goals, assists, shots on goal, tackles, fouls committed, cards (yellow/red), corners, offsides, goalkeeper saves, substitutions, time on field per player, team possession time, and stoppage/added time.
- Support both full detailed tracking and "light" tracking (score/cards/corners only, no roster) per team, since the scorekeeper won't always have the opponent's roster.
- Support knockout-style matches: extra time periods and a penalty shootout when regulation ends level.
- Ship with a pure, unit-tested game-logic layer (Vitest, TDD-first) and a Playwright visual regression suite, deployed automatically to GitHub Pages via GitHub Actions.

## Architecture & Tooling

- **Vite + React + TypeScript** (`npm create vite@latest -- --template react-ts`).
- **Vitest** for logic/unit tests, co-located as `*.test.ts` next to the modules they test. Development follows **TDD**: write the failing test for a logic function first, then implement it.
- **React Testing Library** for the small number of component-level tests where a pure-function test isn't sufficient (e.g. "tapping Goal updates the visible score").
- **Playwright** for visual regression: screenshots of key screens/states, run against `vite preview`.
- **GitHub Actions**: on push to `main`, install deps, run `vitest run`, `vite build`, `playwright test` against the built preview, then deploy `dist/` via `actions/deploy-pages`. A PR-triggered workflow runs the same checks without deploying.
- No backend, no database — everything lives in `localStorage`, same as basketballscore. Export/import JSON backup, same as basketballscore.

## Repo Layout

```
src/
  logic/         # pure functions + types, framework-free, unit-tested directly
    match.ts     # Match/Team/Player types, newMatch, clone helpers
    clock.ts     # elapsedSec computation, stoppage time, period transitions
    stats.ts     # recordGoal/Assist/Shot/Tackle/Foul/Save/Card, subIn/subOut
    shootout.ts  # penalty shootout state machine
    undo.ts      # rev-based undo, mirrors basketball's approach
    persistence.ts # serialize/deserialize, backup export/import, migrations
  hooks/
    useMatch.ts  # useReducer over logic/*, persists to localStorage on change
  components/
    Setup/
    Teams/
    Game/
      Clock.tsx
      ScoreBar.tsx
      TeamPanel.tsx     # stat buttons + roster list, respects collapsed mode
      PlayerRow.tsx
      SubstitutionMenu.tsx
    Shootout/
    Summary/
    History/
  App.tsx
e2e/
  *.spec.ts       # Playwright screenshot tests
docs/superpowers/specs/   # design docs (this file)
docs/superpowers/plans/   # implementation plans
.github/workflows/
  ci.yml          # PR checks: vitest + build + playwright
  deploy.yml      # main branch: checks + deploy to Pages
```

## Data Model

```ts
type TeamKey = 'teamA' | 'teamB';
type Period = 1 | 2 | 'ET1' | 'ET2' | 'shootout';

interface Match {
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
  stoppage: Partial<Record<Period, number>>; // added seconds, set once announced
  score: Record<TeamKey, number>;
  possession: {
    current: TeamKey | null;
    accumSec: Record<TeamKey, number>; // same accrual pattern as player fieldSecs
  };
  periodScores: Record<TeamKey, number>[];
  shootout?: {
    attempts: { team: TeamKey; scored: boolean }[];
    winner: TeamKey | null;
  };
  log: LogEntry[];
  _seq: number;
}

interface Team {
  id: string;
  name: string;
  collapsed: boolean; // true = light tracking only: score/cards/corners, no roster
  players: Player[];
  goalkeeperId: string | null;
  corners: number;
  offsides: number;
  yellowCards: number; // team-level tally; authoritative when collapsed, else derived by summing players
  redCards: number;
}

interface Player {
  id: string;
  num: number;
  name: string;
  starter: boolean;
  onField: boolean;
  inClock: number | null; // elapsedSec when subbed in, for fieldSecs accrual
  fieldSecs: number;
  goals: number;
  assists: number;
  shotsOnGoal: number;
  tackles: number;
  foulsCommitted: number;
  saves: number; // meaningful only for the goalkeeper, but not restricted
  yellowCards: number;
  redCards: number;
  sentOff: boolean;
}

interface LogEntry {
  id: number;
  period: Period;
  clockText: string;
  team: TeamKey | null;
  playerId: string | null;
  type: string;
  detail: string;
  rev: RevEntry | null; // undo descriptor, same approach as basketball
}
```

## Key Behaviors

**Clock.** `clock.elapsedSec` counts up, computed from `startedAt` timestamp (`elapsed = now - startedAt`), not a live-ticking state value — survives tab backgrounding without drift, same technique as basketball's `clockRemaining`. Reaching the regulation length does not auto-stop the clock; it keeps counting up until the scorekeeper taps **End Half**. **Stoppage time** is entered manually once the referee announces it (e.g. tap "+4" at/after the regulation mark) and stored per-period in `stoppage`; the display shows `45:00 +2:13` while elapsed exceeds regulation for the period.

**Period transitions.** End Half stops the clock, records `stoppage[period]` if not already set, snapshots `periodScores`, closes out on-field time accrual (`fieldSecs`) and possession accrual, and advances `period`. If regulation ends level and `hasExtraTime` is on, "+Extra Time" adds `ET1`/`ET2` (shorter length); if still level after extra time and `hasShootout` is on, transitions to `screen: 'shootout'`.

**Possession.** A toggle (not a stat button) sets `possession.current`; time accrues into `possession.accumSec` the same way player `fieldSecs` accrues — computed from the clock delta since the toggle last changed, closed out at period boundaries.

**Substitutions.** Free/unlimited, re-entry allowed (no sub-limit enforcement, matching high-school rules) — same `subIn`/`subOut` + `fieldSecs` accrual pattern as basketball's `courtSecs`.

**Cards.** Every card increments the team-level `yellowCards`/`redCards` tally; when the team is expanded, it's also recorded against the specific player. Recording a player's 2nd yellow card automatically also records a red card and sets `sentOff: true`. Sent-off players are excluded from the substitution "sub in" list (they can't return). Collapsed teams only have the team-level tally to increment — there's no player to attribute to, and no 2nd-yellow auto-red detection (that requires per-player history), so red cards are recorded directly when tapped.

**Collapsed team mode.** When `Team.collapsed` is true, `TeamPanel` renders only score +/-, card buttons (team-level), and corner/offside counters — no roster, no per-player stat grid. A team can be toggled collapsed/expanded from Setup; toggling mid-match is out of scope for v1 (decide roster tracking at match start).

**Shootout.** Separate state machine: alternating attempts logged as `{team, scored}`, best-of-5 then sudden death, `winner` set once decided. Does not affect `score` (shootout result is recorded and displayed but goals aren't added to the match score).

**Undo.** Every mutating action pushes a `LogEntry` with a `rev` descriptor; `undo()` pops the last entry and reverses based on `rev.kind` — same approach as basketball's `undo()`, extended with new `rev.kind` values for the soccer-specific actions (card, save, corner, offside, possession-accrual-affecting actions, etc).

**Persistence.** Single `Match` (plus saved `teams` roster library and `history` of completed matches) serialized to `localStorage`, same key/shape conventions as basketball (`serialize`/`deserialize`, backup export/import JSON, resumable in-progress match banner on Setup).

## Screens

- **Setup** — pick Team A/Team B from saved rosters (or create new), mark either collapsed, home/away flag, half length, extra-time toggle + length, shootout toggle, resume-in-progress banner, export/import backup.
- **Teams** — roster CRUD: add/edit/delete players, mark starter, mark goalkeeper (one per team).
- **Game** — running clock (start/stop, stoppage-time entry), score, per-team `TeamPanel` (stat buttons: goal, assist, shot on goal, tackle, foul, save-if-GK, yellow, red; corners/offsides counters; roster with sub in/out) respecting collapsed mode, possession toggle, End Half / +Extra Time / End Game controls, undo, view-live-stats.
- **Shootout** — only reached if regulation + extra time end level and shootout enabled; alternating attempt buttons (scored/missed) per team, running tally, sudden death after round 5.
- **Summary** — final score (incl. shootout result if applicable), period-by-period score table, per-team box score (goals/assists/shots/tackles/fouls/cards/saves/corners/offsides/time-on-field), possession-time split, full event log. Reachable live (read-only "current stats" view) or from History.
- **History** — list of completed matches, Review (read-only Summary)/Open (resume—if not finished)/Delete, same pattern as basketball.

## Testing

- **Vitest, TDD-first**: every `logic/*.ts` function gets its test written before implementation. Cover clock math (elapsed computation, stoppage entry, period transition, extra time trigger), card auto-red rule, possession/field-time accrual, undo reversibility for each `rev.kind`, shootout state machine, collapsed-team constraints.
- **React Testing Library**: light coverage on a few interactive components (e.g. `TeamPanel` goal button updates visible score; collapsed mode hides the roster).
- **Playwright**: screenshot tests for Setup, Game (mid-match with some stats recorded), Summary, and dark/light theme — run against `vite preview` in CI, snapshots checked into the repo, updated deliberately via `--update-snapshots`.

## Deployment

- `.github/workflows/ci.yml`: on PRs — `npm ci`, `vitest run`, `vite build`, `playwright test`. Blocks merge on failure.
- `.github/workflows/deploy.yml`: on push to `main` — same checks, then `vite build` + `actions/deploy-pages` to publish `dist/`.
- GitHub Pages served from the Actions-deployed artifact (Pages source = "GitHub Actions", not a branch).

## Out of Scope (v1)

- Toggling a team's collapsed/expanded state mid-match.
- Formations/on-field positions beyond a single "goalkeeper" flag.
- Any multi-device sync, accounts, or server-side storage.
- Enforcing a substitution limit (high-school rules allow free re-entry; not needed).
