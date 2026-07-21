// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetupScreen } from './SetupScreen';
import type { SavedTeam } from '../../logic/types';

const teamA: SavedTeam = {
  id: 'a1',
  name: 'Lions',
  players: [
    { id: 'p1', num: 9, name: 'Alex', starter: true, position: null },
    { id: 'p2', num: 1, name: 'Sam', starter: true, position: 1 },
  ],
};
const teamB: SavedTeam = {
  id: 'b1',
  name: 'Tigers',
  players: [{ id: 'p3', num: 7, name: 'Jo', starter: true, position: null }],
};

async function selectTeam(comboboxName: string, optionName: string) {
  await userEvent.click(screen.getByRole('combobox', { name: comboboxName }));
  await userEvent.click(await screen.findByRole('option', { name: optionName }));
}

describe('SetupScreen', () => {
  it('starts a match with the selected teams and default config', async () => {
    const onStartMatch = vi.fn();
    render(
      <SetupScreen
        savedTeams={[teamA, teamB]}
        onStartMatch={onStartMatch}
      />,
    );

    await selectTeam('Team 1', 'Lions');
    await selectTeam('Team 2', 'Tigers');
    await userEvent.click(screen.getByRole('button', { name: 'Start Match' }));

    expect(onStartMatch).toHaveBeenCalledWith({
      config: {
        halfLengthMin: 45,
        hasExtraTime: false,
        extraTimeLengthMin: 15,
        hasShootout: false,
        hasStoppageTime: false,
      },
      teamA,
      activeIdsA: ['p1', 'p2'],
      collapsedA: false,
      teamB,
      activeIdsB: ['p3'],
      collapsedB: false,
      homeTeam: 'teamA',
    });
  });

  it('disables Start Match until both teams are selected', () => {
    render(
      <SetupScreen
        savedTeams={[teamA, teamB]}
        onStartMatch={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Start Match' })).toBeDisabled();
  });

  it('allows starting a match with zero active players on a roster (matches basketball)', async () => {
    const onStartMatch = vi.fn();
    render(<SetupScreen savedTeams={[teamA, teamB]} onStartMatch={onStartMatch} />);

    await selectTeam('Team 1', 'Lions');
    await selectTeam('Team 2', 'Tigers');

    // Uncheck every active player on both rosters.
    for (const checkbox of screen.getAllByRole('checkbox')) {
      if ((checkbox as HTMLInputElement).checked) await userEvent.click(checkbox);
    }

    expect(screen.getByRole('button', { name: 'Start Match' })).not.toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Start Match' }));
    expect(onStartMatch).toHaveBeenCalledWith(
      expect.objectContaining({ activeIdsA: [], activeIdsB: [] }),
    );
  });

  it('keeps match settings collapsed until the section header is expanded', async () => {
    render(
      <SetupScreen
        savedTeams={[teamA, teamB]}
        onStartMatch={vi.fn()}
      />,
    );

    const summary = screen.getByRole('button', { name: 'Match Settings' });
    expect(summary).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Half length (minutes)')).not.toBeInTheDocument();

    await userEvent.click(summary);

    expect(summary).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Half length (minutes)')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Extra time' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Penalty shootout' })).toBeInTheDocument();
  });

  it('disables Start Match when the same team is selected for both sides', async () => {
    render(
      <SetupScreen
        savedTeams={[teamA, teamB]}
        onStartMatch={vi.fn()}
      />,
    );

    await selectTeam('Team 1', 'Lions');
    await selectTeam('Team 2', 'Lions');

    expect(screen.getByRole('button', { name: 'Start Match' })).toBeDisabled();
    expect(screen.getByText(/must be different teams/i)).toBeInTheDocument();
  });

  it('toggles an individual player off and reflects in activeIds', async () => {
    const onStartMatch = vi.fn();
    render(
      <SetupScreen
        savedTeams={[teamA, teamB]}
        onStartMatch={onStartMatch}
      />,
    );

    await selectTeam('Team 1', 'Lions');
    await selectTeam('Team 2', 'Tigers');

    // Uncheck the first player (#9 Alex) from Team 1
    const playerCheckboxes = screen.getAllByRole('checkbox', { name: /#9 Alex/ });
    await userEvent.click(playerCheckboxes[0]);

    // Start match
    await userEvent.click(screen.getByRole('button', { name: 'Start Match' }));

    expect(onStartMatch).toHaveBeenCalledWith({
      config: {
        halfLengthMin: 45,
        hasExtraTime: false,
        extraTimeLengthMin: 15,
        hasShootout: false,
        hasStoppageTime: false,
      },
      teamA,
      activeIdsA: ['p2'], // Only Sam (p2) remains active
      collapsedA: false,
      teamB,
      activeIdsB: ['p3'],
      collapsedB: false,
      homeTeam: 'teamA',
    });
  });
});
