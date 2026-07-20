// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScoreBar } from './ScoreBar';

describe('ScoreBar', () => {
  it('displays both scores and sets possession on click', async () => {
    const onSetPossession = vi.fn();
    render(
      <ScoreBar
        teamAName="Lions"
        teamBName="Tigers"
        score={{ teamA: 2, teamB: 1 }}
        possession="teamA"
        onSetPossession={onSetPossession}
      />,
    );
    expect(screen.getByText('Lions')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'Possession' });
    await userEvent.click(buttons[1]);
    expect(onSetPossession).toHaveBeenCalledWith('teamB');
  });
});
