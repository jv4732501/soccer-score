// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamEditor } from './TeamEditor';

describe('TeamEditor', () => {
  it('adds a player row and includes it on save', async () => {
    const onSave = vi.fn();
    render(<TeamEditor team={null} onSave={onSave} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Team name'), 'Tigers');
    await userEvent.click(screen.getByRole('button', { name: 'Add Player' }));
    await userEvent.type(screen.getByLabelText('Name'), 'Jo');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Tigers',
        players: [expect.objectContaining({ name: 'Jo' })],
      }),
    );
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<TeamEditor team={null} onSave={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
