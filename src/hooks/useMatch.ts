import { useCallback, useEffect, useReducer } from 'react';
import type { Match, SavedTeam, TeamKey } from '../logic/types';
import type { PlayerStatField } from '../logic/stats';
import type { AppState, MergeSummary } from '../logic/persistence';
import { newMatch, adjustScore, endHalf, addExtraTime, endGame } from '../logic/match';
import { toggleClock, recordStoppage } from '../logic/clock';
import {
  recordPlayerStat,
  recordCard,
  recordCorner,
  recordOffside,
  subIn,
  subOut,
  setPossession,
} from '../logic/stats';
import { startShootout, recordAttempt } from '../logic/shootout';
import { undo } from '../logic/undo';
import {
  serialize,
  deserialize,
  upsertTeam,
  removeTeam,
  removeFromHistory,
  buildBackup,
  validateBackup,
  mergeBackup,
} from '../logic/persistence';

export type ImportSummary = MergeSummary;

const KEYS = {
  teams: 'soccerscore.teams',
  match: 'soccerscore.match',
  history: 'soccerscore.history',
  theme: 'soccerscore.theme',
};

interface HookState {
  match: Match | null;
  savedTeams: SavedTeam[];
  history: Match[];
  theme: 'dark' | 'light';
}

type Action =
  | { type: 'APPLY_MATCH'; fn: (match: Match) => Match }
  | { type: 'START_MATCH'; args: Parameters<typeof newMatch>[0] }
  | { type: 'SET_THEME'; theme: 'dark' | 'light' }
  | { type: 'UPSERT_TEAM'; team: SavedTeam }
  | { type: 'REMOVE_TEAM'; id: string }
  | { type: 'REMOVE_FROM_HISTORY'; id: string }
  | { type: 'IMPORT_MERGED'; merged: AppState };

function reducer(state: HookState, action: Action): HookState {
  switch (action.type) {
    case 'APPLY_MATCH':
      return state.match ? { ...state, match: action.fn(state.match) } : state;
    case 'START_MATCH':
      return { ...state, match: newMatch(action.args) };
    case 'SET_THEME':
      return { ...state, theme: action.theme };
    case 'UPSERT_TEAM':
      return { ...state, savedTeams: upsertTeam(state.savedTeams, action.team) };
    case 'REMOVE_TEAM':
      return { ...state, savedTeams: removeTeam(state.savedTeams, action.id) };
    case 'REMOVE_FROM_HISTORY':
      return { ...state, history: removeFromHistory(state.history, action.id) };
    case 'IMPORT_MERGED':
      return {
        ...state,
        match: action.merged.match,
        savedTeams: action.merged.teams,
        history: action.merged.history,
      };
    default:
      return state;
  }
}

function loadInitialState(): HookState {
  const savedTeams = deserialize<SavedTeam[]>(localStorage.getItem(KEYS.teams)) ?? [];
  const match = deserialize<Match>(localStorage.getItem(KEYS.match));
  const history = deserialize<Match[]>(localStorage.getItem(KEYS.history)) ?? [];
  const rawTheme = localStorage.getItem(KEYS.theme);
  const theme: 'dark' | 'light' = rawTheme === 'light' ? 'light' : 'dark';
  return { match, savedTeams, history, theme };
}

export interface MatchHookApi extends HookState {
  startMatch: (args: Parameters<typeof newMatch>[0]) => void;
  endHalf: () => void;
  addExtraTime: () => void;
  endGame: () => void;
  startShootout: () => void;
  undo: () => void;
  adjustScore: (team: TeamKey, delta: number) => void;
  recordPlayerStat: (team: TeamKey, playerId: string, stat: PlayerStatField) => void;
  recordCard: (team: TeamKey, playerId: string | null, color: 'yellow' | 'red') => void;
  recordCorner: (team: TeamKey) => void;
  recordOffside: (team: TeamKey) => void;
  subIn: (team: TeamKey, playerId: string) => void;
  subOut: (team: TeamKey, playerId: string) => void;
  setPossession: (team: TeamKey) => void;
  recordStoppage: (addedSec: number) => void;
  toggleClock: () => void;
  recordAttempt: (team: TeamKey, scored: boolean) => void;
  upsertTeam: (team: SavedTeam) => void;
  removeTeam: (id: string) => void;
  removeFromHistory: (id: string) => void;
  exportBackup: () => void;
  importBackup: (file: File) => Promise<ImportSummary>;
  setTheme: (theme: 'dark' | 'light') => void;
}

