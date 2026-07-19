# SoccerScore React UI — Plan 3A: Foundation & Teams — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the MUI-based React UI foundation for SoccerScore — dependencies and per-file Vitest environment scoping, the `useMatch` hook wiring every `src/logic/*.ts` function into React state with `localStorage` persistence, a top-level `App`/`Nav` shell, and a working Teams screen — replacing the Vite template demo page entirely.

**Architecture:** `useMatch` is a single `useReducer`-based hook: every mutating method is a thin wrapper that reads `Date.now()` once and calls straight through to an already-tested pure function in `src/logic/`, dispatching the result back into state. A generic `APPLY_MATCH` action (payload: `(match: Match) => Match`) covers all fourteen match-mutating methods so the reducer itself stays small; `localStorage` persistence is a `useEffect` per state slice. `App.tsx` is the top-level dispatcher: if a match exists, show a temporary "in progress" placeholder (Game/Shootout/Summary screens are Plan 3B/3C); otherwise render `Nav` + whichever `homeView` tab is active. Only the Teams tab is fully built this plan; Setup and History tabs show simple placeholder text until Plans 3B and 3C replace them.

**Tech Stack:** React 19.2, TypeScript ~6.0 (`verbatimModuleSyntax`, `noUnusedLocals`/`noUnusedParameters` — see Global Constraints), Vite ^8.1, Vitest ^4.1 (`node` env for logic tests, `jsdom` for new component/hook tests via a per-file pragma), `@mui/material` + `@emotion/react` + `@emotion/styled`, `@fontsource/roboto`, `@testing-library/react` + `jest-dom` + `user-event`, Playwright ^1.61.

## Global Constraints

- No routing library — screens are dispatched by plain React conditionals on `Match.screen`/`homeView` state, per the design spec's Architecture section.
- MUI (`@mui/material`, `@emotion/react`, `@emotion/styled`) is the only UI/component library added this plan. Do **not** add `@mui/icons-material` or any other icon package — use plain text/Unicode glyphs in `IconButton`s (e.g. `✕`, `☾`) with an explicit `aria-label`.
- `@fontsource/roboto` is self-hosted — no external Google Fonts `<link>` or CDN request anywhere.
- `Date.now()` must be read only inside `src/hooks/useMatch.ts`. Every function under `src/logic/` already takes `nowMs` as a parameter and must stay that way — never call `Date.now()` from inside `src/logic/`.
- Every `src/logic/*.ts` mutator returns a new object via its own `clone()`/`structuredClone` discipline. Never mutate a `Match`, `Team`, `Player`, or `SavedTeam` object in place anywhere in `src/hooks/` or `src/components/` — always go through the exported logic functions, or (for pure UI-only state like a `TeamEditor`'s in-progress form) use immutable array/object spreads.
- TDD: for every new file with logic (hook, components with interaction logic), write the test(s) first, confirm they fail for the expected reason, then implement.
- Vitest environment scoping: `src/logic/**/*.test.ts` stays on the default `node` environment (no pragma needed). Every new component/hook test file that touches the DOM must have `// @vitest-environment jsdom` as its first line.
- oxlint (not ESLint) is the linter (`npm run lint`); it must stay clean (existing rules: `react/rules-of-hooks: error`, `react/only-export-components: warn`).
- `.prettierrc` formatting (`singleQuote: true, semi: true, tabWidth: 2, printWidth: 100`) applies to all new `.ts`/`.tsx` files — run `npm run format` before each commit if unsure.
- The existing 106 Vitest logic-layer tests must keep passing unchanged throughout every task in this plan.
- The Playwright baseline screenshot intentionally changes in Task 5 only (once the demo page is gone) — it must keep passing (old baseline) through Tasks 1-4.

---

### Task 1: MUI/testing dependencies, theme, and Vitest environment scoping

**Files:**
- Modify: `package.json` (via `npm install`)
- Modify: `vite.config.ts`
- Create: `src/theme.ts`
- Create: `src/theme.test.ts`
- Create: `src/test/setupTests.ts`

**Interfaces:**
- Produces: `createAppTheme(mode: 'light' | 'dark'): Theme` (from `@mui/material/styles`) — consumed by Task 4's `App.tsx`.
- Produces: Vitest config change — any test file starting with the line `// @vitest-environment jsdom` runs under jsdom; all others (including every existing `src/logic/**/*.test.ts`) stay on `node`. Consumed by every later task's test files.

- [ ] **Step 1: Install runtime dependencies**

Run: `npm install @mui/material @emotion/react @emotion/styled @fontsource/roboto`

Expected: `package.json`'s `dependencies` gains these four packages (alongside the existing `react`/`react-dom`).

- [ ] **Step 2: Install dev/test dependencies**

Run: `npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`

Expected: `package.json`'s `devDependencies` gains these four packages.

- [ ] **Step 3: Write the failing test for `theme.ts`**

Create `src/theme.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createAppTheme } from './theme';

describe('createAppTheme', () => {
  it('creates a dark-mode theme', () => {
    expect(createAppTheme('dark').palette.mode).toBe('dark');
  });

  it('creates a light-mode theme', () => {
    expect(createAppTheme('light').palette.mode).toBe('light');
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm run test -- src/theme.test.ts`
Expected: FAIL — `Cannot find module './theme'` (or similar module-not-found error).

- [ ] **Step 5: Implement `theme.ts`**

Create `src/theme.ts`:

```ts
import { createTheme, type Theme } from '@mui/material/styles';

export function createAppTheme(mode: 'light' | 'dark'): Theme {
  return createTheme({ palette: { mode } });
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- src/theme.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Add the jest-dom Vitest setup file**

Create `src/test/setupTests.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 8: Update Vitest config for jsdom-scoped component/hook tests**

Modify `vite.config.ts` to the following full contents:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/soccerscore/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/test/setupTests.ts'],
  },
});
```

- [ ] **Step 9: Run the full test suite to confirm nothing broke**

Run: `npm run test`
Expected: PASS — all 106 existing logic tests plus the 2 new `theme.test.ts` tests (108 total), all still on `node` (no test file has the jsdom pragma yet).

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/theme.ts src/theme.test.ts src/test/setupTests.ts
git commit -m "Add MUI/testing dependencies, theme.ts, and jsdom-scoped Vitest config"
```

