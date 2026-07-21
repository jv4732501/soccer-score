import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { LogEntry } from '../../logic/types';
import { periodLabel } from '../../logic/periodLabel';

export interface GameLogProps {
  log: LogEntry[];
}

export function GameLog({ log }: GameLogProps) {
  const entries = log.slice().reverse();

  return (
    <Box
      sx={{
        maxHeight: 220,
        overflowY: 'auto',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 0.5,
        width: '100%',
      }}
    >
      {entries.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          No activity yet
        </Typography>
      ) : (
        entries.map((e) => (
          <Typography
            key={e.id}
            variant="caption"
            component="div"
            color="text.secondary"
            sx={{ fontSize: '0.7rem' }}
          >
            {e.clockText} {periodLabel(e.period)} — {e.detail}
          </Typography>
        ))
      )}
    </Box>
  );
}