export function useMatch(): MatchHookApi {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);

  useEffect(() => {
    if (state.match) localStorage.setItem(KEYS.match, serialize(state.match));
    else localStorage.removeItem(KEYS.match);
  }, [state.match]);

  useEffect(() => {
    localStorage.setItem(KEYS.teams, serialize(state.savedTeams));
  }, [state.savedTeams]);

  useEffect(() => {
    localStorage.setItem(KEYS.history, serialize(state.history));
  }, [state.history]);

  useEffect(() => {
    localStorage.setItem(KEYS.theme, state.theme);
  }, [state.theme]);

  const startMatch = useCallback((args: Parameters<typeof newMatch>[0]) => {
    dispatch({ type: 'START_MATCH', args });
  }, []);

  const endHalfApi = useCallback(() => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => endHalf(m, Date.now()) });
  }, []);

  const addExtraTimeApi = useCallback(() => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => addExtraTime(m, Date.now()) });
  }, []);

  const endGameApi = useCallback(() => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => endGame(m, Date.now()) });
  }, []);

  const startShootoutApi = useCallback(() => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => startShootout(m, Date.now()) });
  }, []);

  const undoApi = useCallback(() => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => undo(m) });
  }, []);

  const adjustScoreApi = useCallback((team: TeamKey, delta: number) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => adjustScore(m, team, delta, Date.now()) });
  }, []);

  const recordPlayerStatApi = useCallback(
    (team: TeamKey, playerId: string, stat: PlayerStatField) => {
      dispatch({
        type: 'APPLY_MATCH',
        fn: (m) => recordPlayerStat(m, team, playerId, stat, Date.now()),
      });
    },
    [],
  );

  const recordCardApi = useCallback(
    (team: TeamKey, playerId: string | null, color: 'yellow' | 'red') => {
      dispatch({
        type: 'APPLY_MATCH',
        fn: (m) => recordCard(m, team, playerId, color, Date.now()),
      });
    },
    [],
  );

  const recordCornerApi = useCallback((team: TeamKey) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => recordCorner(m, team, Date.now()) });
  }, []);

  const recordOffsideApi = useCallback((team: TeamKey) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => recordOffside(m, team, Date.now()) });
  }, []);

  const subInApi = useCallback((team: TeamKey, playerId: string) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => subIn(m, team, playerId, Date.now()) });
  }, []);

  const subOutApi = useCallback((team: TeamKey, playerId: string) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => subOut(m, team, playerId, Date.now()) });
  }, []);

  const setPossessionApi = useCallback((team: TeamKey) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => setPossession(m, team, Date.now()) });
  }, []);

  const recordStoppageApi = useCallback((addedSec: number) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => recordStoppage(m, addedSec, Date.now()) });
  }, []);

  const toggleClockApi = useCallback(() => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => toggleClock(m, Date.now()) });
  }, []);

  const recordAttemptApi = useCallback((team: TeamKey, scored: boolean) => {
    dispatch({ type: 'APPLY_MATCH', fn: (m) => recordAttempt(m, team, scored, Date.now()) });
  }, []);

  const upsertTeamApi = useCallback((team: SavedTeam) => {
    dispatch({ type: 'UPSERT_TEAM', team });
  }, []);

  const removeTeamApi = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TEAM', id });
  }, []);

  const removeFromHistoryApi = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_FROM_HISTORY', id });
  }, []);

  const setThemeApi = useCallback((theme: 'dark' | 'light') => {
    dispatch({ type: 'SET_THEME', theme });
  }, []);

  const exportBackup = useCallback(() => {
    const backup = buildBackup(
      { teams: state.savedTeams, history: state.history, match: state.match },
      Date.now(),
    );
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soccerscore-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.savedTeams, state.history, state.match]);

  const importBackup = useCallback(
    async (file: File): Promise<ImportSummary> => {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Invalid backup file: not valid JSON.');
      }
      const result = validateBackup(parsed);
      if (!result.ok) throw new Error(result.reason);
      const { state: merged, summary } = mergeBackup(
        { teams: state.savedTeams, history: state.history, match: state.match },
        result.backup,
      );
      dispatch({ type: 'IMPORT_MERGED', merged });
      return summary;
    },
    [state.savedTeams, state.history, state.match],
  );

  return {
    ...state,
    startMatch,
    endHalf: endHalfApi,
    addExtraTime: addExtraTimeApi,
    endGame: endGameApi,
    startShootout: startShootoutApi,
    undo: undoApi,
    adjustScore: adjustScoreApi,
    recordPlayerStat: recordPlayerStatApi,
    recordCard: recordCardApi,
    recordCorner: recordCornerApi,
    recordOffside: recordOffsideApi,
    subIn: subInApi,
    subOut: subOutApi,
    setPossession: setPossessionApi,
    recordStoppage: recordStoppageApi,
    toggleClock: toggleClockApi,
    recordAttempt: recordAttemptApi,
    upsertTeam: upsertTeamApi,
    removeTeam: removeTeamApi,
    removeFromHistory: removeFromHistoryApi,
    exportBackup,
    importBackup,
    setTheme: setThemeApi,
  };
}
