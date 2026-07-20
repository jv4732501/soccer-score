import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Team, TeamKey } from '../../logic/types';
import type { PlayerStatField } from '../../logic/stats';
import { PlayerRow } from './PlayerRow';

export interface TeamPanelProps {
  team: Team;
  teamKey: TeamKey;
  onAdjustScore: (team: TeamKey, delta: number) => void;
  onRecordCard: (team: TeamKey, playerId: string | null, color: 'yellow' | 'red') => void;
  onRecordCorner: (team: TeamKey) => void;
  onRecordOffside: (team: TeamKey) => void;
  onRecordPlayerStat: (team: TeamKey, playerId: string, stat: PlayerStatField) => void;
  onSubIn: (team: TeamKey, playerId: string) => void;
  onSubOut: (team: TeamKey, playerId: string) => void;
}

export function TeamPanel({
  team,
  teamKey,
  onAdjustScore,
  onRecordCard,
  onRecordCorner,
  onRecordOffside,
  onRecordPlayerStat,
  onSubIn,
  onSubOut,
}: TeamPanelProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {team.name}
      </Typography>
      {team.collapsed && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          <Button size="small" onClick={() => onAdjustScore(teamKey, 1)}>
            +1 Goal
          </Button>
          <Button size="small" onClick={() => onAdjustScore(teamKey, -1)}>
            -1 Goal
          </Button>
          <Button size="small" onClick={() => onRecordCard(teamKey, null, 'yellow')}>
            Yellow Card
          </Button>
          <Button size="small" onClick={() => onRecordCard(teamKey, null, 'red')}>
            Red Card
          </Button>
        </Stack>
      )}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button size="small" onClick={() => onRecordCorner(teamKey)}>
          Corner ({team.corners})
        </Button>
        <Button size="small" onClick={() => onRecordOffside(teamKey)}>
          Offside ({team.offsides})
        </Button>
      </Stack>
      {!team.collapsed && (
        <List>
          {team.players.map((p) => (
            <PlayerRow
              key={p.id}
              player={p}
              onRecordStat={(stat) => onRecordPlayerStat(teamKey, p.id, stat)}
              onRecordCard={(color) => onRecordCard(teamKey, p.id, color)}
              onSubIn={() => onSubIn(teamKey, p.id)}
              onSubOut={() => onSubOut(teamKey, p.id)}
            />
          ))}
        </List>
      )}
    </Box>
  );
}
