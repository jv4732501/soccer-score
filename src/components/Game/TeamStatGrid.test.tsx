// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamStatGrid } from './TeamStatGrid';
import type { Team } from '../../logic/types';

function team(overrides: Partial<Team> = {}): Team {
  return {
    id: 't1',
    name: 'Lions',
    collapsed: false,
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
    ...overrides,
  };
}

describe('TeamStatGrid', () => {
  it('renders all 10 stat buttons with their current counts', () => {
    render(
      <TeamStatGrid
        team={team({ corners: 2, offsides: 1, shotsOnGoal: 3 })}
        teamKey="teamA"
        onRecordCorner={vi.fn()}
        onRecordOffside={vi.fn()}
        onRecordCard={vi.fn()}
        onRecordTeamStat={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Cor (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OFS (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AST (0)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SOG (3)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TOG (0)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TK (0)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'F (0)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SV (0)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'YC (0)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RC (0)' })).toBeInTheDocument();
  });

  it('pressing Cor calls onRecordCorner for the given team, and no minus buttons exist', async () => {
    const onRecordCorner = vi.fn();
    render(
      <TeamStatGrid
        team={team()}
        teamKey="teamB"
        onRecordCorner={onRecordCorner}
        onRecordOffside={vi.fn()}
        onRecordCard={vi.fn()}
        onRecordTeamStat={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cor (2)' }));
    expect(onRecordCorner).toHaveBeenCalledWith('teamB');
    expect(screen.queryByLabelText(/decrease/i)).not.toBeInTheDocument();
  });

  it('pressing a team-stat button (e.g. AST) calls onRecordTeamStat with the field name', async () => {
    const onRecordTeamStat = vi.fn();
    render(
      <TeamStatGrid
        team={team()}
        teamKey="teamA"
        onRecordCorner={vi.fn()}
        onRecordOffside={vi.fn()}
        onRecordCard={vi.fn()}
        onRecordTeamStat={onRecordTeamStat}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'AST (0)' }));
    expect(onRecordTeamStat).toHaveBeenCalledWith('teamA', 'assists');
  });

  it('pressing YC/RC calls onRecordCard with a null playerId (team-level)', async () => {
    const onRecordCard = vi.fn();
    render(
      <TeamStatGrid
        team={team()}
        teamKey="teamA"
        onRecordCorner={vi.fn()}
        onRecordOffside={vi.fn()}
        onRecordCard={onRecordCard}
        onRecordTeamStat={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'YC (0)' }));
    expect(onRecordCard).toHaveBeenCalledWith('teamA', null, 'yellow');
    await userEvent.click(screen.getByRole('button', { name: 'RC (0)' }));
    expect(onRecordCard).toHaveBeenCalledWith('teamA', null, 'red');
  });
});
