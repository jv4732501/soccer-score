// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryScreen } from './SummaryScreen';
import { newMatch, adjustScore, endHalf, endGame } from '../../logic/match';
import type { SavedTeam } from '../../logic/types';

const teamA: SavedTeam = {
  id: 'a1',
  name: 'Lions',
  players: [{ id: 'p1', num: 9, name: 'Alex', starter: true, goalkeeper: false }],
};
const teamB: SavedTeam = {
  id: 'b1',
  name: 'Tigers',
  players: [{ id: 'p2', num: 7, name: 'Jo', starter: true, goalkeeper: false }],
};

function finishedMatch() {
  let m = newMatch({
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: false },
    teamA,
    activeIdsA: ['p1'],
    collapsedA: false,
    teamB,
    activeIdsB: ['p2'],
    collapsedB: false,
    homeTeam: 'teamA',
  });
  m = adjustScore(m, 'teamA', 2, 0);
  m = endHalf(m, 0);
  m = endGame(m, 1000);
  return m;
}

describe('SummaryScreen', () => {
  it('renders the final score and box score in live mode with a New Match button', () => {
    render(<SummaryScreen match={finishedMatch()} mode="live" onClose={vi.fn()} />);
    expect(screen.getByText(/Final: Lions 2 – 0 Tigers/)).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Match' })).toBeInTheDocument();
  });

  it('renders a Back to History button in review mode', () => {
    render(<SummaryScreen match={finishedMatch()} mode="review" onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Back to History' })).toBeInTheDocument();
  });
});
