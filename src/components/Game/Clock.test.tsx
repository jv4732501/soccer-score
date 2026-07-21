// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Clock } from './Clock';
import type { ClockProps } from './Clock';

function baseProps(overrides: Partial<ClockProps> = {}): ClockProps {
  return {
    clock: { elapsedSec: 0, running: false, startedAt: null },
    stoppageSec: 0,
    onToggleClock: vi.fn(),
    onAdjustClock: vi.fn(),
    ...overrides,
  };
}

describe('Clock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays the formatted elapsed time and toggles on click', async () => {
    const onToggleClock = vi.fn();
    render(<Clock {...baseProps({ clock: { elapsedSec: 125, running: false, startedAt: null }, onToggleClock })} />);
    expect(screen.getByText('2:05')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onToggleClock).toHaveBeenCalledTimes(1);
  });

  it('updates displayed time via live-tick interval when running', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const { unmount } = render(
      <Clock {...baseProps({ clock: { elapsedSec: 0, running: true, startedAt: 0 } })} />,
    );

    expect(screen.getByText('0:00')).toBeInTheDocument();

    act(() => {
      vi.setSystemTime(5000);
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByText('0:05')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a quick click on the plus button adjusts by +1 second', () => {
    const onAdjustClock = vi.fn();
    render(
      <Clock {...baseProps({ clock: { elapsedSec: 100, running: false, startedAt: null }, onAdjustClock })} />,
    );
    const plusBtn = screen.getByRole('button', { name: 'Increase clock' });
    fireEvent.pointerDown(plusBtn);
    fireEvent.pointerUp(plusBtn);
    fireEvent.click(plusBtn);
    expect(onAdjustClock).toHaveBeenCalledTimes(1);
    expect(onAdjustClock).toHaveBeenCalledWith(1);
  });

  it('a quick click on the minus button adjusts by -1 second', () => {
    const onAdjustClock = vi.fn();
    render(
      <Clock {...baseProps({ clock: { elapsedSec: 100, running: false, startedAt: null }, onAdjustClock })} />,
    );
    const minusBtn = screen.getByRole('button', { name: 'Decrease clock' });
    fireEvent.pointerDown(minusBtn);
    fireEvent.pointerUp(minusBtn);
    fireEvent.click(minusBtn);
    expect(onAdjustClock).toHaveBeenCalledTimes(1);
    expect(onAdjustClock).toHaveBeenCalledWith(-1);
  });

  it('holding the plus button adjusts by +10 after 500ms, then repeats every 300ms until released', () => {
    vi.useFakeTimers();
    const onAdjustClock = vi.fn();
    render(
      <Clock {...baseProps({ clock: { elapsedSec: 100, running: false, startedAt: null }, onAdjustClock })} />,
    );
    const plusBtn = screen.getByRole('button', { name: 'Increase clock' });

    fireEvent.pointerDown(plusBtn);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onAdjustClock).toHaveBeenCalledTimes(1);
    expect(onAdjustClock).toHaveBeenLastCalledWith(10);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onAdjustClock).toHaveBeenCalledTimes(2);
    expect(onAdjustClock).toHaveBeenLastCalledWith(10);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onAdjustClock).toHaveBeenCalledTimes(3);

    fireEvent.pointerUp(plusBtn);
    fireEvent.click(plusBtn);
    expect(onAdjustClock).toHaveBeenCalledTimes(3);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onAdjustClock).toHaveBeenCalledTimes(3);
  });

  it('releasing before the hold threshold only fires a single +1 tap', () => {
    vi.useFakeTimers();
    const onAdjustClock = vi.fn();
    render(
      <Clock {...baseProps({ clock: { elapsedSec: 100, running: false, startedAt: null }, onAdjustClock })} />,
    );
    const plusBtn = screen.getByRole('button', { name: 'Increase clock' });

    fireEvent.pointerDown(plusBtn);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.pointerUp(plusBtn);
    fireEvent.click(plusBtn);

    expect(onAdjustClock).toHaveBeenCalledTimes(1);
    expect(onAdjustClock).toHaveBeenCalledWith(1);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onAdjustClock).toHaveBeenCalledTimes(1);
  });
});
