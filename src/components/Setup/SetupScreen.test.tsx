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
    { id: 'p1', num: 9, name: 'Alex', starter: true, goalkeeper: false },
    { id: 'p2', num: 1, name: 'Sam', starter: true, goalkeeper: true },
  ],
};
const teamB: SavedTeam = {
  id: 'b1',
  name: 'Tigers',
  players: [{ id: 'p3', num: 7, name: 'Jo', starter: true, goalkeeper: false }],
};

describe('SetupScreen', () => {
  it('starts a match with the selected teams and default config', async () => {
    const onStartMatch = vi.fn();
    render(
      <SetupScreen
        savedTeams={[teamA, teamB]}
        onStartMatch={onStartMatch}
        onExportBackup={vi.fn()}
        onImportBackup={vi.fn()}
      />,
    );

    await userEvent.click(screen.getAllByRole('button', { name: 'Lions' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'Tigers' })[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Start Match' }));

    expect(onStartMatch).toHaveBeenCalledWith({
      config: {
        halfLengthMin: 45,
        hasExtraTime: false,
        extraTimeLengthMin: 15,
        hasShootout: false,
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
        onExportBackup={vi.fn()}
        onImportBackup={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Start Match' })).toBeDisabled();
  });

  it('toggles collapsed mode for Team A and still sends the current activeIds', async () => {
    const onStartMatch = vi.fn();
    render(
      <SetupScreen
        savedTeams={[teamA, teamB]}
        onStartMatch={onStartMatch}
        onExportBackup={vi.fn()}
        onImportBackup={vi.fn()}
      />,
    );

    // Select both teams
    await userEvent.click(screen.getAllByRole('button', { name: 'Lions' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'Tigers' })[1]);

    // Toggle collapsed checkbox for Team A
    const collapsedCheckboxes = screen.getAllByRole('checkbox', {
      name: 'Collapsed (score-only tracking)',
    });
    await userEvent.click(collapsedCheckboxes[0]);

    // Start match
    await userEvent.click(screen.getByRole('button', { name: 'Start Match' }));

    expect(onStartMatch).toHaveBeenCalledWith({
      config: {
        halfLengthMin: 45,
        hasExtraTime: false,
        extraTimeLengthMin: 15,
        hasShootout: false,
      },
      teamA,
      activeIdsA: ['p1', 'p2'],
      collapsedA: true,
      teamB,
      activeIdsB: ['p3'],
      collapsedB: false,
      homeTeam: 'teamA',
    });
  });

  it('toggles an individual player off and reflects in activeIds', async () => {
    const onStartMatch = vi.fn();
    render(
      <SetupScreen
        savedTeams={[teamA, teamB]}
        onStartMatch={onStartMatch}
        onExportBackup={vi.fn()}
        onImportBackup={vi.fn()}
      />,
    );

    // Select both teams
    await userEvent.click(screen.getAllByRole('button', { name: 'Lions' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'Tigers' })[1]);

    // Uncheck the first player (#9 Alex) from Team A
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
