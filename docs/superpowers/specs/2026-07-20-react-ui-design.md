# SoccerScore React UI — Design

Date: 2026-07-20

## Overview

This is Phase 3 of 4 for SoccerScore (see `docs/superpowers/specs/2026-07-18-soccerscore-design.md` for the full app design and `docs/superpowers/specs/2026-07-19-logic-layer-design.md` for the completed pure logic layer). Phases 1 (scaffolding/tooling) and 2 (logic layer) are complete and merged. This phase builds the entire React UI on top of the finished `src/logic/` layer: a `useMatch` hook wiring the pure logic functions into React state with `localStorage` persistence, and six screens (Setup, Teams, Game, Shootout, Summary, History).

Given the size of this phase relative to Phases 1-2, this single design spec is implemented across **three sequential plans**, each producing working, exercisable software:

- **Plan 3A — Foundation & Teams**: MUI setup, `useMatch` hook, App shell/nav, Teams screen.
- **Plan 3B — Play a Match**: Setup, Game, Shootout screens (the core playable-match journey).
- **Plan 3C — Review Results**: Summary, History screens.

## Goals

- Wire every pure function in `src/logic/` into a React state layer (`useMatch`) that persists to `localStorage`.
- Build all six screens using MUI components, replacing basketballscore's hand-rolled popovers/dialogs with MUI's `Menu`/`Popover`/`Dialog`.
- No routing — a top-level screen state (mirroring `Match.screen`) plus a `homeView` state drives which screen renders, matching basketballscore's `showOnly()` pattern conceptually.
- Light RTL component tests proving critical interactions work; the logic layer's 106 tests already cover game-rule correctness.
- Stay deployable as a static site via the existing GitHub Pages workflow — MUI is purely client-side, so this requires no changes to Phase 1's build/deploy pipeline beyond the larger bundle size.

## Tech Stack Additions

