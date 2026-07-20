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
