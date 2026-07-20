import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { TeamKey } from '../../logic/types';

export interface ScoreBarProps {
  teamAName: string;
  teamBName: string;
  score: Record<TeamKey, number>;
  possession: TeamKey | null;
  onSetPossession: (team: TeamKey) => void;
}

export function ScoreBar({
  teamAName,
  teamBName,
  score,
  possession,
  onSetPossession,
}: ScoreBarProps) {
  return (
    <Stack direction="row" spacing={4} sx={{ justifyContent: 'center', alignItems: 'center' }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6">{teamAName}</Typography>
        <Typography variant="h3">{score.teamA}</Typography>
        <Button
          size="small"
          variant={possession === 'teamA' ? 'contained' : 'outlined'}
          onClick={() => onSetPossession('teamA')}
        >
          Possession
        </Button>
      </Box>
      <Typography variant="h4">–</Typography>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6">{teamBName}</Typography>
        <Typography variant="h3">{score.teamB}</Typography>
        <Button
          size="small"
          variant={possession === 'teamB' ? 'contained' : 'outlined'}
          onClick={() => onSetPossession('teamB')}
        >
          Possession
        </Button>
      </Box>
    </Stack>
  );
}
