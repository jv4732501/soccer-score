// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamPanel } from './TeamPanel';
import type { Team } from '../../logic/types';

function collapsedTeam(): Team {
  return {
    id: 't1',
    name: 'Lions',
    collapsed: true,
    players: [],
    goalkeeperId: null,
    corners: 2,
    offsides: 1,
    yellowCards: 0,
    redCards: 0,
  };
}

describe('TeamPanel', () => {
  it('collapsed team shows score/card/corner controls and no roster', async () => {
    const onAdjustScore = vi.fn();
    render(
      <TeamPanel
        team={collapsedTeam()}
        teamKey="teamA"
        onAdjustScore={onAdjustScore}
        onRecordCard={vi.fn()}
        onRecordCorner={vi.fn()}
        onRecordOffside={vi.fn()}
        onRecordPlayerStat={vi.fn()}
        onSubIn={vi.fn()}
        onSubOut={vi.fn()}
      />,
    );
    expect(screen.getByText('Corner (2)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stats' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+1 Goal' }));
    expect(onAdjustScore).toHaveBeenCalledWith('teamA', 1);
  });

  it('full team renders a roster row per player', () => {
    const team: Team = {
      id: 't2',
      name: 'Tigers',
      collapsed: false,
      players: [
        {
          id: 'p1',
          num: 7,
          name: 'Jo',
          starter: true,
          goalkeeper: false,
          onField: true,
          inClock: 0,
          fieldSecs: 0,
          goals: 0,
          assists: 0,
          shotsOnGoal: 0,
          tackles: 0,
          foulsCommitted: 0,
          saves: 0,
          yellowCards: 0,
          redCards: 0,
          sentOff: false,
        },
      ],
      goalkeeperId: null,
      corners: 0,
      offsides: 0,
      yellowCards: 0,
      redCards: 0,
    };
    render(
      <TeamPanel
        team={team}
        teamKey="teamB"
        onAdjustScore={vi.fn()}
        onRecordCard={vi.fn()}
        onRecordCorner={vi.fn()}
        onRecordOffside={vi.fn()}
        onRecordPlayerStat={vi.fn()}
        onSubIn={vi.fn()}
        onSubOut={vi.fn()}
      />,
    );
    expect(screen.getByText('#7 Jo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+1 Goal' })).not.toBeInTheDocument();
  });
});
