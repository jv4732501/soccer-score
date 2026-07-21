// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { serialize } from '../logic/persistence';
import type { SavedTeam } from '../logic/types';

const teamA: SavedTeam = {
  id: 'a1',
  name: 'Lions',
  players: [{ id: 'p1', num: 9, name: 'Alex', starter: true, position: null }],
};
const teamB: SavedTeam = {
  id: 'b1',
  name: 'Tigers',
  players: [{ id: 'p2', num: 7, name: 'Jo', starter: true, position: null }],
};

async function selectTeam(comboboxName: string, optionName: string) {
  await userEvent.click(screen.getByRole('combobox', { name: comboboxName }));
  await userEvent.click(await screen.findByRole('option', { name: optionName }));
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the Teams tab by default and can switch to Setup', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Teams' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Setup' }));
    expect(screen.getByRole('heading', { name: 'Setup' })).toBeInTheDocument();
  });

  it('starts a match from Setup and renders the Game screen', async () => {
    localStorage.setItem('soccerscore.teams', serialize([teamA, teamB]));
    render(<App />);
    await userEvent.click(screen.getByRole('tab', { name: 'Setup' }));
    await selectTeam('Team 1', 'Lions');
    await selectTeam('Team 2', 'Tigers');
    await userEvent.click(screen.getByRole('button', { name: 'Start Match' }));
    expect(screen.getByText('Half 1')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Setup' })).not.toBeInTheDocument();
  });

  it('finishes a match and returns to Setup via New Match, closing the summary dead-end', async () => {
    localStorage.setItem('soccerscore.teams', serialize([teamA, teamB]));
    render(<App />);
    await userEvent.click(screen.getByRole('tab', { name: 'Setup' }));
    await selectTeam('Team 1', 'Lions');
    await selectTeam('Team 2', 'Tigers');
    await userEvent.click(screen.getByRole('button', { name: 'Start Match' }));
    await userEvent.click(screen.getByRole('button', { name: 'End Half' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'End Game' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(screen.getByText(/Final: Lions 0 – 0 Tigers/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New Match' }));
    expect(screen.getByRole('heading', { name: 'Setup' })).toBeInTheDocument();
  });

  it('reviews a finished match from History read-only and returns via Back to History', async () => {
    localStorage.setItem('soccerscore.teams', serialize([teamA, teamB]));
    render(<App />);
    await userEvent.click(screen.getByRole('tab', { name: 'Setup' }));
    await selectTeam('Team 1', 'Lions');
    await selectTeam('Team 2', 'Tigers');
    await userEvent.click(screen.getByRole('button', { name: 'Start Match' }));
    await userEvent.click(screen.getByRole('button', { name: 'End Half' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'End Game' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await userEvent.click(screen.getByRole('button', { name: 'New Match' }));
    await userEvent.click(screen.getByRole('tab', { name: 'History' }));
    await userEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(screen.getByRole('button', { name: 'Back to History' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to History' }));
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
  });

  it('opens a live Review of the in-progress match from the game toolbar and returns via Back to Game', async () => {
    localStorage.setItem('soccerscore.teams', serialize([teamA, teamB]));
    render(<App />);
    await userEvent.click(screen.getByRole('tab', { name: 'Setup' }));
    await selectTeam('Team 1', 'Lions');
    await selectTeam('Team 2', 'Tigers');
    await userEvent.click(screen.getByRole('button', { name: 'Start Match' }));

    await userEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(screen.getByText(/Current: Lions 0 – 0 Tigers/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to Game' }));
    expect(screen.getByText('Half 1')).toBeInTheDocument();
  });

  it('edits match settings mid-game from the game toolbar hamburger menu', async () => {
    localStorage.setItem('soccerscore.teams', serialize([teamA, teamB]));
    render(<App />);
    await userEvent.click(screen.getByRole('tab', { name: 'Setup' }));
    await selectTeam('Team 1', 'Lions');
    await selectTeam('Team 2', 'Tigers');
    await userEvent.click(screen.getByRole('button', { name: 'Start Match' }));

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Match Settings' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Penalty shootout' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Re-open Settings to confirm the change was applied and persisted into match state.
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Match Settings' }));
    expect(screen.getByRole('checkbox', { name: 'Penalty shootout' })).toBeChecked();
  });
});
