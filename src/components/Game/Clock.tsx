import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { ClockState } from '../../logic/types';
import { clockElapsed, formatClock } from '../../logic/clock';

const HOLD_DELAY_MS = 500;
const HOLD_REPEAT_MS = 300;
const TAP_DELTA_SEC = 1;
const HOLD_DELTA_SEC = 10;

// Quick tap = ±1s. Press and hold (500ms) = ±10s, then keeps repeating ±10s
// every 300ms for as long as the button is held. Mirrors basketballscore's
// clock -/+ button behavior.
function useClockPressHandlers(onAdjustClock: (deltaSec: number) => void, dir: 1 | -1) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longFiredRef = useRef(false);

  const stopRepeat = useCallback(() => {
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
    window.removeEventListener('pointerup', stopRepeat);
    window.removeEventListener('pointercancel', stopRepeat);
  }, []);

  const handlePointerDown = useCallback(() => {
    longFiredRef.current = false;
    timerRef.current = setTimeout(() => {
      longFiredRef.current = true;
      onAdjustClock(dir * HOLD_DELTA_SEC);
      repeatRef.current = setInterval(() => onAdjustClock(dir * HOLD_DELTA_SEC), HOLD_REPEAT_MS);
      window.addEventListener('pointerup', stopRepeat);
      window.addEventListener('pointercancel', stopRepeat);
    }, HOLD_DELAY_MS);
  }, [dir, onAdjustClock, stopRepeat]);

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stopRepeat();
  }, [stopRepeat]);

  const handleClick = useCallback(() => {
    if (longFiredRef.current) {
      longFiredRef.current = false;
      return;
    }
    onAdjustClock(dir * TAP_DELTA_SEC);
  }, [dir, onAdjustClock]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      stopRepeat();
    };
  }, [stopRepeat]);

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerUp,
    onPointerCancel: handlePointerUp,
    onClick: handleClick,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}

export interface ClockProps {
  clock: ClockState;
  stoppageSec: number;
  onToggleClock: () => void;
  onAdjustClock: (deltaSec: number) => void;
}

export function Clock({ clock, stoppageSec, onToggleClock, onAdjustClock }: ClockProps) {
  const [, setTick] = useState(0);

  const minusHandlers = useClockPressHandlers(onAdjustClock, -1);
  const plusHandlers = useClockPressHandlers(onAdjustClock, 1);

  useEffect(() => {
    if (!clock.running) return;
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [clock.running]);

  const elapsed = clockElapsed(clock, Date.now());

  return (
    <>
      <Box
        sx={{
          gridColumn: 2,
          gridRow: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.25,
        }}
      >
        <IconButton aria-label="Decrease clock" size="small" {...minusHandlers}>
          −
        </IconButton>
        <Typography variant="h5" component="div">
          {formatClock(elapsed)}
          {stoppageSec > 0 && (
            <Typography variant="caption" component="span" sx={{ ml: 0.5 }}>
              +{formatClock(stoppageSec)}
            </Typography>
          )}
        </Typography>
        <IconButton aria-label="Increase clock" size="small" {...plusHandlers}>
          +
        </IconButton>
      </Box>
      <Box sx={{ gridColumn: 2, gridRow: 3, alignSelf: 'start', textAlign: 'center' }}>
        <Button size="small" variant="contained" onClick={onToggleClock}>
          {clock.running ? 'Stop' : 'Start'}
        </Button>
      </Box>
    </>
  );
}
