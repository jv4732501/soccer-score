// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Nav } from './Nav';

function renderNav(overrides: Partial<Parameters<typeof Nav>[0]> = {}) {
  return render(
    <Nav
      homeView="setup"
      onChangeHomeView={vi.fn()}
      theme="dark"
      onToggleTheme={vi.fn()}
      onExportBackup={vi.fn()}
      onImportBackup={vi.fn()}
      {...overrides}
    />,
  );
}

describe('Nav', () => {
  it('does not render an app title', () => {
    renderNav();
    expect(screen.queryByText('Soccer Score')).not.toBeInTheDocument();
  });

  it('opens a menu from the hamburger icon offering to switch to the opposite theme', async () => {
    const onToggleTheme = vi.fn();
    renderNav({ onToggleTheme });

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const item = await screen.findByRole('menuitem', { name: 'Switch to Light Mode' });
    await userEvent.click(item);

    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('offers to switch to dark mode when currently in light mode', async () => {
    renderNav({ theme: 'light' });

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(await screen.findByRole('menuitem', { name: 'Switch to Dark Mode' })).toBeVisible();
  });

  it('still renders the Setup/Teams/History tabs', () => {
    renderNav({ homeView: 'teams' });
    expect(screen.getByRole('tab', { name: 'Setup' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Teams' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'History' })).toBeInTheDocument();
  });

  it('calls onExportBackup from the hamburger menu', async () => {
    const onExportBackup = vi.fn();
    renderNav({ onExportBackup });

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Export Backup' }));

    expect(onExportBackup).toHaveBeenCalledTimes(1);
  });

  it('imports a backup file selected via the Import Backup menu item and shows a success message', async () => {
    const onImportBackup = vi
      .fn()
      .mockResolvedValue({ teamsAdded: 1, teamsUpdated: 0, gamesAdded: 2, gamesUpdated: 0 });
    renderNav({ onImportBackup });

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    await userEvent.upload(fileInput, file);

    expect(onImportBackup).toHaveBeenCalledWith(file);
    expect(
      await screen.findByText(/Imported: 1 team\(s\) added, 0 updated, 2 game\(s\) added/),
    ).toBeInTheDocument();
  });

  it('shows an error message when importing an invalid backup file', async () => {
    const onImportBackup = vi.fn().mockRejectedValue(new Error('Invalid backup file.'));
    renderNav({ onImportBackup });

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['not json'], 'backup.json', { type: 'application/json' });
    await userEvent.upload(fileInput, file);

    expect(await screen.findByText('Invalid backup file.')).toBeInTheDocument();
  });
});
