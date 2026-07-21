// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScoreBar } from './ScoreBar';
import type { ScoreBarProps } from './ScoreBar';

function baseProps(overrides: Partial<ScoreBarProps> = {}): ScoreBarProps {
  return {
    teamAName: 'Lions',
    teamBName: 'Tigers',
    score: { teamA: 2, teamB: 1 },
    possession: { current: 'teamA', since: 0, accumSec: { teamA: 0, teamB: 0 } },
    clock: { elapsedSec: 0, running: false, startedAt: null },
    stoppageRunning: false,
    onSetPossession: vi.fn(),
    onAdjustScore: vi.fn(),
    ...overrides,
  };
}

describe('ScoreBar', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays both scores and sets possession on click', async () => {
    const onSetPossession = vi.fn();
    render(<ScoreBar {...baseProps({ onSetPossession })} />);
    expect(screen.getByText('Lions')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: /^Poss/ });
    await userEvent.click(buttons[1]);
    expect(onSetPossession).toHaveBeenCalledWith('teamB');
  });

  it('shows the accumulated possession total for each team', () => {
    render(
      <ScoreBar
        {...baseProps({
          possession: { current: null, since: null, accumSec: { teamA: 125, teamB: 61 } },
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'Poss 2:05' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Poss 1:01' })).toBeInTheDocument();
  });

  it('ticks the current possession holder live while the clock is running', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    render(
      <ScoreBar
        {...baseProps({
          possession: { current: 'teamA', since: 0, accumSec: { teamA: 0, teamB: 30 } },
          clock: { elapsedSec: 0, running: true, startedAt: 0 },
        })}
      />,
    );

    expect(screen.getByRole('button', { name: 'Poss 0:00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Poss 0:30' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // teamA (holding possession) has climbed to 0:10; teamB (not holding) stays frozen at 0:30.
    expect(screen.getByRole('button', { name: 'Poss 0:10' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Poss 0:30' })).toBeInTheDocument();
  });

  it('adjusts a team score via the +/- buttons flanking it', async () => {
    const onAdjustScore = vi.fn();
    render(<ScoreBar {...baseProps({ onAdjustScore })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Increase Lions score' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decrease Tigers score' }));
    expect(onAdjustScore).toHaveBeenCalledWith('teamA', 1);
    expect(onAdjustScore).toHaveBeenCalledWith('teamB', -1);
  });

  it('renders the center slot between the two team blocks', () => {
    render(<ScoreBar {...baseProps({ center: <div data-testid="clock-slot">clock</div> })} />);
    expect(screen.getByTestId('clock-slot')).toBeInTheDocument();
  });

  it('renders the period label between the two team names', () => {
    render(<ScoreBar {...baseProps({ periodLabel: 'HALF 1' })} />);
    expect(screen.getByText('HALF 1')).toBeInTheDocument();
  });

  it('freezes possession time and unselects the possession button while stoppage time is running', () => {
    render(
      <ScoreBar
        {...baseProps({
          possession: { current: 'teamA', since: 0, accumSec: { teamA: 90, teamB: 30 } },
          clock: { elapsedSec: 600, running: true, startedAt: 0 },
          stoppageRunning: true,
        })}
      />,
    );
    // possessionTotal ignores the live delta entirely while stoppage is running, so
    // teamA (the accrued holder) shows only its frozen base (1:30), and neither
    // Possession button renders as selected (contained).
    expect(screen.getByRole('button', { name: 'Poss 1:30' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Poss 1:30' })).not.toHaveClass('MuiButton-contained');
    expect(screen.getByRole('button', { name: 'Poss 0:30' })).not.toHaveClass('MuiButton-contained');
  });

  it('does not tick while the clock is paused', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    render(
      <ScoreBar
        {...baseProps({
          possession: { current: 'teamA', since: 0, accumSec: { teamA: 0, teamB: 0 } },
          clock: { elapsedSec: 0, running: false, startedAt: null },
        })}
      />,
    );

    act(() => {
      vi.setSystemTime(10000);
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getAllByRole('button', { name: 'Poss 0:00' })).toHaveLength(2);
  });
});
