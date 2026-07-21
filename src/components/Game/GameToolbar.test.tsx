// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameToolbar } from './GameToolbar';
import type { MatchConfig } from '../../logic/types';

const baseConfig: MatchConfig = {
  halfLengthMin: 45,
  hasExtraTime: false,
  extraTimeLengthMin: 15,
  hasShootout: false,
  hasStoppageTime: false,
};

describe('GameToolbar', () => {
  it('calls onOpenReview when the Review button is clicked', async () => {
    const onOpenReview = vi.fn();
    render(
      <GameToolbar
        theme="dark"
        onToggleTheme={vi.fn()}
        config={baseConfig}
        onUpdateConfig={vi.fn()}
        onOpenReview={onOpenReview}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(onOpenReview).toHaveBeenCalledTimes(1);
  });

  it('opens a menu from the hamburger icon offering to switch theme and open Match Settings', async () => {
    const onToggleTheme = vi.fn();
    render(
      <GameToolbar
        theme="dark"
        onToggleTheme={onToggleTheme}
        config={baseConfig}
        onUpdateConfig={vi.fn()}
        onOpenReview={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const themeItem = await screen.findByRole('menuitem', { name: 'Switch to Light Mode' });
    await userEvent.click(themeItem);
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('opens the Match Settings dialog pre-filled with the current config and saves edits', async () => {
    const onUpdateConfig = vi.fn();
    render(
      <GameToolbar
        theme="dark"
        onToggleTheme={vi.fn()}
        config={baseConfig}
        onUpdateConfig={onUpdateConfig}
        onOpenReview={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Match Settings' }));

    const halfLength = screen.getByLabelText('Half length (minutes)');
    expect(halfLength).toHaveValue('45');
    await userEvent.clear(halfLength);
    await userEvent.type(halfLength, '30');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Extra time' }));
    expect(screen.getByLabelText('Extra time period length (minutes)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Penalty shootout' }));

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onUpdateConfig).toHaveBeenCalledWith({
      halfLengthMin: 30,
      hasExtraTime: true,
      extraTimeLengthMin: 15,
      hasShootout: true,
      hasStoppageTime: false,
    });
  });

  it('discards edits when Match Settings is cancelled', async () => {
    const onUpdateConfig = vi.fn();
    render(
      <GameToolbar
        theme="dark"
        onToggleTheme={vi.fn()}
        config={baseConfig}
        onUpdateConfig={onUpdateConfig}
        onOpenReview={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Match Settings' }));

    const halfLength = screen.getByLabelText('Half length (minutes)');
    await userEvent.clear(halfLength);
    await userEvent.type(halfLength, '30');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onUpdateConfig).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByLabelText('Half length (minutes)')).not.toBeInTheDocument();
    });
  });
});
