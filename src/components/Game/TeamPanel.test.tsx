// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamPanel } from './TeamPanel';
import type { TeamPanelProps } from './TeamPanel';
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
    assists: 0,
    shotsOnGoal: 0,
    targetsOnGoal: 0,
    tackles: 0,
    foulsCommitted: 0,
    saves: 0,
  };
}

function fullTeam(): Team {
  return {
    id: 't2',
    name: 'Tigers',
    collapsed: false,
    players: [
      {
        id: 'p1', num: 7, name: 'Jo', starter: true, position: null, onField: true, inClock: 0,
        fieldSecs: 0, goals: 0, assists: 0, shotsOnGoal: 0, tackles: 0, foulsCommitted: 0,
        saves: 0, yellowCards: 0, redCards: 0, sentOff: false,
      },
    ],
    goalkeeperId: null, corners: 0, offsides: 0, yellowCards: 0, redCards: 0,
    assists: 0, shotsOnGoal: 0, targetsOnGoal: 0, tackles: 0, foulsCommitted: 0, saves: 0,
  };
}

function baseProps(overrides: Partial<TeamPanelProps> = {}): TeamPanelProps {
  return {
    team: fullTeam(),
    teamKey: 'teamB',
    selectedPlayerId: null,
    onSelectPlayer: vi.fn(),
    onAdjustScore: vi.fn(),
    onRecordCard: vi.fn(),
    onRecordPlayerStat: vi.fn(),
    onSubIn: vi.fn(),
    onSubOut: vi.fn(),
    onAddPlayer: vi.fn(),
    ...overrides,
  };
}

describe('TeamPanel', () => {
  it('collapsed team shows score/card controls and no roster', async () => {
    const onAdjustScore = vi.fn();
    render(
      <TeamPanel
        {...baseProps({ team: collapsedTeam(), teamKey: 'teamA', onAdjustScore })}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Stats' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+1 Goal' }));
    expect(onAdjustScore).toHaveBeenCalledWith('teamA', 1);
  });

  it('full team renders a roster row per player', () => {
    render(<TeamPanel {...baseProps()} />);
    expect(
      screen.getByText(
        (_, node) => node?.tagName.toLowerCase() === 'p' && node.textContent === '#7 J · 0G 0A',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+1 Goal' })).not.toBeInTheDocument();
  });

  it('clicking a player card calls onSelectPlayer with that player id', async () => {
    const onSelectPlayer = vi.fn();
    render(<TeamPanel {...baseProps({ onSelectPlayer })} />);
    await userEvent.click(screen.getByTestId('player-card'));
    expect(onSelectPlayer).toHaveBeenCalledWith('p1');
  });

  it('renders a quick-add form with number and name fields', () => {
    render(<TeamPanel {...baseProps()} />);
    expect(screen.getByPlaceholderText('#')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('Add is disabled until a number is entered', async () => {
    render(<TeamPanel {...baseProps()} />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText('#'), '22');
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
  });

  it('submitting the quick-add form calls onAddPlayer with the team, number, and name, then clears the fields', async () => {
    const onAddPlayer = vi.fn();
    render(<TeamPanel {...baseProps({ teamKey: 'teamA', onAddPlayer })} />);
    await userEvent.type(screen.getByPlaceholderText('#'), '22');
    await userEvent.type(screen.getByPlaceholderText('Name'), 'Rookie');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAddPlayer).toHaveBeenCalledWith('teamA', 22, 'Rookie');
    expect(screen.getByPlaceholderText('#')).toHaveValue('');
    expect(screen.getByPlaceholderText('Name')).toHaveValue('');
  });

  it('a name is optional when adding a player', async () => {
    const onAddPlayer = vi.fn();
    render(<TeamPanel {...baseProps({ teamKey: 'teamA', onAddPlayer })} />);
    await userEvent.type(screen.getByPlaceholderText('#'), '22');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAddPlayer).toHaveBeenCalledWith('teamA', 22, '');
  });
});
