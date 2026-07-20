# SoccerScore React UI — Plan 3C: Review Results — Design

Date: 2026-07-20

## Overview

This is Plan 3C of Phase 3 (see `docs/superpowers/specs/2026-07-20-react-ui-design.md` for the full Phase 3 design). Plans 3A (Foundation & Teams) and 3B (Play a Match) are complete and merged. This plan builds the last two screens — `SummaryScreen` and `HistoryScreen` — and, critically, closes a gap both prior plans' final reviews flagged: once a match ends, `App.tsx` renders an inert placeholder with no way to start a new match. The match stays persisted in `localStorage` forever, blocking Setup.

## Goals

- Give a finished match somewhere to go: archive it into `history` and let the user clear the active match to start a new one.
- Build `SummaryScreen`: a read-only box score, reachable both right after a match ends and later from History.
- Build `HistoryScreen`: browse, review, and delete past matches.
- Fix a real, previously-deferred bug in `periodScores` that this plan's period-by-period table would otherwise expose.

## Non-Goals

- **Reopening a finished match for continued play** (basketballscore's "Open" button, which un-finishes a completed game). Deliberately deferred — History ships with Review (read-only) and Delete only. This was an explicit scope decision: reopening would require a new `src/logic/match.ts` function (reversing `endGame`'s snapshot/log/accrual effects) plus its own test suite, and isn't needed to close the dead-end.

## Architecture

### Archiving on End Game (closes the dead-end)

Today, `endGame` (in `src/logic/match.ts`) only sets `match.screen = 'summary'` and `match.date = nowMs`. Nothing ever calls the already-existing `upsertHistory` (in `src/logic/persistence.ts`), and nothing can clear `match` back to `null`. This mirrors basketballscore's own pattern, which archives a finished game **immediately when End Game fires**, not lazily when the user later leaves the Summary screen:

- `useMatch`'s `endGame` wrapper (`src/hooks/useMatch.ts`) is extended: after computing the new match via `endGame(m, Date.now())`, it also folds the result into `history` via `upsertHistory`. Concretely, the `APPLY_MATCH` reducer path stays as-is for the match itself; a new reducer case (or an extension of `END_GAME`-specific handling) additionally does `history: upsertHistory(state.history, newMatch)`. The match is archived the instant the game ends, whether or not the user ever taps anything else on the Summary screen.
- A new `closeMatch(): void` method is added to `MatchHookApi`, backed by a new `CLEAR_MATCH` action that sets `match: null`. This is what Summary's "New Match" button calls. Since the match was already archived at end-game time, this is a pure "forget the active match" operation — no re-archiving needed.

### Bugfix: duplicate `periodScores` entries through a shootout

`endGame` unconditionally calls `snapshotPeriod`. But `startShootout` *also* calls `snapshotPeriod` when the shootout begins (to snapshot the regulation/extra-time score before penalties). Since shootout attempts (`recordAttempt`) never touch `match.score`, a match that goes to a shootout ends up with two identical, back-to-back `periodScores` entries — one from `startShootout`, one redundant one from `endGame`. This was flagged as a known, deferred cosmetic issue in Phase 2 and would show up as a visibly duplicated row in this plan's period-by-period table, so it's fixed here:

```ts
export function endGame(match: Match, nowMs: number): Match {
  let m = stopClock(match, nowMs);
  m = closeOutAccrual(m);
  if (m.screen !== 'shootout') m = snapshotPeriod(m);
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

This needs a new `match.test.ts` case (TDD: write the failing test showing two identical `periodScores` entries through a shootout path first, then apply the one-line fix) and a check that the non-shootout path is unaffected (existing tests already cover that).

### `App.tsx` dispatch, extended

Per the Phase 3 spec, `App.tsx` gains a `historyViewId: string | null` local state (`useState`, not part of the `useMatch` hook — it's pure UI navigation state, same rationale as `homeView`). Dispatch precedence, extending the existing `game` / `shootout` / else chain:

1. `match.screen === 'game'` → `GameScreen` (unchanged)
2. `match.screen === 'shootout'` → `ShootoutScreen` (unchanged)
3. `match.screen === 'summary'` OR `historyViewId` is set → `SummaryScreen`
4. else → `Nav` + `homeView` (`setup` | `teams` | `history`), with `history` now rendering the real `HistoryScreen` instead of placeholder text

**Dangling `historyViewId` guard:** if `historyViewId` is set but no entry with that id exists in `history` (e.g. it was deleted in another tab, or — defensively — any other reason it's gone), clear `historyViewId` and fall through to `Nav`/`homeView` rather than rendering a broken screen.

**Close button semantics differ by how you got there**, so `App.tsx` (not `SummaryScreen`) owns the wiring:
- Live mode (`match.screen === 'summary'`, `historyViewId` is null): button reads "New Match", calls `api.closeMatch()` and sets `homeView` to `'setup'`.
- Review mode (`historyViewId` set): button reads "Back to History", just clears `historyViewId` (implicitly returns to the History tab, since `homeView` was already `'history'` to get there).

Since History is only reachable via `Nav`, which only renders when there's no active match (existing Plan 3A/3B behavior, unchanged), `historyViewId` can only be set while `match` is `null` or already in `'summary'` — there's no case where a live in-progress match and a History-review overlap.

### Shared period-label helper (small DRY cleanup)

`GameScreen.tsx` already has a local `PERIOD_LABELS` map (`1: 'Half 1'`, `2: 'Half 2'`, `ET1: 'Extra Time 1'`, `ET2: 'Extra Time 2'` — no `'shootout'` entry, since `GameScreen` never needs one). `SummaryScreen`'s period table and event log need the same labels plus `'shootout'` → `'Shootout'`. Rather than duplicating this map a second time, this plan extracts it to a shared helper:

```ts
// src/logic/periodLabel.ts
import type { Period } from './types';

