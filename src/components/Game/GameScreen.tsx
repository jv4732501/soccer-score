import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import type { Match, TeamKey } from '../../logic/types';
import type { MatchHookApi } from '../../hooks/useMatch';
import type { TeamStatField } from '../../logic/stats';
import { SHARED_STAT_FIELDS } from '../../logic/stats';
import { periodLabel } from '../../logic/periodLabel';
import { periodTargetSec } from '../../logic/match';
import { Clock } from './Clock';
import { GameLog } from './GameLog';
import { GameToolbar } from './GameToolbar';
import { ScoreBar } from './ScoreBar';
import { StoppageTimeControl } from './StoppageTimeControl';
import { TeamPanel } from './TeamPanel';
import { TeamStatGrid } from './TeamStatGrid';

export interface GameScreenProps {
  match: Match;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onUpdateConfig: MatchHookApi['updateConfig'];
  onOpenReview: () => void;
  onAdjustScore: MatchHookApi['adjustScore'];
  onRecordPlayerStat: MatchHookApi['recordPlayerStat'];
  onRecordCard: MatchHookApi['recordCard'];
  onRecordCorner: MatchHookApi['recordCorner'];
  onRecordOffside: MatchHookApi['recordOffside'];
  onRecordTeamStat: MatchHookApi['recordTeamStat'];
  onRecordAttributedTeamStat: MatchHookApi['recordAttributedTeamStat'];
  onAddPlayer: MatchHookApi['addPlayer'];
  onSubIn: MatchHookApi['subIn'];
  onSubOut: MatchHookApi['subOut'];
  onSetPossession: MatchHookApi['setPossession'];
  onRecordStoppage: MatchHookApi['recordStoppage'];
  onToggleClock: MatchHookApi['toggleClock'];
  onAdjustClock: MatchHookApi['adjustClock'];
  onToggleStoppageWatch: MatchHookApi['toggleStoppageWatch'];
  onStopStoppageWatch: MatchHookApi['stopStoppageWatch'];
  onEndHalf: MatchHookApi['endHalf'];
  onAddExtraTime: MatchHookApi['addExtraTime'];
  onEndGame: MatchHookApi['endGame'];
  onStartShootout: MatchHookApi['startShootout'];
  onUndo: MatchHookApi['undo'];
}

type Confirmation = { title: string; body: string; onConfirm: () => void } | null;