---

### Task 2: `useMatch` hook

**Files:**
- Create: `src/hooks/useMatch.ts`
- Create: `src/hooks/useMatch.test.ts`

**Interfaces:**
- Consumes: every function exported from `src/logic/match.ts`, `src/logic/clock.ts`, `src/logic/stats.ts`, `src/logic/shootout.ts`, `src/logic/undo.ts`, `src/logic/persistence.ts`, `src/logic/log.ts` (all read in full above — exact signatures below).
- Produces:
  - `export interface MatchHookApi` — see full shape in Step 5 below. Consumed by Task 3 (`TeamsScreen`/`TeamEditor` don't use it directly — App does) and Task 4 (`App.tsx`).
  - `export type ImportSummary` (alias of `src/logic/persistence.ts`'s `MergeSummary`).
  - `export function useMatch(): MatchHookApi`.

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useMatch.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMatch } from './useMatch';
import type { SavedTeam } from '../logic/types';

const teamA: SavedTeam = {
  id: 'teamA-1',
  name: 'Lions',
  players: [
    { id: 'p1', num: 9, name: 'Alex', starter: true, goalkeeper: false },
    { id: 'p2', num: 1, name: 'Sam', starter: true, goalkeeper: true },
  ],
};
const teamB: SavedTeam = {
  id: 'teamB-1',
  name: 'Tigers',
  players: [{ id: 'p3', num: 7, name: 'Jo', starter: true, goalkeeper: false }],
};

function startArgs() {
  return {
    config: { halfLengthMin: 30, hasExtraTime: false, extraTimeLengthMin: 10, hasShootout: false },
    teamA,
    activeIdsA: ['p1', 'p2'],
    collapsedA: false,
    teamB,
    activeIdsB: ['p3'],
    collapsedB: false,
    homeTeam: 'teamA' as const,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('useMatch', () => {
  it('hydrates initial state from localStorage', () => {
    localStorage.setItem('soccerscore.teams', JSON.stringify([teamA]));
    localStorage.setItem('soccerscore.theme', 'light');
    const { result } = renderHook(() => useMatch());
    expect(result.current.savedTeams).toEqual([teamA]);
    expect(result.current.theme).toBe('light');
    expect(result.current.match).toBeNull();
  });

  it('startMatch creates a match and persists it to localStorage', () => {
    const { result } = renderHook(() => useMatch());
    act(() => result.current.startMatch(startArgs()));
    expect(result.current.match).not.toBeNull();
    expect(result.current.match?.teamA.name).toBe('Lions');
    expect(JSON.parse(localStorage.getItem('soccerscore.match')!).teamA.name).toBe('Lions');
  });

  it('adjustScore calls through to the logic layer and updates state', () => {
    const { result } = renderHook(() => useMatch());
    act(() => result.current.startMatch(startArgs()));
    act(() => result.current.adjustScore('teamA', 1));
    expect(result.current.match?.score.teamA).toBe(1);
  });

  it('undo reverses the last logged action', () => {
    const { result } = renderHook(() => useMatch());
    act(() => result.current.startMatch(startArgs()));
    act(() => result.current.adjustScore('teamA', 1));
    act(() => result.current.undo());
    expect(result.current.match?.score.teamA).toBe(0);
  });

  it('upsertTeam and removeTeam manage the saved-team library and persist it', () => {
    const { result } = renderHook(() => useMatch());
    act(() => result.current.upsertTeam(teamA));
    expect(result.current.savedTeams).toEqual([teamA]);
    expect(JSON.parse(localStorage.getItem('soccerscore.teams')!)).toEqual([teamA]);
    act(() => result.current.removeTeam(teamA.id));
    expect(result.current.savedTeams).toEqual([]);
  });

  it('setTheme updates and persists the theme', () => {
    const { result } = renderHook(() => useMatch());
    act(() => result.current.setTheme('light'));
    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('soccerscore.theme')).toBe('light');
  });

  it('exportBackup triggers a file download', () => {
    const { result } = renderHook(() => useMatch());
    act(() => result.current.upsertTeam(teamA));
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    act(() => result.current.exportBackup());
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('importBackup merges a valid backup file and returns a summary', async () => {
    const { result } = renderHook(() => useMatch());
    const backupJson = JSON.stringify({
      app: 'soccerscore',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      teams: [teamB],
      history: [],
      match: null,
    });
    const file = new File([backupJson], 'backup.json', { type: 'application/json' });
    let summary;
    await act(async () => {
      summary = await result.current.importBackup(file);
    });
    expect(summary).toEqual({
      teamsAdded: 1,
      teamsUpdated: 0,
      gamesAdded: 0,
      gamesUpdated: 0,
      matchRestored: false,
      matchSkipped: false,
    });
    expect(result.current.savedTeams).toEqual([teamB]);
  });

  it('importBackup rejects a file that is not valid JSON', async () => {
    const { result } = renderHook(() => useMatch());
    const file = new File(['not json'], 'backup.json', { type: 'application/json' });
    await expect(result.current.importBackup(file)).rejects.toThrow('not valid JSON');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/hooks/useMatch.test.ts`
Expected: FAIL — `Cannot find module './useMatch'` (or similar).

- [ ] **Step 3: Implement `useMatch.ts`**

Create `src/hooks/useMatch.ts`:

```ts
import { useCallback, useEffect, useReducer } from 'react';
import type { Match, SavedTeam, TeamKey } from '../logic/types';
import type { PlayerStatField } from '../logic/stats';
import type { AppState, MergeSummary } from '../logic/persistence';
import { newMatch, adjustScore, endHalf, addExtraTime, endGame } from '../logic/match';
import { toggleClock, recordStoppage } from '../logic/clock';
import {
  recordPlayerStat,
  recordCard,
  recordCorner,
  recordOffside,
  subIn,
  subOut,
  setPossession,
} from '../logic/stats';
import { startShootout, recordAttempt } from '../logic/shootout';
import { undo } from '../logic/undo';
import {
  serialize,
  deserialize,
  upsertTeam,
  removeTeam,
  removeFromHistory,
  buildBackup,
  validateBackup,
  mergeBackup,
} from '../logic/persistence';

export type ImportSummary = MergeSummary;

const KEYS = {
  teams: 'soccerscore.teams',
  match: 'soccerscore.match',
  history: 'soccerscore.history',
  theme: 'soccerscore.theme',
};

interface HookState {
  match: Match | null;
  savedTeams: SavedTeam[];
  history: Match[];
  theme: 'dark' | 'light';
}

type Action =
  | { type: 'APPLY_MATCH'; fn: (match: Match) => Match }
  | { type: 'START_MATCH'; args: Parameters<typeof newMatch>[0] }
  | { type: 'SET_THEME'; theme: 'dark' | 'light' }
  | { type: 'UPSERT_TEAM'; team: SavedTeam }
  | { type: 'REMOVE_TEAM'; id: string }
  | { type: 'REMOVE_FROM_HISTORY'; id: string }
  | { type: 'IMPORT_MERGED'; merged: AppState };

function reducer(state: HookState, action: Action): HookState {
  switch (action.type) {
    case 'APPLY_MATCH':
      return state.match ? { ...state, match: action.fn(state.match) } : state;
    case 'START_MATCH':
      return { ...state, match: newMatch(action.args) };
    case 'SET_THEME':
      return { ...state, theme: action.theme };
    case 'UPSERT_TEAM':
      return { ...state, savedTeams: upsertTeam(state.savedTeams, action.team) };
    case 'REMOVE_TEAM':
      return { ...state, savedTeams: removeTeam(state.savedTeams, action.id) };
    case 'REMOVE_FROM_HISTORY':
      return { ...state, history: removeFromHistory(state.history, action.id) };
    case 'IMPORT_MERGED':
      return {
        ...state,
        match: action.merged.match,
        savedTeams: action.merged.teams,
        history: action.merged.history,
      };
    default:
      return state;
  }
}

function loadInitialState(): HookState {
  const savedTeams = deserialize<SavedTeam[]>(localStorage.getItem(KEYS.teams)) ?? [];
  const match = deserialize<Match>(localStorage.getItem(KEYS.match));
  const history = deserialize<Match[]>(localStorage.getItem(KEYS.history)) ?? [];
  const rawTheme = localStorage.getItem(KEYS.theme);
  const theme: 'dark' | 'light' = rawTheme === 'light' ? 'light' : 'dark';
  return { match, savedTeams, history, theme };
}

export interface MatchHookApi extends HookState {
  startMatch: (args: Parameters<typeof newMatch>[0]) => void;
  endHalf: () => void;
  addExtraTime: () => void;
  endGame: () => void;
  startShootout: () => void;
  undo: () => void;
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
  upsertTeam: (team: SavedTeam) => void;
  removeTeam: (id: string) => void;
  removeFromHistory: (id: string) => void;
  exportBackup: () => void;
  importBackup: (file: File) => Promise<ImportSummary>;
  setTheme: (theme: 'dark' | 'light') => void;
}

export function useMatch(): MatchHookApi {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);

  useEffect(() => {
    if (state.match) localStorage.setItem(KEYS.match, serialize(state.match));
    else localStorage.removeItem(KEYS.match);
  }, [state.match]);

  useEffect(() => {
    localStorage.setItem(KEYS.teams, serialize(state.savedTeams));
  }, [state.savedTeams]);

  useEffect(() => {
    localStorage.setItem(KEYS.history, serialize(state.history));
  }, [state.history]);

  useEffect(() => {
    localStorage.setItem(KEYS.theme, state.theme);
  }, [state.theme]);

  const startMatch = useCallback((args: Parameters<typeof newMatch>[0]) => {
    dispatch({ type: 'START_MATCH', args });
  }, []);

  const endHalfApi = useCallback(() => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => endHalf(m, Date.now()) });
  }, []);

  const addExtraTimeApi = useCallback(() => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => addExtraTime(m, Date.now()) });
  }, []);

  const endGameApi = useCallback(() => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => endGame(m, Date.now()) });
  }, []);

  const startShootoutApi = useCallback(() => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => startShootout(m, Date.now()) });
  }, []);

  const undoApi = useCallback(() => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => undo(m) });
  }, []);

  const adjustScoreApi = useCallback((team: TeamKey, delta: number) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => adjustScore(m, team, delta, Date.now()) });
  }, []);

  const recordPlayerStatApi = useCallback(
    (team: TeamKey, playerId: string, stat: PlayerStatField) => {
      dispatch({ type: 'APPLY_MATCH', fn: (m) => recordPlayerStat(m, team, playerId, stat, Date.now()) });
    },
    [],
  );

  const recordCardApi = useCallback((team: TeamKey, playerId: string | null, color: 'yellow' | 'red') => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => recordCard(m, team, playerId, color, Date.now()) });
  }, []);

  const recordCornerApi = useCallback((team: TeamKey) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => recordCorner(m, team, Date.now()) });
  }, []);

  const recordOffsideApi = useCallback((team: TeamKey) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => recordOffside(m, team, Date.now()) });
  }, []);

  const subInApi = useCallback((team: TeamKey, playerId: string) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => subIn(m, team, playerId, Date.now()) });
  }, []);

  const subOutApi = useCallback((team: TeamKey, playerId: string) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => subOut(m, team, playerId, Date.now()) });
  }, []);

  const setPossessionApi = useCallback((team: TeamKey) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => setPossession(m, team, Date.now()) });
  }, []);

  const recordStoppageApi = useCallback((addedSec: number) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => recordStoppage(m, addedSec, Date.now()) });
  }, []);

  const toggleClockApi = useCallback(() => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => toggleClock(m, Date.now()) });
  }, []);

  const recordAttemptApi = useCallback((team: TeamKey, scored: boolean) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => recordAttempt(m, team, scored, Date.now()) });
  }, []);

  const upsertTeamApi = useCallback((team: SavedTeam) => {
    dispatch({ type: 'UPSERT_TEAM', team });
  }, []);

  const removeTeamApi = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TEAM', id });
  }, []);

  const removeFromHistoryApi = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_FROM_HISTORY', id });
  }, []);

  const setThemeApi = useCallback((theme: 'dark' | 'light') => {
    dispatch({ type: 'SET_THEME', theme });
  }, []);

  const exportBackup = useCallback(() => {
    const backup = buildBackup(
      { teams: state.savedTeams, history: state.history, match: state.match },
      Date.now(),
    );
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soccerscore-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.savedTeams, state.history, state.match]);

  const importBackup = useCallback(
    async (file: File): Promise<ImportSummary> => {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Invalid backup file: not valid JSON.');
      }
      const result = validateBackup(parsed);
      if (!result.ok) throw new Error(result.reason);
      const { state: merged, summary } = mergeBackup(
        { teams: state.savedTeams, history: state.history, match: state.match },
        result.backup,
      );
      dispatch({ type: 'IMPORT_MERGED', merged });
      return summary;
    },
    [state.savedTeams, state.history, state.match],
  );

  return {
    ...state,
    startMatch,
    endHalf: endHalfApi,
    addExtraTime: addExtraTimeApi,
    endGame: endGameApi,
    startShootout: startShootoutApi,
    undo: undoApi,
    adjustScore: adjustScoreApi,
    recordPlayerStat: recordPlayerStatApi,
    recordCard: recordCardApi,
    recordCorner: recordCornerApi,
    recordOffside: recordOffsideApi,
    subIn: subInApi,
    subOut: subOutApi,
    setPossession: setPossessionApi,
    recordStoppage: recordStoppageApi,
    toggleClock: toggleClockApi,
    recordAttempt: recordAttemptApi,
    upsertTeam: upsertTeamApi,
    removeTeam: removeTeamApi,
    removeFromHistory: removeFromHistoryApi,
    exportBackup,
    importBackup,
    setTheme: setThemeApi,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/hooks/useMatch.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npm run test`
Expected: PASS (117 tests: 106 logic + 2 theme + 9 useMatch).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useMatch.ts src/hooks/useMatch.test.ts
git commit -m "Add useMatch hook wiring the logic layer to React state + localStorage"
```

---

### Task 3: Teams screen (`TeamsScreen` + `TeamEditor`)

**Files:**
- Create: `src/components/Teams/TeamsScreen.tsx`
- Create: `src/components/Teams/TeamsScreen.test.tsx`
- Create: `src/components/Teams/TeamEditor.tsx`
- Create: `src/components/Teams/TeamEditor.test.tsx`

**Interfaces:**
- Consumes: `makeId(): string` from `src/logic/log.ts`; `SavedPlayer`/`SavedTeam` from `src/logic/types.ts`.
- Produces:
  - `export interface TeamsScreenProps { savedTeams: SavedTeam[]; onUpsertTeam: (team: SavedTeam) => void; onRemoveTeam: (id: string) => void; }` and `export function TeamsScreen(props: TeamsScreenProps)` — consumed by Task 4's `App.tsx`, wired to `useMatch()`'s `savedTeams`/`upsertTeam`/`removeTeam`.
  - `export interface TeamEditorProps { team: SavedTeam | null; onSave: (team: SavedTeam) => void; onCancel: () => void; }` and `export function TeamEditor(props: TeamEditorProps)` — used internally by `TeamsScreen`, not consumed elsewhere in this plan.

- [ ] **Step 1: Write the failing `TeamEditor` tests**

Create `src/components/Teams/TeamEditor.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamEditor } from './TeamEditor';

describe('TeamEditor', () => {
  it('adds a player row and includes it on save', async () => {
    const onSave = vi.fn();
    render(<TeamEditor team={null} onSave={onSave} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Team name'), 'Tigers');
    await userEvent.click(screen.getByRole('button', { name: 'Add Player' }));
    await userEvent.type(screen.getByLabelText('Name'), 'Jo');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Tigers',
        players: [expect.objectContaining({ name: 'Jo' })],
      }),
    );
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<TeamEditor team={null} onSave={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/components/Teams/TeamEditor.test.tsx`
Expected: FAIL — `Cannot find module './TeamEditor'`.

- [ ] **Step 3: Implement `TeamEditor.tsx`**

Create `src/components/Teams/TeamEditor.tsx`:

```tsx
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { makeId } from '../../logic/log';
import type { SavedPlayer, SavedTeam } from '../../logic/types';

export interface TeamEditorProps {
  team: SavedTeam | null;
  onSave: (team: SavedTeam) => void;
  onCancel: () => void;
}

function blankPlayer(): SavedPlayer {
  return { id: makeId(), num: 0, name: '', starter: true, goalkeeper: false };
}

export function TeamEditor({ team, onSave, onCancel }: TeamEditorProps) {
  const [name, setName] = useState(team?.name ?? '');
  const [players, setPlayers] = useState<SavedPlayer[]>(team?.players ?? []);

  function updatePlayer(id: string, patch: Partial<SavedPlayer>) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  function addPlayer() {
    setPlayers((prev) => [...prev, blankPlayer()]);
  }

  function handleSave() {
    onSave({ id: team?.id ?? makeId(), name, players });
  }

  return (
    <Box component="form" onSubmit={(e) => e.preventDefault()}>
      <Typography variant="h6" gutterBottom>
        {team ? 'Edit Team' : 'Add Team'}
      </Typography>
      <TextField
        label="Team name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Roster
      </Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {players.map((p) => (
          <Stack key={p.id} direction="row" spacing={1} alignItems="center">
            <TextField
              label="#"
              type="number"
              value={p.num}
              onChange={(e) => updatePlayer(p.id, { num: Number(e.target.value) })}
              sx={{ width: 80 }}
            />
            <TextField
              label="Name"
              value={p.name}
              onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
              sx={{ flexGrow: 1 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={p.starter}
                  onChange={(e) => updatePlayer(p.id, { starter: e.target.checked })}
                />
              }
              label="Starter"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={p.goalkeeper}
                  onChange={(e) => updatePlayer(p.id, { goalkeeper: e.target.checked })}
                />
              }
              label="GK"
            />
            <IconButton aria-label={`Remove ${p.name || 'player'}`} onClick={() => removePlayer(p.id)}>
              ✕
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Button onClick={addPlayer} sx={{ mt: 1 }}>
        Add Player
      </Button>
      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
          Save
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/components/Teams/TeamEditor.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing `TeamsScreen` tests**

Create `src/components/Teams/TeamsScreen.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamsScreen } from './TeamsScreen';
import type { SavedTeam } from '../../logic/types';

