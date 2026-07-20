import { useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import type { Player } from '../../logic/types';
import type { PlayerStatField } from '../../logic/stats';
import { StatMenu } from './StatMenu';
import { SubstitutionMenu } from './SubstitutionMenu';

export interface PlayerRowProps {
  player: Player;
  onRecordStat: (stat: PlayerStatField) => void;
  onRecordCard: (color: 'yellow' | 'red') => void;
  onSubIn: () => void;
  onSubOut: () => void;
}

export function PlayerRow({
  player,
  onRecordStat,
  onRecordCard,
  onSubIn,
  onSubOut,
}: PlayerRowProps) {
  const [statAnchor, setStatAnchor] = useState<HTMLElement | null>(null);
  const [subAnchor, setSubAnchor] = useState<HTMLElement | null>(null);

  return (
    <ListItem>
      <ListItemText
        primary={`#${player.num} ${player.name}`}
        secondary={`Goals ${player.goals} · Assists ${player.assists}`}
      />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Chip
          size="small"
          label={player.sentOff ? 'Sent Off' : player.onField ? 'On' : 'Bench'}
          color={player.sentOff ? 'error' : player.onField ? 'success' : 'default'}
        />
        <Button size="small" onClick={(e) => setStatAnchor(e.currentTarget)}>
          Stats
        </Button>
        <Button size="small" onClick={(e) => setSubAnchor(e.currentTarget)}>
          Sub
        </Button>
      </Stack>
      <StatMenu
        anchorEl={statAnchor}
        open={!!statAnchor}
        onClose={() => setStatAnchor(null)}
        onSelectStat={onRecordStat}
        onSelectCard={onRecordCard}
      />
      <SubstitutionMenu
        anchorEl={subAnchor}
        open={!!subAnchor}
        onClose={() => setSubAnchor(null)}
        onField={player.onField}
        onSubIn={onSubIn}
        onSubOut={onSubOut}
      />
    </ListItem>
  );
}
