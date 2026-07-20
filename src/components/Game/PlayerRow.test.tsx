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

  it('closes the Stats menu after selecting a stat', async () => {
    render(
      <PlayerRow
        player={player()}
        onRecordStat={vi.fn()}
        onRecordCard={vi.fn()}
        onSubIn={vi.fn()}
        onSubOut={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Stats' }));
    expect(screen.getByRole('menuitem', { name: 'Goal' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Goal' }));
    expect(screen.queryByRole('menuitem', { name: 'Goal' })).not.toBeInTheDocument();
  });

  it('subs in a bench player and closes the Sub menu', async () => {
    const onSubIn = vi.fn();
    render(
      <PlayerRow
        player={player({ onField: false })}
        onRecordStat={vi.fn()}
        onRecordCard={vi.fn()}
        onSubIn={onSubIn}
        onSubOut={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sub' }));
    expect(screen.getByRole('menuitem', { name: 'Sub In' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sub In' }));
    expect(onSubIn).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menuitem', { name: 'Sub In' })).not.toBeInTheDocument();
  });

  it('keeps Sub menu closed when Stats menu is open', async () => {
    render(
      <PlayerRow
        player={player()}
        onRecordStat={vi.fn()}
        onRecordCard={vi.fn()}
        onSubIn={vi.fn()}
        onSubOut={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Stats' }));
    expect(screen.queryByRole('menuitem', { name: 'Sub Out' })).not.toBeInTheDocument();
  });
});
