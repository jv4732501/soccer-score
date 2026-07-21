// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamsScreen } from './TeamsScreen';
import type { SavedTeam } from '../../logic/types';

const team: SavedTeam = {
  id: 't1',
  name: 'Lions',
  players: [{ id: 'p1', num: 9, name: 'Alex', starter: true, position: null }],
};

describe('TeamsScreen', () => {
  it('lists saved teams and removes one on Delete after confirming', async () => {
    const onRemoveTeam = vi.fn();
    render(<TeamsScreen savedTeams={[team]} onUpsertTeam={vi.fn()} onRemoveTeam={onRemoveTeam} />);
    expect(screen.getByText('Lions')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onRemoveTeam).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onRemoveTeam).toHaveBeenCalledWith('t1');
  });

  it('does not remove the team if the delete confirmation is cancelled', async () => {
    const onRemoveTeam = vi.fn();
    render(<TeamsScreen savedTeams={[team]} onUpsertTeam={vi.fn()} onRemoveTeam={onRemoveTeam} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onRemoveTeam).not.toHaveBeenCalled();
  });

  it('opens the editor and saves a new team', async () => {
    const onUpsertTeam = vi.fn();
    render(<TeamsScreen savedTeams={[]} onUpsertTeam={onUpsertTeam} onRemoveTeam={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add Team' }));
    await userEvent.type(screen.getByLabelText('Team name'), 'Tigers');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onUpsertTeam).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Tigers', players: [] }),
    );
  });
});
