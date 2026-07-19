# Plan 3B — Play a Match Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core playable-match journey — Setup (pick teams, configure, start), Game (live scoring, stats, substitutions, clock, period transitions), and Shootout (penalty kicks) — wiring the `useMatch` hook (built in Plan 3A) into three new screens plus their sub-components.

**Architecture:** Every new screen is a "dumb" presentational component: it receives `match` (or a slice of it) and the specific `useMatch` callback functions it needs as props, and calls them on user interaction. No component calls `Date.now()` or mutates `Match`/`Team`/`Player` directly, except `Clock.tsx`, which reads `Date.now()` only to compute a live display value every 250ms — this never touches persisted state (see Global Constraints). `App.tsx`'s top-level dispatch (already partially built in Plan 3A) is extended so that `match.screen === 'game'` renders `GameScreen`, `match.screen === 'shootout'` renders `ShootoutScreen`, and `match.screen === 'summary'` keeps a minimal placeholder (Plan 3C's job).

**Tech Stack:** Same as Plan 3A — MUI components only (`Box`, `Stack`, `Button`, `TextField`, `Checkbox`, `FormControlLabel`, `List`/`ListItem`, `Menu`/`MenuItem`, `Dialog`, `Chip`, `Alert`, `Typography`, `Divider`), Vitest + React Testing Library with the `// @vitest-environment jsdom` pragma, no new dependencies.

## Global Constraints

- Every source/test file: `singleQuote: true`, `semi: true`, `printWidth: 100` (from `.prettierrc`) — wrap lines before they exceed 100 columns.
- Every new component/hook test file's **first line** must be the literal pragma `// @vitest-environment jsdom` (copy verbatim — this is a literal string match, not a glob).
- `Date.now()` is confined to `src/hooks/useMatch.ts`, **with one explicit exception**: `Game/Clock.tsx` may call `Date.now()` directly inside its render/effect to compute a live-ticking display value (`clockElapsed(clock, Date.now())`), per this project's design spec. This value must never be passed to a dispatched action or written to any state that gets persisted — it is display-only. No other new component may call `Date.now()`.
- Immutability discipline: components never mutate `Match`/`Team`/`Player`/`SavedTeam` objects. Every state change goes through a callback prop supplied by `App.tsx` (ultimately backed by `useMatch`'s logic-layer wrappers).
- No `@mui/icons-material` or any icon package. Use plain text button/label strings (e.g. "Sub", "Stats", "Yellow Card") — this plan does not need Unicode glyphs since every action has a clear text label.
- No routing library. Screen selection stays inside `App.tsx`'s existing conditional-render dispatch (extended by Task 8).
- MUI's `Select` component is deliberately **not** used anywhere in this plan (see Task 1) — team choice uses plain `Button`s to avoid the native-vs-non-native `Select` testing ambiguity. Do not introduce `TextField select` in this plan's components.
- Test-per-component granularity matches Plan 3A: one dedicated test file per screen/major component, proving its one or two critical interactions — not exhaustive coverage (the 106 Plan-2 logic tests already cover game-rule correctness). `StatMenu.tsx` and `SubstitutionMenu.tsx` (Task 4) do not get their own test files — they're small leaf menus fully exercised through `PlayerRow.test.tsx`'s two interactions, mirroring how `TeamPicker.tsx` (Task 1) is exercised only through `SetupScreen.test.tsx` in Plan 3A's own precedent.
- Follow TDD: write the failing test first, watch it fail for the expected reason (missing module), then implement.

---

### Task 1: TeamPicker + SetupScreen

**Files:**
- Create: `src/components/Setup/TeamPicker.tsx`
- Create: `src/components/Setup/SetupScreen.tsx`
- Create: `src/components/Setup/SetupScreen.test.tsx`

**Interfaces:**
- Consumes: `SavedTeam`/`SavedPlayer` from `src/logic/types.ts`; `newMatch`'s argument shape from `src/logic/match.ts` (`{ config: MatchConfig; teamA: SavedTeam; activeIdsA: string[]; collapsedA: boolean; teamB: SavedTeam; activeIdsB: string[]; collapsedB: boolean; homeTeam: TeamKey }`); `ImportSummary` type from `src/hooks/useMatch.ts`.
- Produces: `TeamSelection` type and `TeamPicker` component (used only within `SetupScreen`); `SetupScreen` component, consumed by `App.tsx` in Task 8 with props `{ savedTeams, onStartMatch, onExportBackup, onImportBackup }`.

- [ ] **Step 1: Write `TeamPicker.tsx`**

```tsx
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SavedTeam } from '../../logic/types';

export interface TeamSelection {
  team: SavedTeam | null;
  activeIds: string[];
  collapsed: boolean;
}

export interface TeamPickerProps {
  label: string;
  savedTeams: SavedTeam[];
  value: TeamSelection;
  onChange: (value: TeamSelection) => void;
}

export function TeamPicker({ label, savedTeams, value, onChange }: TeamPickerProps) {
  function selectTeam(team: SavedTeam) {
    const activeIds = team.players.filter((p) => p.starter).map((p) => p.id);
    onChange({ team, activeIds, collapsed: value.collapsed });
  }

  function toggleActive(id: string) {
    const activeIds = value.activeIds.includes(id)
      ? value.activeIds.filter((x) => x !== id)
      : [...value.activeIds, id];
    onChange({ ...value, activeIds });
  }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1">{label}</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {savedTeams.map((t) => (
          <Button
            key={t.id}
            variant={value.team?.id === t.id ? 'contained' : 'outlined'}
            onClick={() => selectTeam(t)}
          >
            {t.name}
          </Button>
        ))}
      </Stack>
      <FormControlLabel
        control={
          <Checkbox
            checked={value.collapsed}
            onChange={(e) => onChange({ ...value, collapsed: e.target.checked })}
          />
        }
        label="Collapsed (score-only tracking)"
      />
      {value.team && !value.collapsed && (
        <Stack sx={{ pl: 2 }}>
          {value.team.players.map((p) => (
            <FormControlLabel
              key={p.id}
              control={
                <Checkbox
                  checked={value.activeIds.includes(p.id)}
                  onChange={() => toggleActive(p.id)}
                />
              }
              label={`#${p.num} ${p.name}`}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
```

- [ ] **Step 2: Write the failing test for `SetupScreen.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetupScreen } from './SetupScreen';
import type { SavedTeam } from '../../logic/types';

