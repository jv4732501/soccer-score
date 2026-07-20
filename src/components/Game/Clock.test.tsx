// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Clock } from './Clock';

describe('Clock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it('updates displayed time via live-tick interval when running', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const { unmount } = render(
      <Clock
        clock={{ elapsedSec: 0, running: true, startedAt: 0 }}
        stoppageSec={0}
        onToggleClock={vi.fn()}
        onRecordStoppage={vi.fn()}
      />,
    );

    // Initial time should be 0:00
    expect(screen.getByText('0:00')).toBeInTheDocument();

    // Advance system time and timers together to trigger the interval callback
    act(() => {
      vi.setSystemTime(5000);
      vi.advanceTimersByTime(250);
    });

    // After advancing 5 seconds, displayed time should be 0:05
    expect(screen.getByText('0:05')).toBeInTheDocument();

    // Verify interval is active before unmount
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    // Unmount and verify interval is cleared
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
