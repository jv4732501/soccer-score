// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamEditor } from './TeamEditor';

async function addPlayer(num: string, name?: string) {
  const numField = screen.getByLabelText('#');
  await userEvent.click(numField);
  await userEvent.type(numField, num);
  if (name) {
    await userEvent.type(screen.getByLabelText('Name (optional)'), name);
  }
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
}

describe('TeamEditor', () => {
  it('adds a player via the quick Add form and lists it as a compact row', async () => {
    const onSave = vi.fn();
    render(<TeamEditor team={null} onSave={onSave} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Team name'), 'Tigers');
    await addPlayer('9', 'Alex');

    expect(screen.getByText('#9 Alex')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Tigers',
        players: [
          expect.objectContaining({ num: 9, name: 'Alex', starter: false, position: null }),
        ],
      }),
    );
  });

  it('adds a player with no name (optional) via just a number', async () => {
    const onSave = vi.fn();
    render(<TeamEditor team={null} onSave={onSave} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Team name'), 'Tigers');
    await addPlayer('7');

    expect(screen.getByText('#7')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        players: [expect.objectContaining({ num: 7, name: '' })],
      }),
    );
  });

  it('disables Add until a number is entered, and refocuses the # field after adding', async () => {
    render(<TeamEditor team={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();

    const numField = screen.getByLabelText('#');
    await userEvent.click(numField);
    await userEvent.type(numField, '9');
    await userEvent.type(screen.getByLabelText('Name (optional)'), 'Alex');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(numField).toHaveValue('');
    expect(screen.getByLabelText('Name (optional)')).toHaveValue('');
    expect(numField).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('toggles START directly from the roster row (defaults off for a new player)', async () => {
    const onSave = vi.fn();
    render(<TeamEditor team={null} onSave={onSave} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Team name'), 'Tigers');
    await addPlayer('9', 'Alex');

    const starterToggle = screen.getByRole('button', { name: 'START' });
    expect(starterToggle).toHaveClass('MuiButton-outlined');
    await userEvent.click(starterToggle);
    expect(starterToggle).toHaveClass('MuiButton-contained');

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        players: [expect.objectContaining({ name: 'Alex', starter: true })],
      }),
    );
  });

  it('opens an Edit dialog pre-filled with the player, and saves changes to #, Name, Starter, and Position', async () => {
    const onSave = vi.fn();
    render(<TeamEditor team={null} onSave={onSave} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Team name'), 'Tigers');
    await addPlayer('9', 'Alex');

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByLabelText('#')).toHaveValue('9');
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Alex');
    expect(within(dialog).getByRole('button', { name: 'Starter' })).toHaveClass(
      'MuiButton-outlined',
    );
    expect(within(dialog).getByRole('combobox', { name: 'Position' })).toHaveTextContent('None');

    await userEvent.clear(within(dialog).getByLabelText('#'));
    await userEvent.type(within(dialog).getByLabelText('#'), '10');
    await userEvent.clear(within(dialog).getByLabelText('Name'));
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Alexander');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Starter' }));
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Position' }));
    await userEvent.click(await screen.findByRole('option', { name: '1 G' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(screen.getByText('#10 Alexander')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        players: [
          expect.objectContaining({ num: 10, name: 'Alexander', starter: true, position: 1 }),
        ],
      }),
    );
  });

  it('discards changes when the Edit dialog is cancelled', async () => {
    const onSave = vi.fn();
    render(<TeamEditor team={null} onSave={onSave} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Team name'), 'Tigers');
    await addPlayer('9', 'Alex');

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.clear(within(dialog).getByLabelText('Name'));
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Someone Else');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(screen.getByText('#9 Alex')).toBeInTheDocument();
    expect(screen.queryByText(/Someone Else/)).not.toBeInTheDocument();
  });

  it('carries the full position name as hover text on each option in the Edit dialog', async () => {
    render(<TeamEditor team={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    await addPlayer('9', 'Alex');
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Position' }));
    const option = await screen.findByRole('option', { name: '2 RB' });
    expect(option).toHaveAttribute('title', 'Right Outside Back');
  });

  it('sets Position directly from the roster row, like Starter', async () => {
    const onSave = vi.fn();
    render(<TeamEditor team={null} onSave={onSave} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Team name'), 'Tigers');
    await addPlayer('9', 'Alex');

    const positionCombo = screen.getByRole('combobox', { name: 'Position' });
    expect(positionCombo).toHaveTextContent('None');
    await userEvent.click(positionCombo);
    await userEvent.click(await screen.findByRole('option', { name: '1 G' }));
    expect(positionCombo).toHaveTextContent('1 G');

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        players: [expect.objectContaining({ name: 'Alex', position: 1 })],
      }),
    );
  });

  it('removes a player via the red delete button, after confirming', async () => {
    const onSave = vi.fn();
    render(<TeamEditor team={null} onSave={onSave} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Team name'), 'Tigers');
    await addPlayer('9', 'Alex');

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    expect(deleteButton).toHaveClass('MuiButton-colorError');
    await userEvent.click(deleteButton);

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ players: [] }));
  });

  it('does not remove the player if the delete confirmation is cancelled', async () => {
    const onSave = vi.fn();
    render(<TeamEditor team={null} onSave={onSave} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Team name'), 'Tigers');
    await addPlayer('9', 'Alex');

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ players: [expect.objectContaining({ name: 'Alex' })] }),
    );
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<TeamEditor team={null} onSave={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
