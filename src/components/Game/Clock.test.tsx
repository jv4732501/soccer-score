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
