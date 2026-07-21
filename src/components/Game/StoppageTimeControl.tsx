import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ClockState } from '../../logic/types';
import { clockElapsed, formatClock, parseClock } from '../../logic/clock';

export interface StoppageTimeControlProps {
  hasStoppageTime: boolean;
  matchClock: ClockState;
  periodTargetSec: number;
  stoppageWatch: ClockState;
  onRecordStoppage: (addedSec: number) => void;
  onToggleStoppageWatch: () => void;
  onStopStoppageWatch: () => void;
}

export function StoppageTimeControl({
  hasStoppageTime,
  matchClock,
  periodTargetSec,
  stoppageWatch,
  onRecordStoppage,
  onToggleStoppageWatch,
  onStopStoppageWatch,
}: StoppageTimeControlProps) {
  const [, setTick] = useState(0);
  const [stoppageOpen, setStoppageOpen] = useState(false);
  const [stoppageText, setStoppageText] = useState('');

  useEffect(() => {
    if (!matchClock.running && !stoppageWatch.running) return;
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [matchClock.running, stoppageWatch.running]);

  const elapsed = clockElapsed(matchClock, Date.now());
  const watchElapsed = clockElapsed(stoppageWatch, Date.now());
  const parsedStoppage = parseClock(stoppageText);
  const showAddStoppageButton = hasStoppageTime && elapsed >= periodTargetSec;

  function openStoppageDialog(prefillSec: number) {
    setStoppageText(formatClock(prefillSec));
    setStoppageOpen(true);
  }

  function handleAddStoppageClick() {
    onStopStoppageWatch();
    openStoppageDialog(watchElapsed);
  }

  function saveStoppage() {
    if (parsedStoppage === null) return;
    onRecordStoppage(parsedStoppage);
    setStoppageOpen(false);
  }

  if (!hasStoppageTime) return null;

  return (
    <>
      <Box sx={{ textAlign: 'center' }}>
        <Button
          size="small"
          aria-label={stoppageWatch.running ? 'Stop stoppage watch' : 'Start stoppage time watch'}
          onClick={onToggleStoppageWatch}
        >
          {stoppageWatch.running ? 'Stop' : 'Stp Time'}
        </Button>
        <Typography variant="caption" component="div">
          {formatClock(watchElapsed)}
        </Typography>
      </Box>
      {showAddStoppageButton && (
        <Box sx={{ mt: 0.5, textAlign: 'center' }}>
          <Button size="small" onClick={handleAddStoppageClick}>
            Add Stoppage Time
          </Button>
        </Box>
      )}
      <Dialog open={stoppageOpen} onClose={() => setStoppageOpen(false)}>
        <DialogTitle>Stoppage Time</DialogTitle>
        <DialogContent>
          <TextField
            label="Added time (M:SS)"
            value={stoppageText}
            onChange={(e) => setStoppageText(e.target.value)}
            error={parsedStoppage === null}
            helperText={parsedStoppage === null ? 'Enter time as M:SS' : ' '}
            autoFocus
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStoppageOpen(false)}>Cancel</Button>
          <Button onClick={saveStoppage} disabled={parsedStoppage === null}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
