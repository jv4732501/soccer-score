// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerRow } from './PlayerRow';
import type { PlayerRowProps } from './PlayerRow';
import type { LogEntry, Player } from '../../logic/types';

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    num: 9,
    name: 'Alex',
    starter: true,
    position: null,
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

function logEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 1,
    period: 1,
    clockText: '10:00',
    team: 'teamA',
    playerId: 'p1',
    type: 'goals',
    detail: '#9 Alex goal',
    rev: null,
    ...overrides,
  };
}

function baseProps(overrides: Partial<PlayerRowProps> = {}): PlayerRowProps {
  return {
    player: player(),
    log: [],
    selected: false,
    onSelect: vi.fn(),
    onRecordStat: vi.fn(),
    onRecordCard: vi.fn(),
    onSubIn: vi.fn(),
    onSubOut: vi.fn(),
    ...overrides,
  };
}

function longPress(el: HTMLElement) {
  fireEvent.pointerDown(el);
  act(() => {
    vi.advanceTimersByTime(500);
  });
}

describe('PlayerRow', () => {
  it('shows number, initials, and abbreviated goals/assists on one compact line', () => {
    render(<PlayerRow {...baseProps({ player: player({ num: 9, name: 'Alex Smith', goals: 2, assists: 1 }) })} />);
    expect(screen.getByText(/#9/)).toBeInTheDocument();
    expect(screen.getByText(/AS · 2G 1A/)).toBeInTheDocument();
  });

  it('renders no Stats or Sub buttons on the row itself', () => {
    render(<PlayerRow {...baseProps()} />);
    expect(screen.queryByRole('button', { name: 'Stats' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sub' })).not.toBeInTheDocument();
  });

  it('a short click selects the player (not a long press)', async () => {
    const onSelect = vi.fn();
    render(<PlayerRow {...baseProps({ onSelect })} />);
    await userEvent.click(screen.getByTestId('player-card'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('a short press does not open the long-press menu', () => {
    vi.useFakeTimers();
    render(<PlayerRow {...baseProps()} />);
    const card = screen.getByTestId('player-card');
    fireEvent.pointerDown(card);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.pointerUp(card);
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('a long press does not also fire the select click', () => {
    vi.useFakeTimers();
    const onSelect = vi.fn();
    render(<PlayerRow {...baseProps({ onSelect })} />);
    const card = screen.getByTestId('player-card');
    longPress(card);
    fireEvent.click(card);
    expect(onSelect).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('long-pressing an on-field player opens a menu with Bench and Stats', () => {
    vi.useFakeTimers();
    render(<PlayerRow {...baseProps({ player: player({ onField: true }) })} />);
    longPress(screen.getByTestId('player-card'));
    expect(screen.getByRole('menuitem', { name: 'Bench' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Stats' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'On' })).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('long-pressing a benched player opens a menu with On and Stats', () => {
    vi.useFakeTimers();
    render(<PlayerRow {...baseProps({ player: player({ onField: false }) })} />);
    longPress(screen.getByTestId('player-card'));
    expect(screen.getByRole('menuitem', { name: 'On' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Stats' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Bench' })).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('a sent-off player only offers Stats (no Bench/On)', () => {
    vi.useFakeTimers();
    render(<PlayerRow {...baseProps({ player: player({ onField: false, sentOff: true }) })} />);
    longPress(screen.getByTestId('player-card'));
    expect(screen.getByRole('menuitem', { name: 'Stats' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'On' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Bench' })).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('selecting Bench subs the player out immediately', () => {
    vi.useFakeTimers();
    const onSubOut = vi.fn();
    render(<PlayerRow {...baseProps({ player: player({ onField: true }), onSubOut })} />);
    longPress(screen.getByTestId('player-card'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Bench' }));
    expect(onSubOut).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('selecting On opens a position picker, and saving subs the player in with that position', async () => {
    vi.useFakeTimers();
    const onSubIn = vi.fn();
    render(<PlayerRow {...baseProps({ player: player({ onField: false }), onSubIn })} />);
    longPress(screen.getByTestId('player-card'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'On' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    vi.useRealTimers();

    await userEvent.click(screen.getByRole('combobox', { name: 'Position' }));
    await userEvent.click(await screen.findByRole('option', { name: 'CF' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubIn).toHaveBeenCalledWith(9);
  });

  it('records a stat via the Stats menu reached through the long-press menu', async () => {
    vi.useFakeTimers();
    const onRecordStat = vi.fn();
    render(<PlayerRow {...baseProps({ onRecordStat })} />);
    longPress(screen.getByTestId('player-card'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Stats' }));
    vi.useRealTimers();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Goal' }));
    expect(onRecordStat).toHaveBeenCalledWith('goals');
  });

  it('long-pressing a player offers an Activity option', () => {
    vi.useFakeTimers();
    render(<PlayerRow {...baseProps()} />);
    longPress(screen.getByTestId('player-card'));
    expect(screen.getByRole('menuitem', { name: 'Activity' })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('selecting Activity shows a dialog with only this player\'s log entries, newest first', () => {
    vi.useFakeTimers();
    render(
      <PlayerRow
        {...baseProps({
          player: player({ id: 'p1', num: 9, name: 'Alex Smith' }),
          log: [
            logEntry({ id: 1, playerId: 'p1', clockText: '10:00', detail: '#9 Alex Smith subs in' }),
            logEntry({ id: 2, playerId: 'other', detail: 'someone else goal' }),
            logEntry({ id: 3, playerId: 'p1', clockText: '5:00', detail: '#9 Alex Smith goal' }),
          ],
        })}
      />,
    );
    longPress(screen.getByTestId('player-card'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Activity' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('#9 AS')).toBeInTheDocument();
    const items = screen.getAllByText(/—/);
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('5:00 Half 1 — #9 Alex Smith goal');
    expect(items[1]).toHaveTextContent('10:00 Half 1 — #9 Alex Smith subs in');
    expect(screen.queryByText(/someone else goal/)).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows "No activity yet" when the player has no log entries', () => {
    vi.useFakeTimers();
    render(<PlayerRow {...baseProps({ log: [] })} />);
    longPress(screen.getByTestId('player-card'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Activity' }));
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
