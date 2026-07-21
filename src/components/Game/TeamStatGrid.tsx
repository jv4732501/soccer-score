import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import type { SxProps, Theme } from '@mui/material/styles';
import type { Team, TeamKey } from '../../logic/types';
import type { TeamStatField } from '../../logic/stats';

// Two 60px columns + one 0.5-spacing (3px) gap between them. Reused by TeamPanel
// so the roster below lines up under this same edge-aligned column instead of
// stretching to fit its own (wider) text content.
export const TEAM_COLUMN_WIDTH = 60 * 2 + 3;

export interface TeamStatGridProps {
  team: Team;
  teamKey: TeamKey;
  onRecordCorner: (team: TeamKey) => void;
  onRecordOffside: (team: TeamKey) => void;
  onRecordCard: (team: TeamKey, playerId: string | null, color: 'yellow' | 'red') => void;
  onRecordTeamStat: (team: TeamKey, stat: TeamStatField) => void;
}

const TEAM_STAT_BUTTONS: { field: TeamStatField; label: string }[] = [
  { field: 'assists', label: 'AST' },
  { field: 'shotsOnGoal', label: 'SOG' },
  { field: 'targetsOnGoal', label: 'TOG' },
  { field: 'tackles', label: 'TK' },
  { field: 'foulsCommitted', label: 'F' },
  { field: 'saves', label: 'SV' },
];

const btnSx: SxProps<Theme> = {
  minWidth: 0,
  width: 60,
  px: 0.5,
  py: 0.75,
  fontSize: '0.7rem',
  lineHeight: 1.2,
  justifyContent: 'flex-start',
  textAlign: 'left',
};

export function TeamStatGrid({
  team,
  teamKey,
  onRecordCorner,
  onRecordOffside,
  onRecordCard,
  onRecordTeamStat,
}: TeamStatGridProps) {
  return (
    <Box sx={{ display: 'grid', width: TEAM_COLUMN_WIDTH, gridTemplateColumns: 'repeat(2, 60px)', gap: 0.5 }}>
      <Button size="small" variant="outlined" sx={btnSx} onClick={() => onRecordCorner(teamKey)}>
        Cor ({team.corners})
      </Button>
      <Button size="small" variant="outlined" sx={btnSx} onClick={() => onRecordOffside(teamKey)}>
        OFS ({team.offsides})
      </Button>
      {TEAM_STAT_BUTTONS.map(({ field, label }) => (
        <Button
          key={field}
          size="small"
          variant="outlined"
          sx={btnSx}
          onClick={() => onRecordTeamStat(teamKey, field)}
        >
          {label} ({team[field]})
        </Button>
      ))}
      <Button
        size="small"
        variant="outlined"
        sx={btnSx}
        onClick={() => onRecordCard(teamKey, null, 'yellow')}
      >
        YC ({team.yellowCards})
      </Button>
      <Button size="small" variant="outlined" sx={btnSx} onClick={() => onRecordCard(teamKey, null, 'red')}>
        RC ({team.redCards})
      </Button>
    </Box>
  );
}
