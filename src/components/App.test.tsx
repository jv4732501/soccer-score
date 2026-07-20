// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { serialize } from '../logic/persistence';
import type { SavedTeam } from '../logic/types';

const teamA: SavedTeam = {
  id: 'a1',
  name: 'Lions',
  players: [{ id: 'p1', num: 9, name: 'Alex', starter: true, goalkeeper: false }],
};
const teamB: SavedTeam = {
  id: 'b1',
  name: 'Tigers',
  players: [{ id: 'p2', num: 7, name: 'Jo', starter: true, goalkeeper: false }],
};

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
    await userEvent.click(screen.getAllByRole('button', { name: 'Lions' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: 'Tigers' })[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Start Match' }));
    expect(screen.getByText('Half 1')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Setup' })).not.toBeInTheDocument();
  });
});