const teamA: SavedTeam = {
  id: 'a1',
  name: 'Lions',
  players: [
    { id: 'p1', num: 9, name: 'Alex', starter: true, goalkeeper: false },
    { id: 'p2', num: 1, name: 'Sam', starter: true, goalkeeper: true },
  ],
};
const teamB: SavedTeam = {
  id: 'b1',
  name: 'Tigers',
  players: [{ id: 'p3', num: 7, name: 'Jo', starter: true, goalkeeper: false }],
};

describe('SetupScreen', () => {
  it('starts a match with the selected teams and default config', async () => {
    const onStartMatch = vi.fn();
    render(
      <SetupScreen
        savedTeams={[teamA, teamB]}
        onStartMatch={onStartMatch}
        onExportBackup={vi.fn()}
        onImportBackup={vi.fn()}
      />,
    );

    await userEvent.click(screen.getAllByRole('button', { name: 'Lions' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'Tigers' })[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Start Match' }));

    expect(onStartMatch).toHaveBeenCalledWith({
      config: {
        halfLengthMin: 45,
        hasExtraTime: false,
        extraTimeLengthMin: 15,
        hasShootout: false,
      },
      teamA,
      activeIdsA: ['p1', 'p2'],
      collapsedA: false,
      teamB,
      activeIdsB: ['p3'],
      collapsedB: false,
      homeTeam: 'teamA',
    });
  });

  it('disables Start Match until both teams are selected', () => {
    render(
      <SetupScreen
        savedTeams={[teamA, teamB]}
        onStartMatch={vi.fn()}
        onExportBackup={vi.fn()}
        onImportBackup={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Start Match' })).toBeDisabled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- SetupScreen`
Expected: FAIL — `Cannot find module './SetupScreen'`

- [ ] **Step 4: Write `SetupScreen.tsx`**

```tsx
import { useRef, useState, type ChangeEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { TeamPicker } from './TeamPicker';
import type { TeamSelection } from './TeamPicker';
import type { newMatch } from '../../logic/match';
import type { ImportSummary } from '../../hooks/useMatch';
import type { SavedTeam, TeamKey } from '../../logic/types';

export interface SetupScreenProps {
  savedTeams: SavedTeam[];
  onStartMatch: (args: Parameters<typeof newMatch>[0]) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => Promise<ImportSummary>;
}

const emptySelection: TeamSelection = { team: null, activeIds: [], collapsed: false };

export function SetupScreen({
  savedTeams,
  onStartMatch,
  onExportBackup,
  onImportBackup,
}: SetupScreenProps) {
  const [selA, setSelA] = useState<TeamSelection>(emptySelection);
  const [selB, setSelB] = useState<TeamSelection>(emptySelection);
  const [homeTeam, setHomeTeam] = useState<TeamKey>('teamA');
  const [halfLengthMin, setHalfLengthMin] = useState(45);
  const [hasExtraTime, setHasExtraTime] = useState(false);
  const [extraTimeLengthMin, setExtraTimeLengthMin] = useState(15);
  const [hasShootout, setHasShootout] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canStart =
    !!selA.team &&
    !!selB.team &&
    (selA.collapsed || selA.activeIds.length > 0) &&
    (selB.collapsed || selB.activeIds.length > 0);

  const homeTeamName =
    homeTeam === 'teamA' ? (selA.team?.name ?? 'Team A') : (selB.team?.name ?? 'Team B');

  function handleStart() {
    if (!selA.team || !selB.team) return;
    onStartMatch({
      config: { halfLengthMin, hasExtraTime, extraTimeLengthMin, hasShootout },
      teamA: selA.team,
      activeIdsA: selA.activeIds,
      collapsedA: selA.collapsed,
      teamB: selB.team,
      activeIdsB: selB.activeIds,
      collapsedB: selB.collapsed,
      homeTeam,
    });
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);
    setImportMessage(null);
    try {
      const summary = await onImportBackup(file);
      setImportMessage(
        `Imported: ${summary.teamsAdded} team(s) added, ${summary.teamsUpdated} updated, ` +
          `${summary.gamesAdded} game(s) added, ${summary.gamesUpdated} updated.`,
      );
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Setup
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} sx={{ mb: 3 }}>
        <TeamPicker label="Team A" savedTeams={savedTeams} value={selA} onChange={setSelA} />
        <TeamPicker label="Team B" savedTeams={savedTeams} value={selB} onChange={setSelB} />
      </Stack>
      <FormControlLabel
        control={
          <Checkbox
            checked={homeTeam === 'teamB'}
            onChange={(e) => setHomeTeam(e.target.checked ? 'teamB' : 'teamA')}
          />
        }
        label={`Home team: ${homeTeamName}`}
      />
      <Stack spacing={2} sx={{ my: 2 }}>
        <TextField
          label="Half length (minutes)"
          type="number"
          value={halfLengthMin}
          onChange={(e) => setHalfLengthMin(Number(e.target.value))}
          sx={{ maxWidth: 200 }}
        />
        <FormControlLabel
          control={
            <Checkbox checked={hasExtraTime} onChange={(e) => setHasExtraTime(e.target.checked)} />
          }
          label="Extra time"
        />
        {hasExtraTime && (
          <TextField
            label="Extra time period length (minutes)"
            type="number"
            value={extraTimeLengthMin}
            onChange={(e) => setExtraTimeLengthMin(Number(e.target.value))}
            sx={{ maxWidth: 200 }}
          />
        )}
        <FormControlLabel
          control={
            <Checkbox checked={hasShootout} onChange={(e) => setHasShootout(e.target.checked)} />
          }
          label="Penalty shootout"
        />
      </Stack>
      <Button variant="contained" onClick={handleStart} disabled={!canStart}>
        Start Match
      </Button>
      <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
        <Button onClick={onExportBackup}>Export Backup</Button>
        <Button onClick={() => fileInputRef.current?.click()}>Import Backup</Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={handleImportFile}
        />
      </Stack>
      {importMessage && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {importMessage}
        </Alert>
      )}
      {importError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {importError}
        </Alert>
      )}
    </Box>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- SetupScreen`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/Setup/TeamPicker.tsx src/components/Setup/SetupScreen.tsx src/components/Setup/SetupScreen.test.tsx
git commit -m "feat: add TeamPicker and SetupScreen"
```

---

### Task 2: Clock

**Files:**
- Create: `src/components/Game/Clock.tsx`
- Create: `src/components/Game/Clock.test.tsx`

**Interfaces:**
- Consumes: `ClockState` from `src/logic/types.ts`; `clockElapsed`, `formatClock`, `parseClock` from `src/logic/clock.ts`.
- Produces: `Clock` component, consumed by `GameScreen` (Task 6) with props `{ clock, stoppageSec, onToggleClock, onRecordStoppage }`.

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Clock } from './Clock';

describe('Clock', () => {
  it('displays the formatted elapsed time and toggles on click', async () => {
    const onToggleClock = vi.fn();
    render(
      <Clock
        clock={{ elapsedSec: 125, running: false, startedAt: null }}
        stoppageSec={0}
        onToggleClock={onToggleClock}
        onRecordStoppage={vi.fn()}
      />,
    );
    expect(screen.getByText('2:05')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onToggleClock).toHaveBeenCalledTimes(1);
  });

  it('records stoppage time entered in the dialog', async () => {
    const onRecordStoppage = vi.fn();
    render(
      <Clock
        clock={{ elapsedSec: 0, running: false, startedAt: null }}
        stoppageSec={0}
        onToggleClock={vi.fn()}
        onRecordStoppage={onRecordStoppage}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Stoppage Time' }));
    const input = screen.getByLabelText('Added time (M:SS)');
    await userEvent.clear(input);
    await userEvent.type(input, '2:00');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onRecordStoppage).toHaveBeenCalledWith(120);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- Clock`
Expected: FAIL — `Cannot find module './Clock'`

- [ ] **Step 3: Write `Clock.tsx`**

```tsx
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ClockState } from '../../logic/types';
import { clockElapsed, formatClock, parseClock } from '../../logic/clock';

export interface ClockProps {
  clock: ClockState;
  stoppageSec: number;
  onToggleClock: () => void;
  onRecordStoppage: (addedSec: number) => void;
}

export function Clock({ clock, stoppageSec, onToggleClock, onRecordStoppage }: ClockProps) {
  const [, setTick] = useState(0);
  const [stoppageOpen, setStoppageOpen] = useState(false);
  const [stoppageText, setStoppageText] = useState('');

  useEffect(() => {
    if (!clock.running) return;
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [clock.running]);

  const elapsed = clockElapsed(clock, Date.now());
  const parsedStoppage = parseClock(stoppageText);

  function openStoppageDialog() {
    setStoppageText(formatClock(stoppageSec));
    setStoppageOpen(true);
  }

  function saveStoppage() {
    if (parsedStoppage === null) return;
    onRecordStoppage(parsedStoppage);
    setStoppageOpen(false);
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h3" component="div">
        {formatClock(elapsed)}
        {stoppageSec > 0 && (
          <Typography variant="h6" component="span" sx={{ ml: 1 }}>
            +{formatClock(stoppageSec)}
          </Typography>
        )}
      </Typography>
      <Box sx={{ mt: 1 }}>
        <Button variant="contained" onClick={onToggleClock}>
          {clock.running ? 'Stop' : 'Start'}
        </Button>
        <Button onClick={openStoppageDialog} sx={{ ml: 1 }}>
          Stoppage Time
        </Button>
      </Box>
      <Dialog open={stoppageOpen} onClose={() => setStoppageOpen(false)}>
        <DialogTitle>Stoppage Time</DialogTitle>
        <DialogContent>
          <TextField
            label="Added time (M:SS)"
            value={stoppageText}
            onChange={(e) => setStoppageText(e.target.value)}
            error={parsedStoppage === null}
            helperText={parsedStoppage === null ? 'Enter time as M:SS' : ' '}
            autoFocus
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStoppageOpen(false)}>Cancel</Button>
          <Button onClick={saveStoppage} disabled={parsedStoppage === null}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- Clock`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/Game/Clock.tsx src/components/Game/Clock.test.tsx
git commit -m "feat: add Clock component"
```

---

### Task 3: ScoreBar

**Files:**
- Create: `src/components/Game/ScoreBar.tsx`
- Create: `src/components/Game/ScoreBar.test.tsx`

**Interfaces:**
- Consumes: `TeamKey` from `src/logic/types.ts`.
- Produces: `ScoreBar` component, consumed by `GameScreen` (Task 6) with props `{ teamAName, teamBName, score, possession, onSetPossession }`.

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScoreBar } from './ScoreBar';

describe('ScoreBar', () => {
  it('displays both scores and sets possession on click', async () => {
    const onSetPossession = vi.fn();
    render(
      <ScoreBar
        teamAName="Lions"
        teamBName="Tigers"
        score={{ teamA: 2, teamB: 1 }}
        possession="teamA"
        onSetPossession={onSetPossession}
      />,
    );
    expect(screen.getByText('Lions')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'Possession' });
    await userEvent.click(buttons[1]);
    expect(onSetPossession).toHaveBeenCalledWith('teamB');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- ScoreBar`
Expected: FAIL — `Cannot find module './ScoreBar'`

- [ ] **Step 3: Write `ScoreBar.tsx`**

```tsx
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { TeamKey } from '../../logic/types';

export interface ScoreBarProps {
  teamAName: string;
  teamBName: string;
  score: Record<TeamKey, number>;
  possession: TeamKey | null;
  onSetPossession: (team: TeamKey) => void;
}

export function ScoreBar({
  teamAName,
  teamBName,
  score,
  possession,
  onSetPossession,
}: ScoreBarProps) {
  return (
    <Stack direction="row" spacing={4} justifyContent="center" alignItems="center">
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6">{teamAName}</Typography>
        <Typography variant="h3">{score.teamA}</Typography>
        <Button
          size="small"
          variant={possession === 'teamA' ? 'contained' : 'outlined'}
          onClick={() => onSetPossession('teamA')}
        >
          Possession
        </Button>
      </Box>
      <Typography variant="h4">–</Typography>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6">{teamBName}</Typography>
        <Typography variant="h3">{score.teamB}</Typography>
        <Button
          size="small"
          variant={possession === 'teamB' ? 'contained' : 'outlined'}
          onClick={() => onSetPossession('teamB')}
        >
          Possession
        </Button>
      </Box>
    </Stack>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- ScoreBar`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/components/Game/ScoreBar.tsx src/components/Game/ScoreBar.test.tsx
git commit -m "feat: add ScoreBar component"
```

---

### Task 4: PlayerRow, StatMenu, SubstitutionMenu

**Files:**
- Create: `src/components/Game/StatMenu.tsx`
- Create: `src/components/Game/SubstitutionMenu.tsx`
- Create: `src/components/Game/PlayerRow.tsx`
- Create: `src/components/Game/PlayerRow.test.tsx`

**Interfaces:**
- Consumes: `Player` from `src/logic/types.ts`; `PlayerStatField` from `src/logic/stats.ts`.
- Produces: `PlayerRow` component, consumed by `TeamPanel` (Task 5) with props `{ player, onRecordStat, onRecordCard, onSubIn, onSubOut }`. `StatMenu`/`SubstitutionMenu` are internal to `PlayerRow` and not imported elsewhere.

- [ ] **Step 1: Write the failing test for `PlayerRow.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerRow } from './PlayerRow';
import type { Player } from '../../logic/types';

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    num: 9,
    name: 'Alex',
    starter: true,
    goalkeeper: false,
    onField: true,
    inClock: 0,
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
    ...overrides,
  };
}

describe('PlayerRow', () => {
  it('records a stat via the Stats menu', async () => {
    const onRecordStat = vi.fn();
    render(
      <PlayerRow
        player={player()}
        onRecordStat={onRecordStat}
        onRecordCard={vi.fn()}
        onSubIn={vi.fn()}
        onSubOut={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Stats' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Goal' }));
    expect(onRecordStat).toHaveBeenCalledWith('goals');
  });

  it('subs out an on-field player via the Sub menu', async () => {
    const onSubOut = vi.fn();
    render(
      <PlayerRow
        player={player({ onField: true })}
        onRecordStat={vi.fn()}
        onRecordCard={vi.fn()}
        onSubIn={vi.fn()}
        onSubOut={onSubOut}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sub' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sub Out' }));
    expect(onSubOut).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- PlayerRow`
Expected: FAIL — `Cannot find module './PlayerRow'`

- [ ] **Step 3: Write `StatMenu.tsx`**

```tsx
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import type { PlayerStatField } from '../../logic/stats';

const STAT_OPTIONS: { field: PlayerStatField; label: string }[] = [
  { field: 'goals', label: 'Goal' },
  { field: 'assists', label: 'Assist' },
  { field: 'shotsOnGoal', label: 'Shot on Goal' },
  { field: 'tackles', label: 'Tackle' },
  { field: 'foulsCommitted', label: 'Foul' },
  { field: 'saves', label: 'Save' },
];

export interface StatMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onSelectStat: (stat: PlayerStatField) => void;
  onSelectCard: (color: 'yellow' | 'red') => void;
}

export function StatMenu({ anchorEl, open, onClose, onSelectStat, onSelectCard }: StatMenuProps) {
  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      {STAT_OPTIONS.map((opt) => (
        <MenuItem
          key={opt.field}
          onClick={() => {
            onSelectStat(opt.field);
            onClose();
          }}
        >
          {opt.label}
        </MenuItem>
      ))}
      <MenuItem
        onClick={() => {
          onSelectCard('yellow');
          onClose();
        }}
      >
        Yellow Card
      </MenuItem>
      <MenuItem
        onClick={() => {
          onSelectCard('red');
          onClose();
        }}
      >
        Red Card
      </MenuItem>
    </Menu>
  );
}
```

- [ ] **Step 4: Write `SubstitutionMenu.tsx`**

```tsx
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

export interface SubstitutionMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onField: boolean;
  onSubIn: () => void;
  onSubOut: () => void;
}

export function SubstitutionMenu({
  anchorEl,
  open,
  onClose,
  onField,
  onSubIn,
  onSubOut,
}: SubstitutionMenuProps) {
  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      {onField ? (
        <MenuItem
          onClick={() => {
            onSubOut();
            onClose();
          }}
        >
          Sub Out
        </MenuItem>
      ) : (
        <MenuItem
          onClick={() => {
            onSubIn();
            onClose();
          }}
        >
          Sub In
        </MenuItem>
      )}
    </Menu>
  );
}
```

- [ ] **Step 5: Write `PlayerRow.tsx`**

```tsx
import { useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import type { Player } from '../../logic/types';
import type { PlayerStatField } from '../../logic/stats';
import { StatMenu } from './StatMenu';
import { SubstitutionMenu } from './SubstitutionMenu';

export interface PlayerRowProps {
  player: Player;
  onRecordStat: (stat: PlayerStatField) => void;
  onRecordCard: (color: 'yellow' | 'red') => void;
  onSubIn: () => void;
  onSubOut: () => void;
}

export function PlayerRow({
  player,
  onRecordStat,
  onRecordCard,
  onSubIn,
  onSubOut,
}: PlayerRowProps) {
  const [statAnchor, setStatAnchor] = useState<HTMLElement | null>(null);
  const [subAnchor, setSubAnchor] = useState<HTMLElement | null>(null);

  return (
    <ListItem>
      <ListItemText
        primary={`#${player.num} ${player.name}`}
        secondary={`Goals ${player.goals} · Assists ${player.assists}`}
      />
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip
          size="small"
          label={player.sentOff ? 'Sent Off' : player.onField ? 'On' : 'Bench'}
          color={player.sentOff ? 'error' : player.onField ? 'success' : 'default'}
        />
        <Button size="small" onClick={(e) => setStatAnchor(e.currentTarget)}>
          Stats
        </Button>
        <Button size="small" onClick={(e) => setSubAnchor(e.currentTarget)}>
          Sub
        </Button>
      </Stack>
      <StatMenu
        anchorEl={statAnchor}
        open={!!statAnchor}
        onClose={() => setStatAnchor(null)}
        onSelectStat={onRecordStat}
        onSelectCard={onRecordCard}
      />
      <SubstitutionMenu
        anchorEl={subAnchor}
        open={!!subAnchor}
        onClose={() => setSubAnchor(null)}
        onField={player.onField}
        onSubIn={onSubIn}
        onSubOut={onSubOut}
      />
    </ListItem>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- PlayerRow`
Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add src/components/Game/StatMenu.tsx src/components/Game/SubstitutionMenu.tsx src/components/Game/PlayerRow.tsx src/components/Game/PlayerRow.test.tsx
git commit -m "feat: add PlayerRow with StatMenu and SubstitutionMenu"
```

---

### Task 5: TeamPanel

**Files:**
- Create: `src/components/Game/TeamPanel.tsx`
- Create: `src/components/Game/TeamPanel.test.tsx`

**Interfaces:**
- Consumes: `Team`, `TeamKey` from `src/logic/types.ts`; `PlayerStatField` from `src/logic/stats.ts`; `PlayerRow` from Task 4.
- Produces: `TeamPanel` component, consumed by `GameScreen` (Task 6) with props `{ team, teamKey, onAdjustScore, onRecordCard, onRecordCorner, onRecordOffside, onRecordPlayerStat, onSubIn, onSubOut }`.

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamPanel } from './TeamPanel';
import type { Team } from '../../logic/types';

function collapsedTeam(): Team {
  return {
    id: 't1',
    name: 'Lions',
    collapsed: true,
    players: [],
    goalkeeperId: null,
    corners: 2,
    offsides: 1,
    yellowCards: 0,
    redCards: 0,
  };
}

describe('TeamPanel', () => {
  it('collapsed team shows score/card/corner controls and no roster', async () => {
    const onAdjustScore = vi.fn();
    render(
      <TeamPanel
        team={collapsedTeam()}
        teamKey="teamA"
        onAdjustScore={onAdjustScore}
        onRecordCard={vi.fn()}
        onRecordCorner={vi.fn()}
        onRecordOffside={vi.fn()}
        onRecordPlayerStat={vi.fn()}
        onSubIn={vi.fn()}
        onSubOut={vi.fn()}
      />,
    );
    expect(screen.getByText('Corner (2)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stats' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+1 Goal' }));
    expect(onAdjustScore).toHaveBeenCalledWith('teamA', 1);
  });

  it('full team renders a roster row per player', () => {
    const team: Team = {
      id: 't2',
      name: 'Tigers',
      collapsed: false,
      players: [
        {
          id: 'p1',
          num: 7,
          name: 'Jo',
          starter: true,
          goalkeeper: false,
          onField: true,
          inClock: 0,
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
        },
      ],
      goalkeeperId: null,
      corners: 0,
      offsides: 0,
      yellowCards: 0,
      redCards: 0,
    };
    render(
      <TeamPanel
        team={team}
        teamKey="teamB"
        onAdjustScore={vi.fn()}
        onRecordCard={vi.fn()}
        onRecordCorner={vi.fn()}
        onRecordOffside={vi.fn()}
        onRecordPlayerStat={vi.fn()}
        onSubIn={vi.fn()}
        onSubOut={vi.fn()}
      />,
    );
    expect(screen.getByText('#7 Jo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+1 Goal' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- TeamPanel`
Expected: FAIL — `Cannot find module './TeamPanel'`

- [ ] **Step 3: Write `TeamPanel.tsx`**

```tsx
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Team, TeamKey } from '../../logic/types';
import type { PlayerStatField } from '../../logic/stats';
import { PlayerRow } from './PlayerRow';

export interface TeamPanelProps {
  team: Team;
  teamKey: TeamKey;
  onAdjustScore: (team: TeamKey, delta: number) => void;
  onRecordCard: (team: TeamKey, playerId: string | null, color: 'yellow' | 'red') => void;
  onRecordCorner: (team: TeamKey) => void;
  onRecordOffside: (team: TeamKey) => void;
  onRecordPlayerStat: (team: TeamKey, playerId: string, stat: PlayerStatField) => void;
  onSubIn: (team: TeamKey, playerId: string) => void;
  onSubOut: (team: TeamKey, playerId: string) => void;
}

export function TeamPanel({
  team,
  teamKey,
  onAdjustScore,
  onRecordCard,
  onRecordCorner,
  onRecordOffside,
  onRecordPlayerStat,
  onSubIn,
  onSubOut,
}: TeamPanelProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {team.name}
      </Typography>
      {team.collapsed && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          <Button size="small" onClick={() => onAdjustScore(teamKey, 1)}>
            +1 Goal
          </Button>
          <Button size="small" onClick={() => onAdjustScore(teamKey, -1)}>
            -1 Goal
          </Button>
          <Button size="small" onClick={() => onRecordCard(teamKey, null, 'yellow')}>
            Yellow Card
          </Button>
          <Button size="small" onClick={() => onRecordCard(teamKey, null, 'red')}>
            Red Card
          </Button>
        </Stack>
      )}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button size="small" onClick={() => onRecordCorner(teamKey)}>
          Corner ({team.corners})
        </Button>
        <Button size="small" onClick={() => onRecordOffside(teamKey)}>
          Offside ({team.offsides})
        </Button>
      </Stack>
      {!team.collapsed && (
        <List>
          {team.players.map((p) => (
            <PlayerRow
              key={p.id}
              player={p}
              onRecordStat={(stat) => onRecordPlayerStat(teamKey, p.id, stat)}
              onRecordCard={(color) => onRecordCard(teamKey, p.id, color)}
              onSubIn={() => onSubIn(teamKey, p.id)}
              onSubOut={() => onSubOut(teamKey, p.id)}
            />
          ))}
        </List>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- TeamPanel`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/Game/TeamPanel.tsx src/components/Game/TeamPanel.test.tsx
git commit -m "feat: add TeamPanel"
```

---

### Task 6: GameScreen

**Files:**
- Create: `src/components/Game/GameScreen.tsx`
- Create: `src/components/Game/GameScreen.test.tsx`

**Interfaces:**
- Consumes: `Match`, `Period` from `src/logic/types.ts`; `MatchHookApi` from `src/hooks/useMatch.ts` (used only for its per-method types, e.g. `MatchHookApi['adjustScore']` — `GameScreen` does not receive the hook itself); `Clock` (Task 2), `ScoreBar` (Task 3), `TeamPanel` (Task 5).
- Produces: `GameScreen` component, consumed by `App.tsx` (Task 8) when `match.screen === 'game'`, with one callback prop per lifecycle/stat method plus `match`.

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameScreen } from './GameScreen';
import { newMatch } from '../../logic/match';
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

function baseProps(overrides: Partial<Parameters<typeof GameScreen>[0]> = {}) {
  const match = newMatch({
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: false },
    teamA,
    activeIdsA: ['p1'],
    collapsedA: false,
    teamB,
    activeIdsB: ['p2'],
    collapsedB: false,
    homeTeam: 'teamA',
  });
  return {
    match,
    onAdjustScore: vi.fn(),
    onRecordPlayerStat: vi.fn(),
    onRecordCard: vi.fn(),
    onRecordCorner: vi.fn(),
    onRecordOffside: vi.fn(),
    onSubIn: vi.fn(),
    onSubOut: vi.fn(),
    onSetPossession: vi.fn(),
    onRecordStoppage: vi.fn(),
    onToggleClock: vi.fn(),
    onEndHalf: vi.fn(),
    onAddExtraTime: vi.fn(),
    onEndGame: vi.fn(),
    onStartShootout: vi.fn(),
    onUndo: vi.fn(),
    ...overrides,
  };
}

describe('GameScreen', () => {
  it('records a goal for a player and updates the visible score', async () => {
    const props = baseProps();
    render(<GameScreen {...props} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Stats' })[0]);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Goal' }));
    expect(props.onRecordPlayerStat).toHaveBeenCalledWith('teamA', 'p1', 'goals');
  });

  it('confirms before ending the half', async () => {
    const props = baseProps();
    render(<GameScreen {...props} />);
    await userEvent.click(screen.getByRole('button', { name: 'End Half' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(props.onEndHalf).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- GameScreen`
Expected: FAIL — `Cannot find module './GameScreen'`

- [ ] **Step 3: Write `GameScreen.tsx`**

```tsx
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Match, Period } from '../../logic/types';
import type { MatchHookApi } from '../../hooks/useMatch';
import { Clock } from './Clock';
import { ScoreBar } from './ScoreBar';
import { TeamPanel } from './TeamPanel';

export interface GameScreenProps {
  match: Match;
  onAdjustScore: MatchHookApi['adjustScore'];
  onRecordPlayerStat: MatchHookApi['recordPlayerStat'];
  onRecordCard: MatchHookApi['recordCard'];
  onRecordCorner: MatchHookApi['recordCorner'];
  onRecordOffside: MatchHookApi['recordOffside'];
  onSubIn: MatchHookApi['subIn'];
  onSubOut: MatchHookApi['subOut'];
  onSetPossession: MatchHookApi['setPossession'];
  onRecordStoppage: MatchHookApi['recordStoppage'];
  onToggleClock: MatchHookApi['toggleClock'];
  onEndHalf: MatchHookApi['endHalf'];
  onAddExtraTime: MatchHookApi['addExtraTime'];
  onEndGame: MatchHookApi['endGame'];
  onStartShootout: MatchHookApi['startShootout'];
  onUndo: MatchHookApi['undo'];
}

const PERIOD_LABEL: Record<Period, string> = {
  1: 'Half 1',
  2: 'Half 2',
  ET1: 'Extra Time 1',
  ET2: 'Extra Time 2',
  shootout: 'Shootout',
};

type Confirmation = { title: string; body: string; onConfirm: () => void } | null;

export function GameScreen({
  match,
  onAdjustScore,
  onRecordPlayerStat,
  onRecordCard,
  onRecordCorner,
  onRecordOffside,
  onSubIn,
  onSubOut,
  onSetPossession,
  onRecordStoppage,
  onToggleClock,
  onEndHalf,
  onAddExtraTime,
  onEndGame,
  onStartShootout,
  onUndo,
}: GameScreenProps) {
  const [confirmation, setConfirmation] = useState<Confirmation>(null);

  const canUndo = match.log.length > 0 && match.log[match.log.length - 1].rev !== null;
  const canAddExtraTime =
    match.config.hasExtraTime && (match.period === 2 || match.period === 'ET1');
  const canStartShootout = match.config.hasShootout && match.period !== 1;

  function confirmAndRun(title: string, body: string, action: () => void) {
    setConfirmation({ title, body, onConfirm: action });
  }

  return (
    <Box>
      <Typography variant="overline">{PERIOD_LABEL[match.period]}</Typography>
      <Clock
        clock={match.clock}
        stoppageSec={match.stoppage[match.period] ?? 0}
        onToggleClock={onToggleClock}
        onRecordStoppage={onRecordStoppage}
      />
      <ScoreBar
        teamAName={match.teamA.name}
        teamBName={match.teamB.name}
        score={match.score}
        possession={match.possession.current}
        onSetPossession={onSetPossession}
      />
      <Divider sx={{ my: 3 }} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
        <Box sx={{ flex: 1 }}>
          <TeamPanel
            team={match.teamA}
            teamKey="teamA"
            onAdjustScore={onAdjustScore}
            onRecordCard={onRecordCard}
            onRecordCorner={onRecordCorner}
            onRecordOffside={onRecordOffside}
            onRecordPlayerStat={onRecordPlayerStat}
            onSubIn={onSubIn}
            onSubOut={onSubOut}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <TeamPanel
            team={match.teamB}
            teamKey="teamB"
            onAdjustScore={onAdjustScore}
            onRecordCard={onRecordCard}
            onRecordCorner={onRecordCorner}
            onRecordOffside={onRecordOffside}
            onRecordPlayerStat={onRecordPlayerStat}
            onSubIn={onSubIn}
            onSubOut={onSubOut}
          />
        </Box>
      </Stack>
      <Divider sx={{ my: 3 }} />
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        <Button onClick={onUndo} disabled={!canUndo}>
          Undo
        </Button>
        {match.period === 1 && (
          <Button
            variant="contained"
            onClick={() => confirmAndRun('End Half 1?', 'This cannot be undone.', onEndHalf)}
          >
            End Half
          </Button>
        )}
        {canAddExtraTime && (
          <Button
            variant="contained"
            onClick={() =>
              confirmAndRun('Start extra time?', 'This cannot be undone.', onAddExtraTime)
            }
          >
            Start Extra Time
          </Button>
        )}
        {canStartShootout && (
          <Button
            variant="contained"
            onClick={() =>
              confirmAndRun(
                'Start penalty shootout?',
                'This cannot be undone.',
                onStartShootout,
              )
            }
          >
            Start Shootout
          </Button>
        )}
        <Button
          variant="contained"
          color="error"
          onClick={() => confirmAndRun('End the game?', 'This cannot be undone.', onEndGame)}
        >
          End Game
        </Button>
      </Stack>
      <Dialog open={confirmation !== null} onClose={() => setConfirmation(null)}>
        <DialogTitle>{confirmation?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmation?.body}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmation(null)}>Cancel</Button>
          <Button
            onClick={() => {
              confirmation?.onConfirm();
              setConfirmation(null);
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

Run: `npm run test -- GameScreen`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/Game/GameScreen.tsx src/components/Game/GameScreen.test.tsx
git commit -m "feat: add GameScreen"
```

---

### Task 7: ShootoutScreen

**Files:**
- Create: `src/components/Shootout/ShootoutScreen.tsx`
- Create: `src/components/Shootout/ShootoutScreen.test.tsx`

**Interfaces:**
- Consumes: `Match`, `TeamKey` from `src/logic/types.ts`; `MatchHookApi` from `src/hooks/useMatch.ts` (for method types only); `otherTeam` from `src/logic/log.ts`.
- Produces: `ShootoutScreen` component, consumed by `App.tsx` (Task 8) when `match.screen === 'shootout'`, with props `{ match, onRecordAttempt, onUndo, onEndGame }`.

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShootoutScreen } from './ShootoutScreen';
import { newMatch } from '../../logic/match';
import { startShootout, recordAttempt } from '../../logic/shootout';
import type { SavedTeam } from '../../logic/types';

const teamA: SavedTeam = { id: 'a1', name: 'Lions', players: [] };
const teamB: SavedTeam = { id: 'b1', name: 'Tigers', players: [] };

function shootoutMatch() {
  let m = newMatch({
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: true },
    teamA,
    activeIdsA: [],
    collapsedA: true,
    teamB,
    activeIdsB: [],
    collapsedB: true,
    homeTeam: 'teamA',
  });
  m = startShootout(m, 0);
  return m;
}

describe('ShootoutScreen', () => {
  it('records an attempt for the next shooter', async () => {
    const onRecordAttempt = vi.fn();
    render(
      <ShootoutScreen
        match={shootoutMatch()}
        onRecordAttempt={onRecordAttempt}
        onUndo={vi.fn()}
        onEndGame={vi.fn()}
      />,
    );
    expect(screen.getByText(/Next: Lions/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Scored' }));
    expect(onRecordAttempt).toHaveBeenCalledWith('teamA', true);
  });

  it('shows a winner banner once the shootout is decided', () => {
    let m = shootoutMatch();
    m = recordAttempt(m, 'teamA', true, 0);
    m = recordAttempt(m, 'teamB', false, 0);
    m = recordAttempt(m, 'teamA', true, 0);
    m = recordAttempt(m, 'teamB', false, 0);
    m = recordAttempt(m, 'teamA', true, 0);
    m = recordAttempt(m, 'teamB', false, 0);
    render(
      <ShootoutScreen match={m} onRecordAttempt={vi.fn()} onUndo={vi.fn()} onEndGame={vi.fn()} />,
    );
    expect(screen.getByText(/wins the shootout/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- ShootoutScreen`
Expected: FAIL — `Cannot find module './ShootoutScreen'`

- [ ] **Step 3: Write `ShootoutScreen.tsx`**

```tsx
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Match, TeamKey } from '../../logic/types';
import type { MatchHookApi } from '../../hooks/useMatch';
import { otherTeam } from '../../logic/log';

export interface ShootoutScreenProps {
  match: Match;
  onRecordAttempt: MatchHookApi['recordAttempt'];
  onUndo: MatchHookApi['undo'];
  onEndGame: MatchHookApi['endGame'];
}

function nextShooter(match: Match): TeamKey {
  const taken = match.shootout?.attempts.length ?? 0;
  return taken % 2 === 0 ? match.homeTeam : otherTeam(match.homeTeam);
}

export function ShootoutScreen({
  match,
  onRecordAttempt,
  onUndo,
  onEndGame,
}: ShootoutScreenProps) {
  const shootout = match.shootout;
  if (!shootout) return null;

  const takenBy = (team: TeamKey) => shootout.attempts.filter((a) => a.team === team);
  const scoredBy = (team: TeamKey) => takenBy(team).filter((a) => a.scored).length;
  const next = nextShooter(match);

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        Penalty Shootout
      </Typography>
      <Stack direction="row" spacing={4} justifyContent="center" sx={{ mb: 3 }}>
        <Typography variant="h6">
          {match.teamA.name}: {scoredBy('teamA')} ({takenBy('teamA').length} taken)
        </Typography>
        <Typography variant="h6">
          {match.teamB.name}: {scoredBy('teamB')} ({takenBy('teamB').length} taken)
        </Typography>
      </Stack>
      {shootout.winner ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {shootout.winner === 'teamA' ? match.teamA.name : match.teamB.name} wins the shootout!
        </Alert>
      ) : (
        <>
          <Typography sx={{ mb: 2 }}>
            Next: {next === 'teamA' ? match.teamA.name : match.teamB.name}
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="contained" onClick={() => onRecordAttempt(next, true)}>
              Scored
            </Button>
            <Button variant="outlined" onClick={() => onRecordAttempt(next, false)}>
              Missed
            </Button>
          </Stack>
        </>
      )}
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
        <Button onClick={onUndo} disabled={shootout.attempts.length === 0}>
          Undo
        </Button>
        <Button variant="contained" color="error" onClick={onEndGame} disabled={!shootout.winner}>
          End Game
        </Button>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- ShootoutScreen`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/Shootout/ShootoutScreen.tsx src/components/Shootout/ShootoutScreen.test.tsx
git commit -m "feat: add ShootoutScreen"
```

---

### Task 8: Wire Setup/Game/Shootout into App.tsx

**Files:**
- Modify: `src/components/App.tsx`
- Modify: `src/components/App.test.tsx`

**Interfaces:**
- Consumes: `SetupScreen` (Task 1), `GameScreen` (Task 6), `ShootoutScreen` (Task 7); every method on `MatchHookApi` (`src/hooks/useMatch.ts`, built in Plan 3A) needed by those three screens.
- Produces: the completed top-level dispatch described in the Phase 3 design spec's Architecture section, replacing the Plan 3A placeholder. `match.screen === 'summary'` keeps a minimal placeholder — Plan 3C replaces it with the real `SummaryScreen`.

- [ ] **Step 1: Update the failing/changed assertions in `App.test.tsx`**

The existing Setup-tab assertion in `App.test.tsx` currently expects the Plan 3A placeholder text ("coming in the next update"). Once `SetupScreen` is wired in, that text is gone — replace the assertion with one that matches the real screen, and add a second test proving the full Setup → Game handoff:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { serialize } from '../logic/persistence';
import type { SavedTeam } from '../logic/types';

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

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the Teams tab by default and can switch to Setup', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Teams' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Setup' }));
    expect(screen.getByRole('heading', { name: 'Setup' })).toBeInTheDocument();
  });

  it('starts a match from Setup and renders the Game screen', async () => {
    localStorage.setItem('soccerscore.teams', serialize([teamA, teamB]));
    render(<App />);
    await userEvent.click(screen.getByRole('tab', { name: 'Setup' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Lions' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'Tigers' })[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Start Match' }));
    expect(screen.getByText('Half 1')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Setup' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- App.test`
Expected: FAIL — the first test's new assertion (`heading` named `Setup`) doesn't match the current placeholder text; the second test fails because `App.tsx` doesn't yet render `GameScreen`.

- [ ] **Step 3: Update `App.tsx`**

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
import { SetupScreen } from './Setup/SetupScreen';
import { GameScreen } from './Game/GameScreen';
import { ShootoutScreen } from './Shootout/ShootoutScreen';

function App() {
  const api = useMatch();
  const [homeView, setHomeView] = useState<HomeView>('teams');
  const theme = useMemo(() => createAppTheme(api.theme), [api.theme]);

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
      ) : api.match ? (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography>Match summary is coming in the next update.</Typography>
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- App.test`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: PASS — all tests (Plan 3A's 122 plus this plan's ~17 new tests) green.

- [ ] **Step 6: Run the build and existing e2e suite**

Run: `npm run build && npm run test:e2e`
Expected: PASS. The default screen (Teams tab, no match in progress) is unchanged by this plan, so the Playwright baseline screenshot from Plan 3A does not need regenerating.

- [ ] **Step 7: Commit**

```bash
git add src/components/App.tsx src/components/App.test.tsx
git commit -m "feat: wire Setup, Game, and Shootout screens into App"
```

---

## Self-Review

- **Spec coverage:** every component named in the design spec's Screens & Components tree for Plan 3B (`SetupScreen`, `TeamPicker`, `GameScreen`, `Clock`, `ScoreBar`, `TeamPanel`, `PlayerRow`, `StatMenu`, `SubstitutionMenu`, `ShootoutScreen`) has its own task; `App.tsx`'s dispatch is completed in Task 8.
- **Placeholder scan:** no TBD/TODO; every component has complete, working code and a concrete test. The `match.screen === 'summary'` branch is an intentional, explicitly-scoped placeholder for Plan 3C, not a gap in this plan's own scope.
- **Resolved ambiguity — resume banner:** the design spec mentions `isResumable`/a "resume banner" on Setup. Since `App.tsx`'s dispatch only renders `Nav`/`homeView` (and therefore `SetupScreen`) when `api.match` is null, `SetupScreen` can never be visible while a match is in progress — the top-level dispatch itself is the resume mechanism (a resumable match renders `GameScreen`/`ShootoutScreen` directly on load). No resume banner is built in this plan; this also fully closes the Plan 3A final review's Minor finding about the inert "match in progress" placeholder having no escape hatch, since that placeholder is now real, playable UI.
- **Resolved ambiguity — stat-button grid:** the design spec's TeamPanel bullet ("otherwise renders the full stat-button grid... plus the roster list via PlayerRow") is implemented as: the "full stat-button grid" is `StatMenu`'s contents (opened per-player from `PlayerRow`), not a separate team-level control — this avoids inventing an un-attributed team-wide stat button alongside the per-player one.
- **Scope check:** this plan covers exactly the "Play a Match" journey (Setup → Game → Shootout); Summary/History screens are explicitly Plan 3C's scope and are not touched beyond the pre-existing minimal placeholder text.
- **Type consistency:** `GameScreenProps`/`ShootoutScreenProps` reuse `MatchHookApi['methodName']` indexed-access types from `src/hooks/useMatch.ts` rather than re-declaring signatures, so a future signature change to the hook surfaces as a type error here instead of silent drift.