export function GameScreen({
  match,
  theme,
  onToggleTheme,
  onUpdateConfig,
  onOpenReview,
  onAdjustScore,
  onRecordPlayerStat,
  onRecordCard,
  onRecordCorner,
  onRecordOffside,
  onRecordTeamStat,
  onRecordAttributedTeamStat,
  onAddPlayer,
  onSubIn,
  onSubOut,
  onSetPossession,
  onRecordStoppage,
  onToggleClock,
  onAdjustClock,
  onToggleStoppageWatch,
  onStopStoppageWatch,
  onEndHalf,
  onAddExtraTime,
  onEndGame,
  onStartShootout,
  onUndo,
}: GameScreenProps) {
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const canUndo = match.log.length > 0 && match.log[match.log.length - 1].rev !== null;
  const canAddExtraTime =
    match.config.hasExtraTime && (match.period === 2 || match.period === 'ET1');
  const canStartShootout = match.config.hasShootout && match.period !== 1;

  const selectedTeam: TeamKey | null = selectedPlayerId
    ? match.teamA.players.some((p) => p.id === selectedPlayerId)
      ? 'teamA'
      : match.teamB.players.some((p) => p.id === selectedPlayerId)
        ? 'teamB'
        : null
    : null;

  function confirmAndRun(title: string, body: string, action: () => void) {
    setConfirmation({ title, body, onConfirm: action });
  }

  function handleSelectPlayer(playerId: string) {
    setSelectedPlayerId((current) => (current === playerId ? null : playerId));
  }

  function handleTeamStat(team: TeamKey, stat: TeamStatField) {
    if (
      selectedTeam === team &&
      selectedPlayerId &&
      (SHARED_STAT_FIELDS as readonly string[]).includes(stat)
    ) {
      onRecordAttributedTeamStat(team, selectedPlayerId, stat as (typeof SHARED_STAT_FIELDS)[number]);
    } else {
      onRecordTeamStat(team, stat);
    }
  }

  function handleTeamCard(team: TeamKey, _playerId: string | null, color: 'yellow' | 'red') {
    onRecordCard(team, selectedTeam === team ? selectedPlayerId : null, color);
  }

  return (
    <Box>
      <GameToolbar
        theme={theme}
        onToggleTheme={onToggleTheme}
        config={match.config}
        onUpdateConfig={onUpdateConfig}
        onOpenReview={onOpenReview}
      />
      <ScoreBar
        teamAName={match.teamA.name}
        teamBName={match.teamB.name}
        score={match.score}
        possession={match.possession}
        clock={match.clock}
        stoppageRunning={match.stoppageWatch.running}
        onSetPossession={onSetPossession}
        onAdjustScore={onAdjustScore}
        periodLabel={periodLabel(match.period)}
        center={
          <Clock
            clock={match.clock}
            stoppageSec={match.stoppage[match.period] ?? 0}
            onToggleClock={onToggleClock}
            onAdjustClock={onAdjustClock}
          />
        }
      />
      <Divider sx={{ my: 1.5 }} />
      <Stack
        direction="row"
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Box sx={{ flexShrink: 0 }}>
          <TeamStatGrid
            team={match.teamA}
            teamKey="teamA"
            onRecordCorner={onRecordCorner}
            onRecordOffside={onRecordOffside}
            onRecordCard={handleTeamCard}
            onRecordTeamStat={handleTeamStat}
          />
        </Box>
        <Stack spacing={1} sx={{ alignItems: 'center', pt: 1 }}>
          <Button size="small" onClick={onUndo} disabled={!canUndo}>
            Undo
          </Button>
          {match.period === 1 ? (
            <Button
              size="small"
              variant="contained"
              onClick={() => confirmAndRun('End Half 1?', 'This cannot be undone.', onEndHalf)}
            >
              End Half
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              color="error"
              onClick={() => confirmAndRun('End the game?', 'This cannot be undone.', onEndGame)}
            >
              End Game
            </Button>
          )}
          <StoppageTimeControl
            hasStoppageTime={match.config.hasStoppageTime}
            matchClock={match.clock}
            periodTargetSec={periodTargetSec(match)}
            stoppageWatch={match.stoppageWatch}
            onRecordStoppage={onRecordStoppage}
            onToggleStoppageWatch={onToggleStoppageWatch}
            onStopStoppageWatch={onStopStoppageWatch}
          />
        </Stack>
        <Box sx={{ flexShrink: 0 }}>
          <TeamStatGrid
            team={match.teamB}
            teamKey="teamB"
            onRecordCorner={onRecordCorner}
            onRecordOffside={onRecordOffside}
            onRecordCard={handleTeamCard}
            onRecordTeamStat={handleTeamStat}
          />
        </Box>
      </Stack>
      <Divider sx={{ my: 1.5 }} />
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <TeamPanel
            team={match.teamA}
            teamKey="teamA"
            selectedPlayerId={selectedTeam === 'teamA' ? selectedPlayerId : null}
            onSelectPlayer={handleSelectPlayer}
            onAdjustScore={onAdjustScore}
            onRecordCard={onRecordCard}
            onRecordPlayerStat={onRecordPlayerStat}
            onSubIn={onSubIn}
            onSubOut={onSubOut}
            onAddPlayer={onAddPlayer}
          />
        </Box>
        <Box sx={{ flex: 1, maxWidth: 220 }}>
          <GameLog log={match.log} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <TeamPanel
            team={match.teamB}
            teamKey="teamB"
            selectedPlayerId={selectedTeam === 'teamB' ? selectedPlayerId : null}
            onSelectPlayer={handleSelectPlayer}
            onAdjustScore={onAdjustScore}
            onRecordCard={onRecordCard}
            onRecordPlayerStat={onRecordPlayerStat}
            onSubIn={onSubIn}
            onSubOut={onSubOut}
            onAddPlayer={onAddPlayer}
          />
        </Box>
      </Stack>
      {(canAddExtraTime || canStartShootout) && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            {canAddExtraTime && (
              <Button
                variant="contained"
                onClick={() =>
                  confirmAndRun('Start extra time?', 'This cannot be undone.', onAddExtraTime)
                }
              >
                Start Extra Time
              </Button>
            )}
            {canStartShootout && (
              <Button
                variant="contained"
                onClick={() =>
                  confirmAndRun('Start penalty shootout?', 'This cannot be undone.', onStartShootout)
                }
              >
                Start Shootout
              </Button>
            )}
          </Stack>
        </>
      )}
      <Dialog open={confirmation !== null} onClose={() => setConfirmation(null)}>
        <DialogTitle>{confirmation?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmation?.body}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmation(null)}>Cancel</Button>
          <Button
            onClick={() => {
              confirmation?.onConfirm();
              setConfirmation(null);
            }}
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
