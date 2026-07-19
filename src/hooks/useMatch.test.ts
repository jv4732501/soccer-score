// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMatch } from './useMatch';
import type { SavedTeam } from '../logic/types';

const teamA: SavedTeam = {
  id: 'teamA-1',
  name: 'Lions',
  players: [
    { id: 'p1', num: 9, name: 'Alex', starter: true, goalkeeper: false },
    { id: 'p2', num: 1, name: 'Sam', starter: true, goalkeeper: true },
  ],
};
const teamB: SavedTeam = {
  id: 'teamB-1',
  name: 'Tigers',
  players: [{ id: 'p3', num: 7, name: 'Jo', starter: true, goalkeeper: false }],
};

function startArgs() {
  return {
    config: { halfLengthMin: 30, hasExtraTime: false, extraTimeLengthMin: 10, hasShootout: false },
    teamA,
    activeIdsA: ['p1', 'p2'],
    collapsedA: false,
    teamB,
    activeIdsB: ['p3'],
    collapsedB: false,
    homeTeam: 'teamA' as const,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('useMatch', () => {
  it('hydrates initial state from localStorage', () => {
    localStorage.setItem('soccerscore.teams', JSON.stringify([teamA]));
    localStorage.setItem('soccerscore.theme', 'light');
    const { result } = renderHook(() => useMatch());
    expect(result.current.savedTeams).toEqual([teamA]);
    expect(result.current.theme).toBe('light');
    expect(result.current.match).toBeNull();
  });

  it('startMatch creates a match and persists it to localStorage', () => {
    const { result } = renderHook(() => useMatch());
    act(() => result.current.startMatch(startArgs()));
    expect(result.current.match).not.toBeNull();
    expect(result.current.match?.teamA.name).toBe('Lions');
    expect(JSON.parse(localStorage.getItem('soccerscore.match')!).teamA.name).toBe('Lions');
  });

  it('adjustScore calls through to the logic layer and updates state', () => {
    const { result } = renderHook(() => useMatch());
    act(() => result.current.startMatch(startArgs()));
    act(() => result.current.adjustScore('teamA', 1));
    expect(result.current.match?.score.teamA).toBe(1);
  });

  it('undo reverses the last logged action', () => {
    const { result } = renderHook(() => useMatch());
    act(() => result.current.startMatch(startArgs()));
    act(() => result.current.adjustScore('teamA', 1));
    act(() => result.current.undo());
    expect(result.current.match?.score.teamA).toBe(0);
  });

  it('upsertTeam and removeTeam manage the saved-team library and persist it', () => {
    const { result } = renderHook(() => useMatch());
    act(() => result.current.upsertTeam(teamA));
    expect(result.current.savedTeams).toEqual([teamA]);
    expect(JSON.parse(localStorage.getItem('soccerscore.teams')!)).toEqual([teamA]);
    act(() => result.current.removeTeam(teamA.id));
    expect(result.current.savedTeams).toEqual([]);
  });

  it('setTheme updates and persists the theme', () => {
    const { result } = renderHook(() => useMatch());
    act(() => result.current.setTheme('light'));
    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('soccerscore.theme')).toBe('light');
  });

  it('exportBackup triggers a file download', () => {
    const { result } = renderHook(() => useMatch());
    act(() => result.current.upsertTeam(teamA));
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    act(() => result.current.exportBackup());
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('importBackup merges a valid backup file and returns a summary', async () => {
    const { result } = renderHook(() => useMatch());
    const backupJson = JSON.stringify({
      app: 'soccerscore',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      teams: [teamB],
      history: [],
      match: null,
    });
    const file = new File([backupJson], 'backup.json', { type: 'application/json' });
    let summary;
    await act(async () => {
      summary = await result.current.importBackup(file);
    });
    expect(summary).toEqual({
      teamsAdded: 1,
      teamsUpdated: 0,
      gamesAdded: 0,
      gamesUpdated: 0,
      matchRestored: false,
      matchSkipped: false,
    });
    expect(result.current.savedTeams).toEqual([teamB]);
  });

  it('importBackup rejects a file that is not valid JSON', async () => {
    const { result } = renderHook(() => useMatch());
    const file = new File(['not json'], 'backup.json', { type: 'application/json' });
    await expect(result.current.importBackup(file)).rejects.toThrow('not valid JSON');
  });
});
