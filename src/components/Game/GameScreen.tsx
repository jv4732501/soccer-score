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
import Typography from '@mui/material/Typography';
import type { Match } from '../../logic/types';
import type { MatchHookApi } from '../../hooks/useMatch';
import { periodLabel } from '../../logic/periodLabel';
import { Clock } from './Clock';
import { ScoreBar } from './ScoreBar';
import { TeamPanel } from './TeamPanel';

export interface GameScreenProps {
  match: Match;
  onAdjustScore: MatchHookApi['adjustScore'];
  onRecordPlayerStat: MatchHookApi['recordPlayerStat'];
  onRecordCard: MatchHookApi['recordCard'];
  onRecordCorner: MatchHookApi['recordCorner'];
  onRecordOffside: MatchHookApi['recordOffside'];
  onSubIn: MatchHookApi['subIn'];
  onSubOut: MatchHookApi['subOut'];
  onSetPossession: MatchHookApi['setPossession'];
  onRecordStoppage: MatchHookApi['recordStoppage'];
  onToggleClock: MatchHookApi['toggleClock'];
  onEndHalf: MatchHookApi['endHalf'];
  onAddExtraTime: MatchHookApi['addExtraTime'];
  onEndGame: MatchHookApi['endGame'];
  onStartShootout: MatchHookApi['startShootout'];
  onUndo: MatchHookApi['undo'];
}

type Confirmation = { title: string; body: string; onConfirm: () => void } | null;

export function GameScreen({
  match,
  onAdjustScore,
  onRecordPlayerStat,
  onRecordCard,
  onRecordCorner,
  onRecordOffside,
  onSubIn,
  onSubOut,
  onSetPossession,
  onRecordStoppage,
  onToggleClock,
  onEndHalf,
  onAddExtraTime,
  onEndGame,
  onStartShootout,
  onUndo,
}: GameScreenProps) {
  const [confirmation, setConfirmation] = useState<Confirmation>(null);

  const canUndo = match.log.length > 0 && match.log[match.log.length - 1].rev !== null;
  const canAddExtraTime =
    match.config.hasExtraTime && (match.period === 2 || match.period === 'ET1');
  const canStartShootout = match.config.hasShootout && match.period !== 1;

  function confirmAndRun(title: string, body: string, action: () => void) {
    setConfirmation({ title, body, onConfirm: action });
  }

  return (
    <Box>
      <Typography variant="overline">{periodLabel(match.period)}</Typography>
      <Clock
        clock={match.clock}
        stoppageSec={match.stoppage[match.period] ?? 0}
        onToggleClock={onToggleClock}
        onRecordStoppage={onRecordStoppage}
      />
      <ScoreBar
        teamAName={match.teamA.name}
        teamBName={match.teamB.name}
        score={match.score}
        possession={match.possession.current}
        onSetPossession={onSetPossession}
      />
      <Divider sx={{ my: 3 }} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
        <Box sx={{ flex: 1 }}>
          <TeamPanel
            team={match.teamA}
            teamKey="teamA"
            onAdjustScore={onAdjustScore}
            onRecordCard={onRecordCard}
            onRecordCorner={onRecordCorner}
            onRecordOffside={onRecordOffside}
            onRecordPlayerStat={onRecordPlayerStat}
            onSubIn={onSubIn}
            onSubOut={onSubOut}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <TeamPanel
            team={match.teamB}
            teamKey="teamB"
            onAdjustScore={onAdjustScore}
            onRecordCard={onRecordCard}
            onRecordCorner={onRecordCorner}
            onRecordOffside={onRecordOffside}
            onRecordPlayerStat={onRecordPlayerStat}
            onSubIn={onSubIn}
            onSubOut={onSubOut}
          />
        </Box>
      </Stack>
      <Divider sx={{ my: 3 }} />
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        <Button onClick={onUndo} disabled={!canUndo}>
          Undo
        </Button>
        {match.period === 1 && (
          <Button
            variant="contained"
            onClick={() => confirmAndRun('End Half 1?', 'This cannot be undone.', onEndHalf)}
          >
            End Half
          </Button>
        )}
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
        <Button
          variant="contained"
          color="error"
          onClick={() => confirmAndRun('End the game?', 'This cannot be undone.', onEndGame)}
        >
          End Game
        </Button>
      </Stack>
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
