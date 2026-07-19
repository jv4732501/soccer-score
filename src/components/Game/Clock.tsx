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

export interface ClockProps {
  clock: ClockState;
  stoppageSec: number;
  onToggleClock: () => void;
  onRecordStoppage: (addedSec: number) => void;
}

export function Clock({ clock, stoppageSec, onToggleClock, onRecordStoppage }: ClockProps) {
  const [, setTick] = useState(0);
  const [stoppageOpen, setStoppageOpen] = useState(false);
  const [stoppageText, setStoppageText] = useState('');

  useEffect(() => {
    if (!clock.running) return;
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [clock.running]);

  const elapsed = clockElapsed(clock, Date.now());
  const parsedStoppage = parseClock(stoppageText);

  function openStoppageDialog() {
    setStoppageText(formatClock(stoppageSec));
    setStoppageOpen(true);
  }

  function saveStoppage() {
    if (parsedStoppage === null) return;
    onRecordStoppage(parsedStoppage);
    setStoppageOpen(false);
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h3" component="div">
        {formatClock(elapsed)}
        {stoppageSec > 0 && (
          <Typography variant="h6" component="span" sx={{ ml: 1 }}>
            +{formatClock(stoppageSec)}
          </Typography>
        )}
      </Typography>
      <Box sx={{ mt: 1 }}>
        <Button variant="contained" onClick={onToggleClock}>
          {clock.running ? 'Stop' : 'Start'}
        </Button>
        <Button onClick={openStoppageDialog} sx={{ ml: 1 }}>
          Stoppage Time
        </Button>
      </Box>
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
    </Box>
  );
}
