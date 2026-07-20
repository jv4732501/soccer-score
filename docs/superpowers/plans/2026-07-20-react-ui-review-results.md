# SoccerScore React UI — Plan 3C: Review Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `SummaryScreen` and `HistoryScreen`, and close the "summary screen dead-end" (a finished match has nowhere to go and blocks starting a new one) flagged by both Plan 3A's and Plan 3B's final reviews.

**Architecture:** Archive a match into `history` the instant `endGame` fires (not lazily when the user leaves Summary); add a `closeMatch()` hook method that clears the active match now that it's safely archived; build the two remaining screens per `docs/superpowers/specs/2026-07-20-react-ui-review-results-design.md`; wire `App.tsx`'s dispatch to reach both a live-just-finished summary and a read-only History review of any past match.

**Tech Stack:** React 19.2, TypeScript, MUI (`@mui/material`), Vitest + React Testing Library (jsdom via per-file pragma), no new dependencies.

## Global Constraints

- No routing library — screen selection stays a plain conditional dispatch on `match.screen` plus a `homeView` state (unchanged from Plans 3A/3B).
- MUI is the only UI component library; no icon package — buttons/labels use plain text, matching every existing screen.
- Component/hook test files must start with the literal first line `// @vitest-environment jsdom`; `src/logic/**/*.test.ts` files stay on the default `node` environment (no pragma).
- `Date.now()` stays confined to the `useMatch` hook boundary (the one already-approved exception is `Clock.tsx`'s live-ticking display, untouched by this plan).
- No component or logic function mutates `Match`/`Team`/`Player` objects in place; every state change goes through `src/logic/*.ts` pure functions and `structuredClone`-based `clone()`.
- **Non-Goal, explicitly out of scope:** reopening a finished match for continued play (an "Open" action that un-finishes a completed match). History ships with Review (read-only) and Delete only this plan.

---

### Task 1: Fix the `periodScores` duplicate-snapshot bug in `endGame`

**Files:**
- Modify: `src/logic/match.ts:165-181` (the `endGame` function)
- Test: `src/logic/match.test.ts`

**Interfaces:**
- Consumes: `snapshotPeriod`, `closeOutAccrual`, `stopClock`, `appendLog` (all already defined in `src/logic/match.ts`/`src/logic/clock.ts`/`src/logic/log.ts` — unchanged signatures), `startShootout` from `src/logic/shootout.ts` (test-only import).
- Produces: `endGame(match: Match, nowMs: number): Match` — same signature as before, behavior changed only for matches that reached `screen === 'shootout'` before ending.

This is the first task because Task 4 (`SummaryScreen`)'s period-by-period table renders `periodScores` directly, and a duplicate entry there would be a visible, embarrassing bug that a reviewer would rightly flag. `startShootout` (`src/logic/shootout.ts:6-23`) already calls `snapshotPeriod` when the shootout begins, to snapshot the regulation/extra-time score before penalties. `endGame` then unconditionally calls `snapshotPeriod` again — but shootout attempts never touch `match.score` (confirm by reading `recordAttempt` in `src/logic/shootout.ts:50-65` — it only pushes to `match.shootout.attempts`), so that second snapshot is an exact duplicate of the first.

- [ ] **Step 1: Write the failing test**

Add this test inside the existing `describe('endGame', ...)` block in `src/logic/match.test.ts` (after the existing `it('sets screen to summary, ...)` test at line 163), and add `import { startShootout } from './shootout';` to the top of the file alongside the existing imports:

```ts
import { startShootout } from './shootout';
```

```ts
it('does not push a duplicate periodScores entry when the match already went through a shootout', () => {
  let m = makeStartingMatch();
  m = endHalf(m, 0); // period 1 -> 2 (1st snapshot)
  m = addExtraTime(m, 0); // period 2 -> ET1 (2nd snapshot)
  m = addExtraTime(m, 0); // ET1 -> ET2 (3rd snapshot)
  m = startShootout(m, 0); // snapshots the regulation/ET score before penalties (4th snapshot)
  expect(m.periodScores).toHaveLength(4);
  m = endGame(m, 0);
  // endGame must NOT push a 5th, redundant snapshot -- the shootout already captured the final score
  expect(m.periodScores).toHaveLength(4);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- match.test.ts`
Expected: FAIL — the new test expects length 4 after `endGame` but currently gets 5 (the extra duplicate).

- [ ] **Step 3: Write minimal implementation**

In `src/logic/match.ts`, change the `endGame` function (currently lines 165-181) from:

```ts
export function endGame(match: Match, nowMs: number): Match {
  let m = stopClock(match, nowMs);
  m = closeOutAccrual(m);
  m = snapshotPeriod(m);
  m.screen = 'summary';
```

to:

```ts
export function endGame(match: Match, nowMs: number): Match {
  let m = stopClock(match, nowMs);
  m = closeOutAccrual(m);
  if (m.screen !== 'shootout') m = snapshotPeriod(m);
  m.screen = 'summary';
```

(The rest of the function — `m.date = nowMs`, the `appendLog` call, `return m` — is unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- match.test.ts`
Expected: PASS — all `match.test.ts` tests pass, including the new one and the existing `endGame` test (which ends a match straight from period 1 with `screen === 'game'`, so it still takes the `snapshotPeriod` branch exactly as before).

- [ ] **Step 5: Commit**

```bash
git add src/logic/match.ts src/logic/match.test.ts
git commit -m "fix: don't duplicate periodScores snapshot when ending a game after a shootout"
```

---

### Task 2: Extract a shared `periodLabel` helper

**Files:**
- Create: `src/logic/periodLabel.ts`
- Test: `src/logic/periodLabel.test.ts`
- Modify: `src/components/Game/GameScreen.tsx:12,37-43,78` (import and use the shared helper instead of the local map)

**Interfaces:**
- Consumes: `Period` type from `src/logic/types.ts` (already defined: `'1' | 2 | 'ET1' | 'ET2' | 'shootout'` — actually `1 | 2 | 'ET1' | 'ET2' | 'shootout'`, no quotes around `1`/`2`).
- Produces: `periodLabel(period: Period): string` — used by Task 4's `SummaryScreen` for its period table and event log, and by this task's updated `GameScreen`.

`GameScreen.tsx` already has a local `PERIOD_LABEL` map (lines 37-43) with everything except a `'shootout'` entry (it never needs one — `GameScreen` never renders during a shootout). `SummaryScreen` (Task 4) needs the exact same labels plus `'shootout'` → `'Shootout'`. Extracting this now avoids a second, drifting copy.

- [ ] **Step 1: Write the failing test**

Create `src/logic/periodLabel.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { periodLabel } from './periodLabel';

describe('periodLabel', () => {
  it('labels every period value', () => {
    expect(periodLabel(1)).toBe('Half 1');
    expect(periodLabel(2)).toBe('Half 2');
    expect(periodLabel('ET1')).toBe('Extra Time 1');
    expect(periodLabel('ET2')).toBe('Extra Time 2');
    expect(periodLabel('shootout')).toBe('Shootout');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- periodLabel.test.ts`
Expected: FAIL with "Cannot find module './periodLabel'" (the file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/logic/periodLabel.ts`:

```ts
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- periodLabel.test.ts`
Expected: PASS

- [ ] **Step 5: Update `GameScreen.tsx` to use the shared helper**

In `src/components/Game/GameScreen.tsx`, add the import alongside the existing type-only imports near line 12:

```ts
import { periodLabel } from '../../logic/periodLabel';
```

Delete the local map (currently lines 37-43):

```ts
const PERIOD_LABEL: Record<Period, string> = {
  1: 'Half 1',
  2: 'Half 2',
  ET1: 'Extra Time 1',
  ET2: 'Extra Time 2',
  shootout: 'Shootout',
};
```

And change its one usage (currently line 78) from:

```tsx
<Typography variant="overline">{PERIOD_LABEL[match.period]}</Typography>
```

to:

```tsx
<Typography variant="overline">{periodLabel(match.period)}</Typography>
```

`Period` is no longer referenced directly in this file once the local map is removed — remove `Period` from the `import type { Match, Period } from '../../logic/types';` line (currently line 12 as it exists before your edit), leaving `import type { Match } from '../../logic/types';`.

- [ ] **Step 6: Run the full test suite to verify nothing broke**

Run: `npm run test`
Expected: PASS — `GameScreen.test.tsx`'s existing tests (which don't assert on the period label text directly) are unaffected; `periodLabel.test.ts` and everything else stays green.

- [ ] **Step 7: Commit**

```bash
git add src/logic/periodLabel.ts src/logic/periodLabel.test.ts src/components/Game/GameScreen.tsx
git commit -m "refactor: extract shared periodLabel helper, used by GameScreen and (soon) SummaryScreen"
```

---

### Task 3: Archive on End Game + `closeMatch` in `useMatch`

**Files:**
- Modify: `src/hooks/useMatch.ts` (imports, `Action` union, reducer, `endGameApi`, new `closeMatchApi`, `MatchHookApi` interface, returned object)
- Test: `src/hooks/useMatch.test.ts`

**Interfaces:**
- Consumes: `upsertHistory(history: Match[], match: Match): Match[]` (already defined and tested in `src/logic/persistence.ts:32-38`); `endGame(match: Match, nowMs: number): Match` from Task 1 (signature unchanged).
- Produces: `MatchHookApi['closeMatch']: () => void` — consumed by Task 6 (`App.tsx`'s live-mode Summary close button).

This is the task that actually closes the dead-end: today, ending a match never writes it into `history`, and nothing can clear the active `match`. Both changes happen here, in the hook — no logic-layer changes needed (`upsertHistory` already exists and is already tested).

- [ ] **Step 1: Write the failing tests**

Add these two tests inside the existing `describe('useMatch', ...)` block in `src/hooks/useMatch.test.ts`, after the existing `it('undo reverses the last logged action', ...)` test (around line 69):

```ts
it('endGame archives the finished match into history', () => {
  const { result } = renderHook(() => useMatch());
  act(() => result.current.startMatch(startArgs()));
  const matchId = result.current.match!.id;
  act(() => result.current.endGame());
  expect(result.current.match?.screen).toBe('summary');
  expect(result.current.history).toHaveLength(1);
  expect(result.current.history[0].id).toBe(matchId);
});

it('closeMatch clears the active match without touching history', () => {
  const { result } = renderHook(() => useMatch());
  act(() => result.current.startMatch(startArgs()));
  act(() => result.current.endGame());
  act(() => result.current.closeMatch());
  expect(result.current.match).toBeNull();
  expect(result.current.history).toHaveLength(1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- useMatch.test.ts`
Expected: FAIL — `endGame archives...` fails because `result.current.history` is `[]` (nothing archives it today); `closeMatch clears...` fails with a TypeError, since `result.current.closeMatch` is not a function yet.

- [ ] **Step 3: Write minimal implementation**

In `src/hooks/useMatch.ts`, update the persistence import (currently lines 18-27) to also bring in `upsertHistory`:

```ts
import {
  serialize,
  deserialize,
  upsertTeam,
  removeTeam,
  upsertHistory,
  removeFromHistory,
  buildBackup,
  validateBackup,
  mergeBackup,
} from '../logic/persistence';
```

Extend the `Action` union (currently lines 45-52) with two new variants:

```ts
type Action =
  | { type: 'APPLY_MATCH'; fn: (match: Match) => Match }
  | { type: 'START_MATCH'; args: Parameters<typeof newMatch>[0] }
  | { type: 'END_GAME'; nowMs: number }
  | { type: 'CLEAR_MATCH' }
  | { type: 'SET_THEME'; theme: 'dark' | 'light' }
  | { type: 'UPSERT_TEAM'; team: SavedTeam }
  | { type: 'REMOVE_TEAM'; id: string }
  | { type: 'REMOVE_FROM_HISTORY'; id: string }
  | { type: 'IMPORT_MERGED'; merged: AppState };
```

Add two new cases to the `reducer` function's `switch` (currently lines 54-78), right after the existing `case 'START_MATCH':` case:

```ts
case 'END_GAME': {
  if (!state.match) return state;
  const finished = endGame(state.match, action.nowMs);
  return { ...state, match: finished, history: upsertHistory(state.history, finished) };
}
case 'CLEAR_MATCH':
  return { ...state, match: null };
```

Replace the existing `endGameApi` (currently lines 147-149):

```ts
const endGameApi = useCallback(() => {
  dispatch({ type: 'APPLY_MATCH', fn: (m) => endGame(m, Date.now()) });
}, []);
```

with:

```ts
const endGameApi = useCallback(() => {
  dispatch({ type: 'END_GAME', nowMs: Date.now() });
}, []);
```

Add a new `closeMatchApi` right after it:

```ts
const closeMatchApi = useCallback(() => {
  dispatch({ type: 'CLEAR_MATCH' });
}, []);
```

Add `closeMatch: () => void;` to the `MatchHookApi` interface (currently lines 89-113), right after `endGame: () => void;`:

```ts
export interface MatchHookApi extends HookState {
  startMatch: (args: Parameters<typeof newMatch>[0]) => void;
  endHalf: () => void;
  addExtraTime: () => void;
  endGame: () => void;
  closeMatch: () => void;
  startShootout: () => void;
  // ...rest unchanged
```

Add `closeMatch: closeMatchApi,` to the returned object (currently lines 266-292), right after `endGame: endGameApi,`:

```ts
return {
  ...state,
  startMatch,
  endHalf: endHalfApi,
  addExtraTime: addExtraTimeApi,
  endGame: endGameApi,
  closeMatch: closeMatchApi,
  startShootout: startShootoutApi,
  // ...rest unchanged
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- useMatch.test.ts`
Expected: PASS — all `useMatch.test.ts` tests, including the two new ones.

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useMatch.ts src/hooks/useMatch.test.ts
git commit -m "feat: archive a match into history on endGame, add closeMatch to clear the active match"
```

---

### Task 4: `SummaryScreen`

**Files:**
- Create: `src/components/Summary/SummaryScreen.tsx`
- Test: `src/components/Summary/SummaryScreen.test.tsx`

**Interfaces:**
- Consumes: `Match`, `Team` types from `src/logic/types.ts`; `formatClock(totalSec: number): string` from `src/logic/clock.ts`; `periodLabel(period: Period): string` from Task 2.
- Produces: `SummaryScreen({ match, mode, onClose }: SummaryScreenProps)` where `SummaryScreenProps = { match: Match; mode: 'live' | 'review'; onClose: () => void }` — consumed by Task 6 (`App.tsx`).

This is a read-only screen — it never calls any `useMatch` API method itself; `onClose`'s meaning (archive-and-clear vs. just-stop-viewing) is entirely `App.tsx`'s concern (Task 6), which is why the prop is a bare `() => void` rather than something match-specific.

- [ ] **Step 1: Write the failing test**

Create `src/components/Summary/SummaryScreen.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryScreen } from './SummaryScreen';
import { newMatch, adjustScore, endHalf, endGame } from '../../logic/match';
import type { SavedTeam } from '../../logic/types';

const teamA: SavedTeam = {
  id: 'a1',
  name: 'Lions',
  players: [{ id: 'p1', num: 9, name: 'Alex', starter: true, goalkeeper: false }],
};
const teamB: SavedTeam = {
  id: 'b1',
  name: 'Tigers',
  players: [{ id: 'p2', num: 7, name: 'Jo', starter: true, goalkeeper: false }],
};

function finishedMatch() {
  let m = newMatch({
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: false },
    teamA,
    activeIdsA: ['p1'],
    collapsedA: false,
    teamB,
    activeIdsB: ['p2'],
    collapsedB: false,
    homeTeam: 'teamA',
  });
  m = adjustScore(m, 'teamA', 2, 0);
  m = endHalf(m, 0);
  m = endGame(m, 1000);
  return m;
}

describe('SummaryScreen', () => {
  it('renders the final score and box score in live mode with a New Match button', () => {
    render(<SummaryScreen match={finishedMatch()} mode="live" onClose={vi.fn()} />);
    expect(screen.getByText(/Final: Lions 2 – 0 Tigers/)).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Match' })).toBeInTheDocument();
  });

  it('renders a Back to History button in review mode', () => {
    render(<SummaryScreen match={finishedMatch()} mode="review" onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Back to History' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- SummaryScreen.test.tsx`
Expected: FAIL with "Cannot find module './SummaryScreen'" (the file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/components/Summary/SummaryScreen.tsx`:

```tsx
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { Match, Team } from '../../logic/types';
import { formatClock } from '../../logic/clock';
import { periodLabel } from '../../logic/periodLabel';

export interface SummaryScreenProps {
  match: Match;
  mode: 'live' | 'review';
  onClose: () => void;
}

// periodScores holds one cumulative-score snapshot per period actually played, taken in strict
// ladder order (1 -> 2 -> ET1 -> ET2 -> shootout) by endHalf/addExtraTime/startShootout/endGame --
// so the Nth snapshot always corresponds to the Nth period in this fixed sequence, regardless of
// which of those functions produced it.
const PERIOD_LADDER = [1, 2, 'ET1', 'ET2'] as const;

function periodRows(match: Match): { label: string; teamA: number; teamB: number }[] {
  return match.periodScores.map((snapshot, i) => {
    const prev = i > 0 ? match.periodScores[i - 1] : { teamA: 0, teamB: 0 };
    return {
      label: periodLabel(PERIOD_LADDER[i]),
      teamA: snapshot.teamA - prev.teamA,
      teamB: snapshot.teamB - prev.teamB,
    };
  });
}

function TeamBoxScore({ team }: { team: Team }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {team.name}
      </Typography>
      {team.collapsed ? (
        <Typography>
          Corners: {team.corners} · Offsides: {team.offsides} · Yellow cards: {team.yellowCards} ·
          Red cards: {team.redCards}
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align="right">G</TableCell>
              <TableCell align="right">A</TableCell>
              <TableCell align="right">Shots</TableCell>
              <TableCell align="right">Tackles</TableCell>
              <TableCell align="right">Fouls</TableCell>
              <TableCell align="right">Saves</TableCell>
              <TableCell align="right">YC</TableCell>
              <TableCell align="right">RC</TableCell>
              <TableCell align="right">Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {team.players.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.num}</TableCell>
                <TableCell>
                  {p.name}
                  {p.sentOff ? ' (sent off)' : ''}
                </TableCell>
                <TableCell align="right">{p.goals}</TableCell>
                <TableCell align="right">{p.assists}</TableCell>
                <TableCell align="right">{p.shotsOnGoal}</TableCell>
                <TableCell align="right">{p.tackles}</TableCell>
                <TableCell align="right">{p.foulsCommitted}</TableCell>
                <TableCell align="right">{p.saves}</TableCell>
                <TableCell align="right">{p.yellowCards}</TableCell>
                <TableCell align="right">{p.redCards}</TableCell>
                <TableCell align="right">{formatClock(p.fieldSecs)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

export function SummaryScreen({ match, mode, onClose }: SummaryScreenProps) {
  const rows = periodRows(match);
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Final: {match.teamA.name} {match.score.teamA} – {match.score.teamB} {match.teamB.name}
      </Typography>
      {match.shootout?.winner && (
        <Typography variant="h6" sx={{ mb: 2 }}>
          {match.shootout.winner === 'teamA' ? match.teamA.name : match.teamB.name} win on
          penalties ({match.shootout.attempts.filter((a) => a.team === 'teamA' && a.scored).length}
          –{match.shootout.attempts.filter((a) => a.team === 'teamB' && a.scored).length})
        </Typography>
      )}
      <Table size="small" sx={{ mb: 3, maxWidth: 400 }}>
        <TableHead>
          <TableRow>
            <TableCell>Period</TableCell>
            <TableCell align="right">{match.teamA.name}</TableCell>
            <TableCell align="right">{match.teamB.name}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.label}>
              <TableCell>{r.label}</TableCell>
              <TableCell align="right">{r.teamA}</TableCell>
              <TableCell align="right">{r.teamB}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Divider sx={{ my: 2 }} />
      <TeamBoxScore team={match.teamA} />
      <TeamBoxScore team={match.teamB} />
      <Divider sx={{ my: 2 }} />
      <Typography sx={{ mb: 2 }}>
        Possession: {match.teamA.name} {formatClock(match.possession.accumSec.teamA)} ·{' '}
        {match.teamB.name} {formatClock(match.possession.accumSec.teamB)}
      </Typography>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" gutterBottom>
        Event Log
      </Typography>
      <List dense>
        {match.log.map((entry) => (
          <ListItem key={entry.id}>
            <ListItemText
              primary={`${entry.clockText} ${periodLabel(entry.period)} — ${entry.detail}`}
            />
          </ListItem>
        ))}
      </List>
      <Button variant="contained" onClick={onClose} sx={{ mt: 3 }}>
        {mode === 'live' ? 'New Match' : 'Back to History'}
      </Button>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- SummaryScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/Summary/SummaryScreen.tsx src/components/Summary/SummaryScreen.test.tsx
git commit -m "feat: add read-only SummaryScreen (box score, period table, possession, event log)"
```

---

### Task 5: `HistoryScreen`

**Files:**
- Create: `src/components/History/HistoryScreen.tsx`
- Test: `src/components/History/HistoryScreen.test.tsx`

**Interfaces:**
- Consumes: `Match` type from `src/logic/types.ts`.
- Produces: `HistoryScreen({ history, onReview, onDelete }: HistoryScreenProps)` where `HistoryScreenProps = { history: Match[]; onReview: (id: string) => void; onDelete: (id: string) => void }` — consumed by Task 6 (`App.tsx`), which wires `onReview` to set `historyViewId` and `onDelete` to `api.removeFromHistory`.

- [ ] **Step 1: Write the failing test**

Create `src/components/History/HistoryScreen.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryScreen } from './HistoryScreen';
import { newMatch, adjustScore, endHalf, endGame } from '../../logic/match';
import type { SavedTeam } from '../../logic/types';

const teamA: SavedTeam = { id: 'a1', name: 'Lions', players: [] };
const teamB: SavedTeam = { id: 'b1', name: 'Tigers', players: [] };

function finishedMatch(nowMs: number) {
  let m = newMatch({
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: false },
    teamA,
    activeIdsA: [],
    collapsedA: true,
    teamB,
    activeIdsB: [],
    collapsedB: true,
    homeTeam: 'teamA',
  });
  m = adjustScore(m, 'teamA', 1, 0);
  m = endHalf(m, 0);
  m = endGame(m, nowMs);
  return m;
}

describe('HistoryScreen', () => {
  it('calls onReview with the match id', async () => {
    const onReview = vi.fn();
    const match = finishedMatch(1000);
    render(<HistoryScreen history={[match]} onReview={onReview} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(onReview).toHaveBeenCalledWith(match.id);
  });

  it('calls onDelete after confirming', async () => {
    const onDelete = vi.fn();
    const match = finishedMatch(1000);
    render(<HistoryScreen history={[match]} onReview={vi.fn()} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onDelete).toHaveBeenCalledWith(match.id);
  });

  it('shows an empty state with no history', () => {
    render(<HistoryScreen history={[]} onReview={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('No finished matches yet.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- HistoryScreen.test.tsx`
Expected: FAIL with "Cannot find module './HistoryScreen'" (the file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/components/History/HistoryScreen.tsx`:

```tsx
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Match } from '../../logic/types';

export interface HistoryScreenProps {
  history: Match[];
  onReview: (id: string) => void;
  onDelete: (id: string) => void;
}

function result(match: Match): string {
  const homeScore = match.score[match.homeTeam];
  const awayTeam = match.homeTeam === 'teamA' ? 'teamB' : 'teamA';
  const awayScore = match.score[awayTeam];
  if (homeScore > awayScore) return 'W';
  if (homeScore < awayScore) return 'L';
  return 'T';
}

export function HistoryScreen({ history, onReview, onDelete }: HistoryScreenProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const sorted = history.slice().sort((a, b) => (b.date ?? 0) - (a.date ?? 0));

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        History
      </Typography>
      {sorted.length === 0 ? (
        <Typography color="text.secondary">No finished matches yet.</Typography>
      ) : (
        <List>
          {sorted.map((match) => (
            <ListItem
              key={match.id}
              secondaryAction={
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => onReview(match.id)}>
                    Review
                  </Button>
                  <Button size="small" color="error" onClick={() => setPendingDeleteId(match.id)}>
                    Delete
                  </Button>
                </Stack>
              }
            >
              <ListItemText
                primary={`${match.teamA.name} vs ${match.teamB.name}`}
                secondary={`${match.date ? new Date(match.date).toLocaleDateString() : ''} · ${match.score.teamA}–${match.score.teamB} ${result(match)}`}
              />
            </ListItem>
          ))}
        </List>
      )}
      <Dialog open={pendingDeleteId !== null} onClose={() => setPendingDeleteId(null)}>
        <DialogTitle>Delete this match from history?</DialogTitle>
        <DialogContent>
          <DialogContentText>This cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeleteId(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              if (pendingDeleteId) onDelete(pendingDeleteId);
              setPendingDeleteId(null);
            }}
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- HistoryScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/History/HistoryScreen.tsx src/components/History/HistoryScreen.test.tsx
git commit -m "feat: add HistoryScreen (list past matches, Review, Delete)"
```

---

### Task 6: Wire `App.tsx` — this closes the dead-end end-to-end

**Files:**
- Modify: `src/components/App.tsx` (full-file replacement below)
- Test: `src/components/App.test.tsx`

**Interfaces:**
- Consumes: `api.closeMatch` (Task 3), `SummaryScreen`/`SummaryScreenProps` (Task 4), `HistoryScreen`/`HistoryScreenProps` (Task 5), `api.history`, `api.removeFromHistory` (both already on `MatchHookApi`, unchanged).
- Produces: nothing new for later tasks — this is the last task in the plan.

- [ ] **Step 1: Write the failing tests**

Add these two tests to `src/components/App.test.tsx`, inside the existing `describe('App', ...)` block, after the existing `it('starts a match from Setup and renders the Game screen', ...)` test:

```tsx
it('finishes a match and returns to Setup via New Match, closing the summary dead-end', async () => {
  localStorage.setItem('soccerscore.teams', serialize([teamA, teamB]));
  render(<App />);
  await userEvent.click(screen.getByRole('tab', { name: 'Setup' }));
  await userEvent.click(screen.getAllByRole('button', { name: 'Lions' })[0]);
  await userEvent.click(screen.getAllByRole('button', { name: 'Tigers' })[1]);
  await userEvent.click(screen.getByRole('button', { name: 'Start Match' }));
  await userEvent.click(screen.getByRole('button', { name: 'End Game' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(screen.getByText(/Final: Lions 0 – 0 Tigers/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'New Match' }));
  expect(screen.getByRole('heading', { name: 'Setup' })).toBeInTheDocument();
});

it('reviews a finished match from History read-only and returns via Back to History', async () => {
  localStorage.setItem('soccerscore.teams', serialize([teamA, teamB]));
  render(<App />);
  await userEvent.click(screen.getByRole('tab', { name: 'Setup' }));
  await userEvent.click(screen.getAllByRole('button', { name: 'Lions' })[0]);
  await userEvent.click(screen.getAllByRole('button', { name: 'Tigers' })[1]);
  await userEvent.click(screen.getByRole('button', { name: 'Start Match' }));
  await userEvent.click(screen.getByRole('button', { name: 'End Game' }));
  await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  await userEvent.click(screen.getByRole('button', { name: 'New Match' }));
  await userEvent.click(screen.getByRole('tab', { name: 'History' }));
  await userEvent.click(screen.getByRole('button', { name: 'Review' }));
  expect(screen.getByRole('button', { name: 'Back to History' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Back to History' }));
  expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- App.test.tsx`
Expected: FAIL — both new tests fail because `App.tsx` doesn't yet render `SummaryScreen`/`HistoryScreen` (currently placeholder `Typography` text), so none of the button/heading queries find anything.

- [ ] **Step 3: Write minimal implementation**

Replace the full contents of `src/components/App.tsx` with:

```tsx
import { useEffect, useMemo, useState } from 'react';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '../theme';
import { useMatch } from '../hooks/useMatch';
import { Nav } from './Nav';
import type { HomeView } from './Nav';
import { TeamsScreen } from './Teams/TeamsScreen';
import { SetupScreen } from './Setup/SetupScreen';
import { GameScreen } from './Game/GameScreen';
import { ShootoutScreen } from './Shootout/ShootoutScreen';
import { SummaryScreen } from './Summary/SummaryScreen';
import { HistoryScreen } from './History/HistoryScreen';

function App() {
  const api = useMatch();
  const [homeView, setHomeView] = useState<HomeView>('teams');
  const [historyViewId, setHistoryViewId] = useState<string | null>(null);
  const theme = useMemo(() => createAppTheme(api.theme), [api.theme]);

  const reviewMatch = historyViewId
    ? (api.history.find((m) => m.id === historyViewId) ?? null)
    : null;

  useEffect(() => {
    // Guards against a stale historyViewId (e.g. its entry was deleted while being viewed).
    if (historyViewId && !reviewMatch) setHistoryViewId(null);
  }, [historyViewId, reviewMatch]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {api.match && api.match.screen === 'game' ? (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <GameScreen
            match={api.match}
            onAdjustScore={api.adjustScore}
            onRecordPlayerStat={api.recordPlayerStat}
            onRecordCard={api.recordCard}
            onRecordCorner={api.recordCorner}
            onRecordOffside={api.recordOffside}
            onSubIn={api.subIn}
            onSubOut={api.subOut}
            onSetPossession={api.setPossession}
            onRecordStoppage={api.recordStoppage}
            onToggleClock={api.toggleClock}
            onEndHalf={api.endHalf}
            onAddExtraTime={api.addExtraTime}
            onEndGame={api.endGame}
            onStartShootout={api.startShootout}
            onUndo={api.undo}
          />
        </Container>
      ) : api.match && api.match.screen === 'shootout' ? (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <ShootoutScreen
            match={api.match}
            onRecordAttempt={api.recordAttempt}
            onUndo={api.undo}
            onEndGame={api.endGame}
          />
        </Container>
      ) : api.match && api.match.screen === 'summary' ? (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <SummaryScreen
            match={api.match}
            mode="live"
            onClose={() => {
              api.closeMatch();
              setHomeView('setup');
            }}
          />
        </Container>
      ) : reviewMatch ? (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <SummaryScreen
            match={reviewMatch}
            mode="review"
            onClose={() => setHistoryViewId(null)}
          />
        </Container>
      ) : (
        <>
          <Nav
            homeView={homeView}
            onChangeHomeView={setHomeView}
            onToggleTheme={() => api.setTheme(api.theme === 'dark' ? 'light' : 'dark')}
          />
          <Container maxWidth="md" sx={{ py: 4 }}>
            {homeView === 'teams' && (
              <TeamsScreen
                savedTeams={api.savedTeams}
                onUpsertTeam={api.upsertTeam}
                onRemoveTeam={api.removeTeam}
              />
            )}
            {homeView === 'setup' && (
              <SetupScreen
                savedTeams={api.savedTeams}
                onStartMatch={api.startMatch}
                onExportBackup={api.exportBackup}
                onImportBackup={api.importBackup}
              />
            )}
            {homeView === 'history' && (
              <HistoryScreen
                history={api.history}
                onReview={(id) => setHistoryViewId(id)}
                onDelete={api.removeFromHistory}
              />
            )}
          </Container>
        </>
      )}
    </ThemeProvider>
  );
}

export default App;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- App.test.tsx`
Expected: PASS — all four `App.test.tsx` tests (the original two plus the two new ones).

- [ ] **Step 5: Run the full test suite and build**

Run: `npm run test`
Expected: PASS — every test file in the project.

Run: `npm run build`
Expected: builds cleanly with no TypeScript errors (in particular, no unused-import errors — `Typography` is no longer imported directly in `App.tsx` since both placeholder lines are gone).

- [ ] **Step 6: Commit**

```bash
git add src/components/App.tsx src/components/App.test.tsx
git commit -m "feat: wire SummaryScreen and HistoryScreen into App, closing the summary dead-end"
```

---

## Self-Review Notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-07-20-react-ui-review-results-design.md` maps to a task — archive-on-end-game + `closeMatch` (Task 3), the `periodScores` bugfix (Task 1), the shared `periodLabel` helper (Task 2), `SummaryScreen` (Task 4), `HistoryScreen` (Task 5), and the `App.tsx` dispatch/wiring including the dangling-`historyViewId` guard (Task 6).
- **Placeholder scan:** no TBD/TODO; every function referenced (`upsertHistory`, `snapshotPeriod`, `closeOutAccrual`, `formatClock`, `clockElapsed`, `endGame`, `startShootout`, `recordAttempt`) already exists in the codebase and every new function is given a complete body in its task.
- **Type consistency:** `closeMatch: () => void` (Task 3's `MatchHookApi` addition) matches its Task 6 call site (`api.closeMatch()`); `SummaryScreenProps`'s `mode: 'live' | 'review'` (Task 4) matches Task 6's two call sites (`mode="live"` / `mode="review"`); `HistoryScreenProps`'s `onReview: (id: string) => void` / `onDelete: (id: string) => void` (Task 5) match Task 6's wiring (`onReview={(id) => setHistoryViewId(id)}`, `onDelete={api.removeFromHistory}`, where `removeFromHistory: (id: string) => void` already exists unchanged on `MatchHookApi`).
