// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameScreen } from './GameScreen';
import { newMatch } from '../../logic/match';
import type { SavedTeam } from '../../logic/types';

const teamA: SavedTeam = {
  id: 'a1',
  name: 'Lions',
  players: [{ id: 'p1', num: 9, name: 'Alex', starter: true, position: null }],
};
const teamB: SavedTeam = {
  id: 'b1',
  name: 'Tigers',
  players: [{ id: 'p2', num: 7, name: 'Jo', starter: true, position: null }],
};

function baseProps(overrides: Partial<Parameters<typeof GameScreen>[0]> = {}) {
  const match = newMatch({
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: false, hasStoppageTime: false },
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
    theme: 'dark' as const,
    onToggleTheme: vi.fn(),
    onUpdateConfig: vi.fn(),
    onOpenReview: vi.fn(),
    onAdjustScore: vi.fn(),
    onRecordPlayerStat: vi.fn(),
    onRecordCard: vi.fn(),
    onRecordCorner: vi.fn(),
    onRecordOffside: vi.fn(),
    onRecordTeamStat: vi.fn(),
    onRecordAttributedTeamStat: vi.fn(),
    onAddPlayer: vi.fn(),
    onSubIn: vi.fn(),
    onSubOut: vi.fn(),
    onSetPossession: vi.fn(),
    onRecordStoppage: vi.fn(),
    onToggleClock: vi.fn(),
    onAdjustClock: vi.fn(),
    onToggleStoppageWatch: vi.fn(),
    onStopStoppageWatch: vi.fn(),
    onEndHalf: vi.fn(),
    onAddExtraTime: vi.fn(),
    onEndGame: vi.fn(),
    onStartShootout: vi.fn(),
    onUndo: vi.fn(),
    ...overrides,
  };
}

describe('GameScreen', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('records a goal for a player and updates the visible score', async () => {
    const props = baseProps();
    render(<GameScreen {...props} />);
    vi.useFakeTimers();
    fireEvent.pointerDown(screen.getAllByTestId('player-card')[0]);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    vi.useRealTimers();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Stats' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Goal' }));
    expect(props.onRecordPlayerStat).toHaveBeenCalledWith('teamA', 'p1', 'goals');
  });

  it('tapping a player then pressing a shared team-stat button records both the team and player stat', async () => {
    const props = baseProps();
    render(<GameScreen {...props} />);
    await userEvent.click(screen.getAllByTestId('player-card')[0]); // selects Alex (teamA, p1)
    await userEvent.click(screen.getAllByRole('button', { name: 'AST (0)' })[0]);
    expect(props.onRecordAttributedTeamStat).toHaveBeenCalledWith('teamA', 'p1', 'assists');
    expect(props.onRecordTeamStat).not.toHaveBeenCalled();
  });

  it('pressing a shared team-stat button with no player selected only updates the team', async () => {
    const props = baseProps();
    render(<GameScreen {...props} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'AST (0)' })[0]);
    expect(props.onRecordTeamStat).toHaveBeenCalledWith('teamA', 'assists');
    expect(props.onRecordAttributedTeamStat).not.toHaveBeenCalled();
  });

  it("selecting a teamA player does not affect teamB's stat grid", async () => {
    const props = baseProps();
    render(<GameScreen {...props} />);
    await userEvent.click(screen.getAllByTestId('player-card')[0]); // selects Alex (teamA)
    await userEvent.click(screen.getAllByRole('button', { name: 'AST (0)' })[1]); // teamB's grid
    expect(props.onRecordTeamStat).toHaveBeenCalledWith('teamB', 'assists');
    expect(props.onRecordAttributedTeamStat).not.toHaveBeenCalled();
  });

  it('confirms before ending the half', async () => {
    const props = baseProps();
    render(<GameScreen {...props} />);
    await userEvent.click(screen.getByRole('button', { name: 'End Half' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(props.onEndHalf).toHaveBeenCalledTimes(1);
  });
});
