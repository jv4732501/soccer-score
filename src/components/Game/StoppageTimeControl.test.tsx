// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoppageTimeControl } from './StoppageTimeControl';
import type { StoppageTimeControlProps } from './StoppageTimeControl';

function baseProps(overrides: Partial<StoppageTimeControlProps> = {}): StoppageTimeControlProps {
  return {
    hasStoppageTime: false,
    matchClock: { elapsedSec: 0, running: false, startedAt: null },
    periodTargetSec: 45 * 60,
    stoppageWatch: { elapsedSec: 0, running: false, startedAt: null },
    onRecordStoppage: vi.fn(),
    onToggleStoppageWatch: vi.fn(),
    onStopStoppageWatch: vi.fn(),
    ...overrides,
  };
}

describe('StoppageTimeControl', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when hasStoppageTime is off', () => {
    const { container } = render(
      <StoppageTimeControl
        {...baseProps({
          hasStoppageTime: false,
          matchClock: { elapsedSec: 45 * 60, running: false, startedAt: null },
        })}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Start stoppage time watch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Stoppage Time' })).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a Stp Time toggle button and a live watch readout when enabled', () => {
    render(<StoppageTimeControl {...baseProps({ hasStoppageTime: true })} />);
    expect(screen.getByRole('button', { name: 'Start stoppage time watch' })).toHaveTextContent(
      'Stp Time',
    );
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('toggles the stoppage watch and relabels the button to Stop while running', () => {
    const onToggleStoppageWatch = vi.fn();
    render(<StoppageTimeControl {...baseProps({ hasStoppageTime: true, onToggleStoppageWatch })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start stoppage time watch' }));
    expect(onToggleStoppageWatch).toHaveBeenCalledTimes(1);
  });

  it('shows the Stop label and ticks the watch live while it is running', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    render(
      <StoppageTimeControl
        {...baseProps({
          hasStoppageTime: true,
          stoppageWatch: { elapsedSec: 0, running: true, startedAt: 0 },
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'Stop stoppage watch' })).toHaveTextContent('Stop');
    act(() => {
      vi.setSystemTime(45000);
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByText('0:45')).toBeInTheDocument();
  });

  it('does not show Add Stoppage Time before the period target is reached', () => {
    render(
      <StoppageTimeControl
        {...baseProps({
          hasStoppageTime: true,
          periodTargetSec: 45 * 60,
          matchClock: { elapsedSec: 44 * 60, running: false, startedAt: null },
        })}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Add Stoppage Time' })).not.toBeInTheDocument();
  });

  it('shows Add Stoppage Time once the period target is reached, pre-filled with the watch estimate, and stops the watch', async () => {
    const onStopStoppageWatch = vi.fn();
    const onRecordStoppage = vi.fn();
    render(
      <StoppageTimeControl
        {...baseProps({
          hasStoppageTime: true,
          periodTargetSec: 45 * 60,
          matchClock: { elapsedSec: 45 * 60, running: false, startedAt: null },
          stoppageWatch: { elapsedSec: 90, running: false, startedAt: null },
          onStopStoppageWatch,
          onRecordStoppage,
        })}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Add Stoppage Time' }));
    expect(onStopStoppageWatch).toHaveBeenCalledTimes(1);

    const input = screen.getByLabelText('Added time (M:SS)');
    expect(input).toHaveValue('1:30');

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onRecordStoppage).toHaveBeenCalledWith(90);
  });

  it('lets the coach adjust the pre-filled estimate before saving', async () => {
    const onRecordStoppage = vi.fn();
    render(
      <StoppageTimeControl
        {...baseProps({
          hasStoppageTime: true,
          periodTargetSec: 45 * 60,
          matchClock: { elapsedSec: 45 * 60, running: false, startedAt: null },
          stoppageWatch: { elapsedSec: 90, running: false, startedAt: null },
          onRecordStoppage,
        })}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Add Stoppage Time' }));
    const input = screen.getByLabelText('Added time (M:SS)');
    await userEvent.clear(input);
    await userEvent.type(input, '2:00');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onRecordStoppage).toHaveBeenCalledWith(120);
  });
});
