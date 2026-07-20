// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SummaryScreen } from './SummaryScreen';
import { newMatch, adjustScore, endHalf, endGame } from '../../logic/match';
import { startShootout, recordAttempt } from '../../logic/shootout';
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

function shootoutMatch() {
  let m = newMatch({
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: true },
    teamA,
    activeIdsA: ['p1'],
    collapsedA: false,
    teamB,
    activeIdsB: ['p2'],
    collapsedB: false,
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
  m = endGame(m, 1000);
  return m;
}

function collapsedTeamMatch() {
  let m = newMatch({
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: false },
    teamA,
    activeIdsA: [],
    collapsedA: true,
    teamB,
    activeIdsB: ['p2'],
    collapsedB: false,
    homeTeam: 'teamA',
  });
  m = adjustScore(m, 'teamB', 1, 0);
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

  it('renders the period table and penalty result correctly for a shootout-decided match', () => {
    const match = shootoutMatch();
    // sanity-check the fixture: level on regulation score, decided on penalties 3-0
    expect(match.score.teamA).toBe(match.score.teamB);
    expect(match.shootout?.winner).toBe('teamA');

    render(<SummaryScreen match={match} mode="review" onClose={vi.fn()} />);

    // period table is the first table rendered (before the per-team box scores);
    // it must have exactly one row per period actually played (Half 1, Half 2) --
    // no phantom row for the shootout itself.
    const periodTable = screen.getAllByRole('table')[0];
    const rows = within(periodTable).getAllByRole('row');
    expect(rows).toHaveLength(3); // header + Half 1 + Half 2
    expect(within(periodTable).getByText('Half 1')).toBeInTheDocument();
    expect(within(periodTable).getByText('Half 2')).toBeInTheDocument();

    expect(screen.getByText(/Lions win on penalties \(3–0\)/)).toBeInTheDocument();
  });

  it('renders team totals only, with no player table, for a collapsed team', () => {
    render(<SummaryScreen match={collapsedTeamMatch()} mode="review" onClose={vi.fn()} />);

    // collapsed team (Lions) shows the totals line, not a player table
    expect(
      screen.getByText('Corners: 0 · Offsides: 0 · Yellow cards: 0 · Red cards: 0'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Alex')).not.toBeInTheDocument();

    // the other, non-collapsed team (Tigers) still gets its full player table
    expect(screen.getByText('Jo')).toBeInTheDocument();
  });
});
