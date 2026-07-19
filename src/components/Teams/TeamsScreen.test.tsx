// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamsScreen } from './TeamsScreen';
import type { SavedTeam } from '../../logic/types';

const team: SavedTeam = {
  id: 't1',
  name: 'Lions',
  players: [{ id: 'p1', num: 9, name: 'Alex', starter: true, goalkeeper: false }],
};

describe('TeamsScreen', () => {
  it('lists saved teams and removes one on Delete', async () => {
    const onRemoveTeam = vi.fn();
    render(<TeamsScreen savedTeams={[team]} onUpsertTeam={vi.fn()} onRemoveTeam={onRemoveTeam} />);
    expect(screen.getByText('Lions')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onRemoveTeam).toHaveBeenCalledWith('t1');
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