- `@mui/material`, `@emotion/react`, `@emotion/styled` — component library and its required styling engine.
- `@fontsource/roboto` — self-hosted Roboto (MUI's default typeface), avoiding any external Google Fonts network dependency at runtime.
- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` — component testing, added as dev dependencies.
- Vitest config gains a per-file environment override: `src/logic/**/*.test.ts` stays on the `node` environment (fast, no DOM needed); new component/hook test files run under `jsdom`.

## Architecture

**No router.** `App.tsx` is the top-level dispatcher:
- If `match` exists and `match.screen === 'game'`, render `GameScreen`.
- If `match.screen === 'shootout'`, render `ShootoutScreen`.
- If `match.screen === 'summary'` (live, just-finished) or a `historyViewId` is set (viewing a past match read-only), render `SummaryScreen`.
- Otherwise (no active match), render `Nav` + whichever `homeView` tab is active (`SetupScreen` | `TeamsScreen` | `HistoryScreen`).

This mirrors basketballscore's `render()`/`showOnly()` dispatcher, expressed as ordinary React conditional rendering instead of DOM `hidden`-attribute toggling.

**State flows through one hook.** `useMatch()` is the single source of truth a component tree reads from and dispatches actions to — no other state management library (no Redux/Zustand/Context-heavy tree beyond passing the hook's return value down or through a single context provider at the `App` level for convenience).

```ts
interface MatchHookState {
  match: Match | null;
  savedTeams: SavedTeam[];
  history: Match[];
  theme: 'dark' | 'light';
}

interface MatchHookApi extends MatchHookState {
  // Match lifecycle
  startMatch: (args: NewMatchArgs) => void;
  endHalf: () => void;
  addExtraTime: () => void;
  endGame: () => void;
  startShootout: () => void;
  undo: () => void;
  // Stats (all take the same shape as their logic/*.ts counterparts, minus `match` and `nowMs`)
  adjustScore: (team: TeamKey, delta: number) => void;
  recordPlayerStat: (team: TeamKey, playerId: string, stat: PlayerStatField) => void;
  recordCard: (team: TeamKey, playerId: string | null, color: 'yellow' | 'red') => void;
  recordCorner: (team: TeamKey) => void;
  recordOffside: (team: TeamKey) => void;
  subIn: (team: TeamKey, playerId: string) => void;
  subOut: (team: TeamKey, playerId: string) => void;
  setPossession: (team: TeamKey) => void;
  recordStoppage: (addedSec: number) => void;
  toggleClock: () => void;
  recordAttempt: (team: TeamKey, scored: boolean) => void;
  // Team/history library
  upsertTeam: (team: SavedTeam) => void;
  removeTeam: (id: string) => void;
  removeFromHistory: (id: string) => void;
  // Backup
  exportBackup: () => void; // triggers a file download of buildBackup(...)
  importBackup: (file: File) => Promise<ImportSummary>;
  // Theme
  setTheme: (theme: 'dark' | 'light') => void;
}
```

Every method above is a thin wrapper: read the current `match`/`savedTeams`/`history` from `useReducer` state, call the corresponding `src/logic/*.ts` function with `Date.now()` as `nowMs`, and dispatch the result back into state. **`Date.now()` is read only at this one boundary** — every pure function underneath stays fully time-injectable and already-tested.

**Persistence.** A `useEffect` serializes `match`/`savedTeams`/`history`/`theme` to `localStorage` on every change (via `persistence.ts`'s `serialize`), under keys mirroring basketballscore's `KEYS` object (`soccerscore.match`, `soccerscore.teams`, `soccerscore.history`, `soccerscore.theme`). On mount, a `useEffect` (or lazy `useReducer` initializer) loads and `deserialize`s each key, checking `isResumable(match)` to decide whether to show a resume banner on Setup.

**Live clock display.** The clock's per-second visual update (basketballscore's `startTick`/`stopTick`) lives inside `Clock.tsx`, not the hook: a `useEffect` with `setInterval(() => forceRerender(), 250)` while `match.clock.running` is true, computing `clockElapsed(match.clock, Date.now())` fresh on each render. This never touches persisted state — it's purely a local re-render trigger, exactly mirroring basketballscore's separation of "the clock's actual value" (timestamp-based, drift-proof) from "the on-screen ticking" (a display-only poll).

## Screens & Components

```
src/
  theme.ts
  hooks/
    useMatch.ts
    useMatch.test.ts
  components/
    App.tsx
    Nav.tsx
    Setup/
      SetupScreen.tsx
      TeamPicker.tsx
    Teams/
      TeamsScreen.tsx
      TeamEditor.tsx
    Game/
      GameScreen.tsx
      Clock.tsx
      ScoreBar.tsx
      TeamPanel.tsx
      PlayerRow.tsx
      StatMenu.tsx
      SubstitutionMenu.tsx
    Shootout/
      ShootoutScreen.tsx
    Summary/
      SummaryScreen.tsx
    History/
      HistoryScreen.tsx
```

- **`theme.ts`**: `createTheme({ palette: { mode: 'dark' | 'light' } })`, Roboto configured via `@fontsource/roboto` imports in `main.tsx`, no external font requests.
- **`App.tsx`**: wraps everything in MUI's `ThemeProvider` + `CssBaseline`, holds the top-level screen dispatch logic described above.
- **`Nav.tsx`**: MUI `Tabs` for Setup/Teams/History, plus a help/menu icon button — mirrors basketballscore's `renderNav`.
- **`SetupScreen.tsx`**: two `TeamPicker`s (one per side) to choose a saved team + active roster + collapsed toggle, match config fields (half length, extra time on/off + length, shootout on/off), home/away toggle, resume-in-progress banner (MUI `Alert` + buttons), export/import backup buttons.
- **`TeamsScreen.tsx`** / **`TeamEditor.tsx`**: saved-team list with Edit/Delete, and a roster editor form (add/edit/delete players, starter/goalkeeper checkboxes) — mirrors basketballscore's Teams tab structure.
- **`GameScreen.tsx`**: composes `Clock`, `ScoreBar`, and two `TeamPanel`s (one per side), plus End Half / +Extra Time / End Game / Undo action buttons (MUI `Button`s, with confirmation `Dialog`s for irreversible actions like End Game).
- **`Clock.tsx`**: live elapsed-time display, start/stop toggle, a small dialog/input for entering stoppage time.
- **`ScoreBar.tsx`**: score display for both teams, possession toggle control.
- **`TeamPanel.tsx`**: if `team.collapsed`, renders only score +/- and card buttons and corner/offside counters (no roster); otherwise renders the full stat-button grid (goal/assist/shot/tackle/foul/save/card) plus the roster list via `PlayerRow`.
- **`PlayerRow.tsx`**: one player's row — number/name, on-field indicator, tap target opening `StatMenu` (player-attributed stats) or `SubstitutionMenu` (sub in/out).
- **`StatMenu.tsx`** / **`SubstitutionMenu.tsx`**: MUI `Menu` components anchored to the tapped row, replacing basketballscore's custom long-press popover implementation.
- **`ShootoutScreen.tsx`**: alternating scored/missed attempt buttons per team, running attempt tally, winner banner once decided.
- **`SummaryScreen.tsx`**: final score (+ shootout result if applicable), period-by-period table, per-team box score, possession-time split, full event log — read-only, reachable live or from History.
- **`HistoryScreen.tsx`**: past-match list with Review (opens `SummaryScreen` read-only) / Open (resume if unfinished) / Delete.

## Testing

- **`useMatch.test.ts`**: `renderHook` from RTL, verifying each dispatched action calls through to the correct logic function and updates state/`localStorage` accordingly (mocking or using jsdom's built-in `localStorage`).
- **One or two RTL tests per screen** proving the critical interaction, not exhaustive coverage: e.g. Setup starts a match and transitions to Game; Teams add-player form appends to the roster; Game's Goal button updates the visible score and log; a collapsed `TeamPanel` hides the roster; Shootout declares a winner and shows the banner; Summary renders the box score; History's Delete removes an entry.
- Vitest config: `environmentMatchGlobs` (or per-file `// @vitest-environment jsdom` pragma) scopes `jsdom` to component/hook test files only, keeping `src/logic/**/*.test.ts` on the faster `node` environment.
- Playwright visual-regression coverage of these new screens is Phase 4's responsibility — this phase only needs to keep `npm run build`/`npm run test:e2e` passing, which will require regenerating the existing baseline screenshot once `App.tsx` stops rendering the Vite template's demo page (expected, called out as part of Plan 3A).

## Self-Review Notes

- **Spec coverage:** every screen and component named in the original app design doc's "Screens" section has a corresponding file here; the `useMatch` hook fulfills the design doc's deferred-from-Phase-2 requirement.
- **Placeholder scan:** no TBD/TODO; every function in the `MatchHookApi` interface maps to a named `src/logic/*.ts` function already built and tested in Phase 2.
- **Scope check:** three sub-plans keep each implementation phase focused on one user journey (manage teams / play a match / review results) rather than one monolithic UI plan.
- **Ambiguity check:** the Playwright baseline-screenshot regeneration need (once the demo page is replaced) is explicitly assigned to Plan 3A so it isn't discovered as a surprise mid-implementation.
