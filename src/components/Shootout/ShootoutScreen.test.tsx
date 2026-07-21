// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShootoutScreen } from './ShootoutScreen';
import { newMatch } from '../../logic/match';
import { startShootout, recordAttempt } from '../../logic/shootout';
import type { SavedTeam } from '../../logic/types';

const teamA: SavedTeam = { id: 'a1', name: 'Lions', players: [] };
const teamB: SavedTeam = { id: 'b1', name: 'Tigers', players: [] };

function shootoutMatch() {
  let m = newMatch({
    config: { halfLengthMin: 45, hasExtraTime: false, extraTimeLengthMin: 15, hasShootout: true, hasStoppageTime: false },
    teamA,
    activeIdsA: [],
    collapsedA: true,
    teamB,
    activeIdsB: [],
    collapsedB: true,
    homeTeam: 'teamA',
  });
  m = startShootout(m, 0);
  return m;
}

describe('ShootoutScreen', () => {
  it('records an attempt for the next shooter', async () => {
    const onRecordAttempt = vi.fn();
    render(
      <ShootoutScreen
        match={shootoutMatch()}
        onRecordAttempt={onRecordAttempt}
        onUndo={vi.fn()}
        onEndGame={vi.fn()}
      />,
    );
    expect(screen.getByText(/Next: Lions/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Scored' }));
    expect(onRecordAttempt).toHaveBeenCalledWith('teamA', true);
  });

  it('shows a winner banner once the shootout is decided', () => {
    let m = shootoutMatch();
    m = recordAttempt(m, 'teamA', true, 0);
    m = recordAttempt(m, 'teamB', false, 0);
    m = recordAttempt(m, 'teamA', true, 0);
    m = recordAttempt(m, 'teamB', false, 0);
    m = recordAttempt(m, 'teamA', true, 0);
    m = recordAttempt(m, 'teamB', false, 0);
    render(
      <ShootoutScreen match={m} onRecordAttempt={vi.fn()} onUndo={vi.fn()} onEndGame={vi.fn()} />,
    );
    expect(screen.getByText(/wins the shootout/)).toBeInTheDocument();
  });
});