const LABELS: Record<Period, string> = {
  1: 'Half 1',
  2: 'Half 2',
  ET1: 'Extra Time 1',
  ET2: 'Extra Time 2',
  shootout: 'Shootout',
};

export function periodLabel(period: Period): string {
  return LABELS[period];
}
```

`GameScreen.tsx` is updated to import and use this instead of its local map (its own behavior is unchanged — this is a pure extraction, not a functional change).

## Screens & Components

```
src/
  logic/
    periodLabel.ts
    periodLabel.test.ts
  components/
    Summary/
      SummaryScreen.tsx
      SummaryScreen.test.tsx
    History/
      HistoryScreen.tsx
      HistoryScreen.test.tsx
```

- **`SummaryScreen.tsx`** — read-only. Props: `{ match: Match; mode: 'live' | 'review'; onClose: () => void }`. Renders, in order:
  - Final score header (team names + score), plus a shootout result line if `match.shootout` is present (winner name, attempt tally).
  - Period-by-period table: one row per period actually played, computed by diffing consecutive `periodScores` snapshots (`periodScores[0]` is period 1's score; each subsequent row is `periodScores[i] - periodScores[i-1]` per team) against `periodLabel()` for the row label. (With the bugfix above, a shootout match has exactly one row per real period — no phantom duplicate.)
  - Per-team box score, one block per team: if `team.collapsed`, show team totals only (score, corners, offsides, yellow/red cards — no roster, matching `TeamPanel`'s existing collapsed-mode convention); otherwise a per-player table (number, name, goals, assists, shots on goal, tackles, fouls, saves, yellow/red cards, sent-off, field time formatted via `formatClock(player.fieldSecs)`).
  - Possession-time split: `match.possession.accumSec.teamA` vs `.teamB`, formatted via `formatClock`.
  - Full event log: `match.log` rendered as a list, each entry `${formatClock via entry.clockText} ${periodLabel(entry.period)} — ${entry.detail}`.
  - Close button, label driven by `mode` (`'New Match'` for `'live'`, `'Back to History'` for `'review'`), calling `onClose`.
- **`HistoryScreen.tsx`** — Props: `{ history: Match[]; onReview: (id: string) => void; onDelete: (id: string) => void }`. Lists `history` newest-first (sorted by `match.date`), each row: team names, final score, a W/L/T-style result relative to `homeTeam`, formatted date. Two buttons per row: **Review** (calls `onReview(match.id)`) and **Delete** (confirmation `Dialog`, reusing the `confirmAndRun`-style pattern already established in `GameScreen.tsx`, then calls `onDelete(match.id)`). Empty state: a plain message when `history` is empty, matching basketballscore's "No finished games yet."

## `MatchHookApi` change

```ts
interface MatchHookApi extends MatchHookState {
  // ...existing members unchanged...
  closeMatch: () => void; // new: clears the active match (already archived at end-game time)
}
```

`endGame`'s existing wrapper behavior changes (archives to `history` in addition to updating `match`); its signature is unchanged.

## Testing

- **`match.test.ts`**: new case proving `endGame` after `startShootout` produces exactly one net-new `periodScores` entry (not two identical ones); existing non-shootout `endGame` tests are unaffected by the conditional.
- **`periodLabel.test.ts`**: one case per `Period` value, including `'shootout'`.
- **`useMatch.test.ts`**: new cases — `endGame` both updates `match.screen` and appends the same match into `history`; `closeMatch` sets `match` to `null` without touching `history`.
- **`SummaryScreen.test.tsx`**: renders box score correctly for a finished match in `'live'` mode (close button reads "New Match"); renders identically in `'review'` mode with a "Back to History" button.
- **`HistoryScreen.test.tsx`**: Review calls `onReview` with the right id; Delete (after confirming) calls `onDelete` and the row disappears from a re-render with updated `history` props.
- **`App.test.tsx`**: extends the existing end-to-end test — finish a match (already reaches Game in the existing test), end it, hit "New Match", and assert `match` is cleared and Setup is showing again (closing the dead-end end-to-end). A second case: from History, Review opens `SummaryScreen` read-only, Back to History returns to the History list.

## Self-Review Notes

- **Spec coverage:** every component in the Phase 3 spec's file tree for Plan 3C (`SummaryScreen.tsx`, `HistoryScreen.tsx`) is covered, plus the `MatchHookApi` additions the spec's architecture section implies but didn't spell out (the spec only says "Otherwise... render `HistoryScreen`" and "read-only, reachable live or from History" — it doesn't define the archive-on-end-game mechanism or the close semantics explicitly, so this design fills that gap based on basketballscore's precedent).
- **Placeholder scan:** no TBD/TODO; every function referenced (`upsertHistory`, `snapshotPeriod`, `closeOutAccrual`, `formatClock`, `clockElapsed`) already exists and is tested.
- **Scope check:** focused on the two remaining screens plus the minimum data-flow change needed to make them reachable and useful; reopening a finished match is explicitly deferred (Non-Goals).
- **Ambiguity check:** the "Open (resume if unfinished)" phrase in the parent Phase 3 spec is resolved as out-of-scope for this plan per the user's explicit choice; the live-vs-review close-button semantics and the dangling-`historyViewId` guard were both genuinely ambiguous in the parent spec and are made explicit here.
