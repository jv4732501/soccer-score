// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryScreen } from './HistoryScreen';
import { newMatch, adjustScore, endHalf, endGame } from '../../logic/match';
import { startShootout, recordAttempt } from '../../logic/shootout';
import type { SavedTeam } from '../../logic/types';

const teamA: SavedTeam = { id: 'a1', name: 'Lions', players: [] };
const teamB: SavedTeam = { id: 'b1', name: 'Tigers', players: [] };

function finishedMatch(nowMs: number) {
  let m = newMatch({
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: false },
    teamA,
    activeIdsA: [],
    collapsedA: true,
    teamB,
    activeIdsB: [],
    collapsedB: true,
    homeTeam: 'teamA',
  });
  m = adjustScore(m, 'teamA', 1, 0);
  m = endHalf(m, 0);
  m = endGame(m, nowMs);
  return m;
}

function shootoutFinishedMatch(nowMs: number) {
  let m = newMatch({
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: true },
    teamA,
    activeIdsA: [],
    collapsedA: true,
    teamB,
    activeIdsB: [],
    collapsedB: true,
    homeTeam: 'teamA',
  });
  m = adjustScore(m, 'teamA', 1, 0);
  m = adjustScore(m, 'teamB', 1, 0);
  m = endHalf(m, 0);
  m = startShootout(m, 0);
  m = recordAttempt(m, 'teamA', true, 0);
  m = recordAttempt(m, 'teamB', false, 0);
  m = recordAttempt(m, 'teamA', true, 0);
  m = recordAttempt(m, 'teamB', false, 0);
  m = recordAttempt(m, 'teamA', true, 0);
  m = recordAttempt(m, 'teamB', false, 0);
  m = endGame(m, nowMs);
  return m;
}

describe('HistoryScreen', () => {
  it('calls onReview with the match id', async () => {
    const onReview = vi.fn();
    const match = finishedMatch(1000);
    render(<HistoryScreen history={[match]} onReview={onReview} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(onReview).toHaveBeenCalledWith(match.id);
  });

  it('calls onDelete after confirming', async () => {
    const onDelete = vi.fn();
    const match = finishedMatch(1000);
    render(<HistoryScreen history={[match]} onReview={vi.fn()} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onDelete).toHaveBeenCalledWith(match.id);
  });

  it('shows an empty state with no history', () => {
    render(<HistoryScreen history={[]} onReview={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('No finished matches yet.')).toBeInTheDocument();
  });

  it('labels a penalty-shootout win as W, not T, even though match.score is level', () => {
    const match = shootoutFinishedMatch(1000);
    expect(match.score.teamA).toBe(match.score.teamB); // level on score, per shootout semantics
    expect(match.shootout?.winner).toBe('teamA');
    render(<HistoryScreen history={[match]} onReview={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/1–1 W/)).toBeInTheDocument();
    expect(screen.queryByText(/1–1 T/)).not.toBeInTheDocument();
  });
});