const team: SavedTeam = {
  id: 't1',
  name: 'Lions',
  players: [{ id: 'p1', num: 9, name: 'Alex', starter: true, goalkeeper: false }],
};

describe('TeamsScreen', () => {
  it('lists saved teams and removes one on Delete', async () => {
    const onRemoveTeam = vi.fn();
    render(<TeamsScreen savedTeams={[team]} onUpsertTeam={vi.fn()} onRemoveTeam={onRemoveTeam} />);
    expect(screen.getByText('Lions')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onRemoveTeam).toHaveBeenCalledWith('t1');
  });

  it('opens the editor and saves a new team', async () => {
    const onUpsertTeam = vi.fn();
    render(<TeamsScreen savedTeams={[]} onUpsertTeam={onUpsertTeam} onRemoveTeam={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add Team' }));
    await userEvent.type(screen.getByLabelText('Team name'), 'Tigers');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onUpsertTeam).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tigers', players: [] }));
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npm run test -- src/components/Teams/TeamsScreen.test.tsx`
Expected: FAIL — `Cannot find module './TeamsScreen'`.

- [ ] **Step 7: Implement `TeamsScreen.tsx`**

Create `src/components/Teams/TeamsScreen.tsx`:

```tsx
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { TeamEditor } from './TeamEditor';
import type { SavedTeam } from '../../logic/types';

export interface TeamsScreenProps {
  savedTeams: SavedTeam[];
  onUpsertTeam: (team: SavedTeam) => void;
  onRemoveTeam: (id: string) => void;
}

export function TeamsScreen({ savedTeams, onUpsertTeam, onRemoveTeam }: TeamsScreenProps) {
  const [editing, setEditing] = useState<SavedTeam | 'new' | null>(null);

  if (editing !== null) {
    return (
      <TeamEditor
        team={editing === 'new' ? null : editing}
        onSave={(team) => {
          onUpsertTeam(team);
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Teams
      </Typography>
      <List>
        {savedTeams.map((team) => (
          <ListItem
            key={team.id}
            secondaryAction={
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => setEditing(team)}>
                  Edit
                </Button>
                <Button size="small" color="error" onClick={() => onRemoveTeam(team.id)}>
                  Delete
                </Button>
              </Stack>
            }
          >
            <ListItemText primary={team.name} secondary={`${team.players.length} players`} />
          </ListItem>
        ))}
      </List>
      <Button variant="contained" onClick={() => setEditing('new')}>
        Add Team
      </Button>
    </Box>
  );
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm run test -- src/components/Teams/TeamsScreen.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Run the full suite to confirm no regressions**

Run: `npm run test`
Expected: PASS (121 tests: 117 from before + 4 new).

- [ ] **Step 10: Commit**

```bash
git add src/components/Teams/TeamsScreen.tsx src/components/Teams/TeamsScreen.test.tsx src/components/Teams/TeamEditor.tsx src/components/Teams/TeamEditor.test.tsx
git commit -m "Add Teams screen (TeamsScreen + TeamEditor)"
```

---

### Task 4: App shell, Nav, and demo-page removal

**Files:**
- Create: `src/components/App.tsx`
- Create: `src/components/App.test.tsx`
- Create: `src/components/Nav.tsx`
- Modify: `src/main.tsx`
- Modify: `src/index.css`
- Delete: `src/App.tsx`
- Delete: `src/App.css`
- Delete: `src/assets/hero.png`
- Delete: `src/assets/react.svg`
- Delete: `src/assets/vite.svg`
- Delete: `public/icons.svg`

**Interfaces:**
- Consumes: `createAppTheme` (Task 1), `useMatch`/`MatchHookApi` (Task 2), `TeamsScreen`/`TeamsScreenProps` (Task 3).
- Produces: `export type HomeView = 'setup' | 'teams' | 'history'` and `export function Nav(props: NavProps)` from `Nav.tsx` — consumed only by `App.tsx` in this plan; Plans 3B/3C will read `HomeView` again when they add real Setup/History screens in place of the placeholders.
- Produces: `export default function App()` from `src/components/App.tsx`, replacing `src/App.tsx` as the app's root component (imported by `main.tsx`).

- [ ] **Step 1: Write the failing `App` test**

Create `src/components/App.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the Teams tab by default and can switch to Setup', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Teams' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Setup' }));
    expect(screen.getByText(/coming in the next update/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/App.test.tsx`
Expected: FAIL — `Cannot find module './App'` (no file at `src/components/App.tsx` yet).

- [ ] **Step 3: Implement `Nav.tsx`**

Create `src/components/Nav.tsx`:

```tsx
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

export type HomeView = 'setup' | 'teams' | 'history';

export interface NavProps {
  homeView: HomeView;
  onChangeHomeView: (view: HomeView) => void;
  onToggleTheme: () => void;
}

export function Nav({ homeView, onChangeHomeView, onToggleTheme }: NavProps) {
  return (
    <AppBar position="static" color="default">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Soccer Score
        </Typography>
        <Tabs
          value={homeView}
          onChange={(_e, value: HomeView) => onChangeHomeView(value)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="Setup" value="setup" />
          <Tab label="Teams" value="teams" />
          <Tab label="History" value="history" />
        </Tabs>
        <IconButton aria-label="Toggle theme" onClick={onToggleTheme} color="inherit">
          ☾
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
```

- [ ] **Step 4: Implement `App.tsx`**

Create `src/components/App.tsx`:

```tsx
import { useMemo, useState } from 'react';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { createAppTheme } from '../theme';
import { useMatch } from '../hooks/useMatch';
import { Nav } from './Nav';
import type { HomeView } from './Nav';
import { TeamsScreen } from './Teams/TeamsScreen';

function App() {
  const api = useMatch();
  const [homeView, setHomeView] = useState<HomeView>('teams');
  const theme = useMemo(() => createAppTheme(api.theme), [api.theme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {api.match ? (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography>
            A match is in progress. Resuming and playing a match arrive in the next update.
          </Typography>
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
            {homeView === 'setup' && <Typography>Match setup is coming in the next update.</Typography>}
            {homeView === 'history' && (
              <Typography>Match history is coming in a future update.</Typography>
            )}
          </Container>
        </>
      )}
    </ThemeProvider>
  );
}

export default App;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/components/App.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Update `main.tsx` to self-host Roboto and point at the new `App`**

Modify `src/main.tsx` to the following full contents:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './index.css';
import App from './components/App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 7: Simplify `index.css`**

Replace the full contents of `src/index.css` with:

```css
html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
}
```

- [ ] **Step 8: Delete the Vite template demo files**

Run:

```bash
git rm src/App.tsx src/App.css src/assets/hero.png src/assets/react.svg src/assets/vite.svg public/icons.svg
```

Expected: all six files removed and staged for deletion.

- [ ] **Step 9: Run the full test suite and build to confirm no regressions**

Run: `npm run test`
Expected: PASS (122 tests: 121 from before + 1 new `App.test.tsx`; note the old `src/App.tsx` had no test file, so no test count decreases).

Run: `npm run build`
Expected: builds cleanly (0 TypeScript errors). This confirms nothing still imports the deleted demo files.

- [ ] **Step 10: Commit**

```bash
git add src/components/App.tsx src/components/App.test.tsx src/components/Nav.tsx src/main.tsx src/index.css
git commit -m "Replace Vite demo page with MUI App shell, Nav, and Teams screen wiring"
```

---

### Task 5: Regenerate the Playwright baseline for the new App shell

**Files:**
- Modify: `e2e/app.spec.ts`
- Modify: `e2e/app.spec.ts-snapshots/app-home-chromium-win32.png` (regenerated)
- Modify: `e2e/app.spec.ts-snapshots/app-home-chromium-linux.png` (regenerated)

**Interfaces:**
- Consumes: the finished `App.tsx` from Task 4 (must be the last task, since the demo page it replaces is what the current baseline screenshots depict).

- [ ] **Step 1: Update the Playwright spec's assertions for the new home page**

Modify `e2e/app.spec.ts` to the following full contents:

```ts
import { test, expect } from '@playwright/test';

test('home page renders the Teams tab and matches baseline screenshot', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();
  await expect(page).toHaveScreenshot('app-home.png');
});
```

- [ ] **Step 2: Build and regenerate the win32 baseline locally**

Run: `npm run build`
Expected: builds cleanly.

Run: `npm run test:e2e -- --update-snapshots`
Expected: the test runs, fails the screenshot comparison against the *old* baseline (expected — the page changed), and writes a new `e2e/app.spec.ts-snapshots/app-home-chromium-win32.png`.

- [ ] **Step 3: Regenerate the linux baseline via Docker (matching the CI container image)**

Run (from the repo root, Docker Desktop running):

```bash
docker run --rm -v "$(pwd)":/work -w /work mcr.microsoft.com/playwright:v1.61.1-noble bash -c "npm ci && npm run build && npx playwright test --update-snapshots"
```

Expected: the container installs dependencies, builds, and writes a new `e2e/app.spec.ts-snapshots/app-home-chromium-linux.png`. This mirrors the same technique used in Phase 1 to keep the win32 dev-machine baseline and the `ubuntu-latest`/`mcr.microsoft.com/playwright` CI baseline both present and both green.

- [ ] **Step 4: Verify both baselines now pass without `--update-snapshots`**

Run: `npm run test:e2e`
Expected: PASS (win32 baseline matches, run natively on the dev machine).

Run:

```bash
docker run --rm -v "$(pwd)":/work -w /work mcr.microsoft.com/playwright:v1.61.1-noble bash -c "npm ci && npm run build && npx playwright test"
```

Expected: PASS (linux baseline matches, run inside the same container image CI uses).

- [ ] **Step 5: Commit**

```bash
git add e2e/app.spec.ts e2e/app.spec.ts-snapshots/app-home-chromium-win32.png e2e/app.spec.ts-snapshots/app-home-chromium-linux.png
git commit -m "Regenerate Playwright baseline for the new MUI App shell"
```

---

## Self-Review

**Spec coverage:** every item the design spec assigns to Plan 3A is covered — MUI/Emotion/Fontsource/RTL deps and jsdom-scoped Vitest config (Task 1), the full `useMatch` hook with every `MatchHookApi` method (Task 2), the Teams screen (Task 3), the App shell/Nav top-level dispatcher (Task 4), and the Playwright baseline regeneration explicitly called out in the spec's Self-Review Notes as Plan 3A's responsibility (Task 5).

**Placeholder scan:** no TBD/TODO in any step. The "Setup screen coming in the next update" / "Match history coming in a future update" strings in `App.tsx` are real, working, tested UI (Task 4's test asserts on that exact text) standing in for screens the spec explicitly assigns to Plans 3B/3C — not unfinished work in this plan.

**Type consistency:** `TeamsScreenProps`'s `onUpsertTeam`/`onRemoveTeam` (Task 3) match `MatchHookApi`'s `upsertTeam`/`removeTeam` signatures (Task 2) exactly, and `App.tsx` (Task 4) wires them 1:1. `Nav`'s `HomeView` type is defined once in `Nav.tsx` and imported by `App.tsx`, not redefined. `useMatch`'s `Parameters<typeof newMatch>[0]` is used consistently instead of inventing a separate `NewMatchArgs` type name not present in `src/logic/match.ts`.

**Ambiguity check:** the one deliberate scope decision — `App.tsx` showing a placeholder instead of the full match-lifecycle dispatcher from the design spec's Architecture section — is explained in this plan's own Architecture paragraph and in Task 4's file list, so it won't read as a surprise or a bug during review. Plan 3B will replace that placeholder branch with the real Setup/Game screens and Plan 3C will replace the History placeholder and add the Summary screen; neither requires reopening `useMatch.ts`, since Task 2 already implements every method the spec's `MatchHookApi` interface defines.
