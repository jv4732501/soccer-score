import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ClockState, PossessionState, TeamKey } from '../../logic/types';
import { clockElapsed, formatClock } from '../../logic/clock';

export interface ScoreBarProps {
  teamAName: string;
  teamBName: string;
  score: Record<TeamKey, number>;
  possession: PossessionState;
  clock: ClockState;
  stoppageRunning: boolean;
  onSetPossession: (team: TeamKey) => void;
  onAdjustScore: (team: TeamKey, delta: number) => void;
  periodLabel?: React.ReactNode;
  center?: React.ReactNode;
}

export function ScoreBar({
  teamAName,
  teamBName,
  score,
  possession,
  clock,
  stoppageRunning,
  onSetPossession,
  onAdjustScore,
  periodLabel,
  center,
}: ScoreBarProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!clock.running) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [clock.running]);

  const liveElapsed = clockElapsed(clock, Date.now());

  function possessionTotal(team: TeamKey): number {
    const base = possession.accumSec[team];
    if (!stoppageRunning && possession.current === team && possession.since != null) {
      return base + (liveElapsed - possession.since);
    }
    return base;
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
        columnGap: 1,
        rowGap: 0.5,
        alignItems: 'center',
        justifyItems: 'center',
        px: 1,
      }}
    >
      <Typography
        variant="subtitle2"
        noWrap
        sx={{ gridColumn: 1, gridRow: 1, fontWeight: 600, maxWidth: '100%' }}
      >
        {teamAName}
      </Typography>
      <Typography variant="overline" sx={{ gridColumn: 2, gridRow: 1 }}>
        {periodLabel}
      </Typography>
      <Typography
        variant="subtitle2"
        noWrap
        sx={{ gridColumn: 3, gridRow: 1, fontWeight: 600, maxWidth: '100%' }}
      >
        {teamBName}
      </Typography>

      <Stack
        direction="row"
        spacing={0.25}
        sx={{ gridColumn: 1, gridRow: 2, alignItems: 'center', minWidth: 0 }}
      >
        <IconButton
          aria-label={`Decrease ${teamAName} score`}
          size="small"
          onClick={() => onAdjustScore('teamA', -1)}
        >
          −
        </IconButton>
        <Typography variant="h4">{score.teamA}</Typography>
        <IconButton
          aria-label={`Increase ${teamAName} score`}
          size="small"
          onClick={() => onAdjustScore('teamA', 1)}
        >
          +
        </IconButton>
      </Stack>

      {center}

      <Stack
        direction="row"
        spacing={0.25}
        sx={{ gridColumn: 3, gridRow: 2, alignItems: 'center', minWidth: 0 }}
      >
        <IconButton
          aria-label={`Decrease ${teamBName} score`}
          size="small"
          onClick={() => onAdjustScore('teamB', -1)}
        >
          −
        </IconButton>
        <Typography variant="h4">{score.teamB}</Typography>
        <IconButton
          aria-label={`Increase ${teamBName} score`}
          size="small"
          onClick={() => onAdjustScore('teamB', 1)}
        >
          +
        </IconButton>
      </Stack>

      <Button
        size="small"
        sx={{ gridColumn: 1, gridRow: 3, alignSelf: 'start', minWidth: 0, px: 1 }}
        variant={!stoppageRunning && possession.current === 'teamA' ? 'contained' : 'outlined'}
        onClick={() => onSetPossession('teamA')}
      >
        Poss {formatClock(possessionTotal('teamA'))}
      </Button>

      <Button
        size="small"
        sx={{ gridColumn: 3, gridRow: 3, alignSelf: 'start', minWidth: 0, px: 1 }}
        variant={!stoppageRunning && possession.current === 'teamB' ? 'contained' : 'outlined'}
        onClick={() => onSetPossession('teamB')}
      >
        Poss {formatClock(possessionTotal('teamB'))}
      </Button>
    </Box>
  );
}
