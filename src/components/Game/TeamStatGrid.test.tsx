// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamStatGrid } from './TeamStatGrid';
import type { LogEntry, Team } from '../../logic/types';

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

function logEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 1,
    period: 1,
    clockText: '10:00',
    team: 'teamA',
    playerId: null,
    type: 'corner',
    detail: 'Lions corner',
    rev: null,
    ...overrides,
  };
}

function longPress(el: HTMLElement) {
  fireEvent.pointerDown(el);
  act(() => {
    vi.advanceTimersByTime(500);
  });
}

describe('TeamStatGrid', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all 10 stat buttons with their current counts', () => {
    render(
      <TeamStatGrid
        team={team({ corners: 2, offsides: 1, shotsOnGoal: 3 })}
        teamKey="teamA"
        log={[]}
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
        log={[]}
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
        log={[]}
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
        log={[]}
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

  it('a short press does not open the activity dialog', () => {
    vi.useFakeTimers();
    render(
      <TeamStatGrid
        team={team()}
        teamKey="teamA"
        log={[logEntry()]}
        onRecordCorner={vi.fn()}
        onRecordOffside={vi.fn()}
        onRecordCard={vi.fn()}
        onRecordTeamStat={vi.fn()}
      />,
    );
    const btn = screen.getByRole('button', { name: 'Cor (2)' });
    fireEvent.pointerDown(btn);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.pointerUp(btn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('long-pressing Cor opens a dialog with that team\'s corner log entries and does not record a corner', () => {
    vi.useFakeTimers();
    const onRecordCorner = vi.fn();
    render(
      <TeamStatGrid
        team={team()}
        teamKey="teamA"
        log={[
          logEntry({ id: 1, team: 'teamA', type: 'corner', detail: 'Lions corner', clockText: '10:00' }),
          logEntry({ id: 2, team: 'teamB', type: 'corner', detail: 'Tigers corner' }),
          logEntry({ id: 3, team: 'teamA', type: 'offside', detail: 'Lions offside' }),
        ]}
        onRecordCorner={onRecordCorner}
        onRecordOffside={vi.fn()}
        onRecordCard={vi.fn()}
        onRecordTeamStat={vi.fn()}
      />,
    );
    longPress(screen.getByRole('button', { name: 'Cor (2)' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Lions Cor')).toBeInTheDocument();
    expect(screen.getByText(/10:00 Half 1 — Lions corner/)).toBeInTheDocument();
    expect(screen.queryByText(/Tigers corner/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Lions offside/)).not.toBeInTheDocument();
    expect(onRecordCorner).not.toHaveBeenCalled();
  });

  it('long-pressing a stat button with no matching entries shows "No activity yet"', () => {
    vi.useFakeTimers();
    render(
      <TeamStatGrid
        team={team()}
        teamKey="teamA"
        log={[]}
        onRecordCorner={vi.fn()}
        onRecordOffside={vi.fn()}
        onRecordCard={vi.fn()}
        onRecordTeamStat={vi.fn()}
      />,
    );
    longPress(screen.getByRole('button', { name: 'AST (0)' }));
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });

  it('AST activity includes both attributed (team_assists) and unattributed team-stat entries', () => {
    vi.useFakeTimers();
    render(
      <TeamStatGrid
        team={team()}
        teamKey="teamA"
        log={[
          logEntry({ id: 1, team: 'teamA', type: 'team_assists', playerId: 'p1', detail: '#9 Alex assist' }),
          logEntry({ id: 2, team: 'teamA', type: 'assists', playerId: 'p1', detail: '#9 Alex assist' }),
        ]}
        onRecordCorner={vi.fn()}
        onRecordOffside={vi.fn()}
        onRecordCard={vi.fn()}
        onRecordTeamStat={vi.fn()}
      />,
    );
    longPress(screen.getByRole('button', { name: 'AST (0)' }));
    expect(screen.getAllByText(/Alex assist/)).toHaveLength(2);
  });
});
