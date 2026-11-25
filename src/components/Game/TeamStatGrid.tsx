import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import type { LogEntry, Team, TeamKey } from '../../logic/types';
import type { TeamStatField } from '../../logic/stats';
import { periodLabel } from '../../logic/periodLabel';

// Two 60px columns + one 0.5-spacing (3px) gap between them. Reused by TeamPanel
// so the roster below lines up under this same edge-aligned column instead of
// stretching to fit its own (wider) text content.
export const TEAM_COLUMN_WIDTH = 60 * 2 + 3;

const LONG_PRESS_MS = 500;

export interface TeamStatGridProps {
  team: Team;
  teamKey: TeamKey;
  log: LogEntry[];
  onRecordCorner: (team: TeamKey) => void;
  onRecordOffside: (team: TeamKey) => void;
  onRecordCard: (team: TeamKey, playerId: string | null, color: 'yellow' | 'red') => void;
  onRecordTeamStat: (team: TeamKey, stat: TeamStatField) => void;
}

const TEAM_STAT_BUTTONS: { field: TeamStatField; label: string; logTypes: string[] }[] = [
  { field: 'assists', label: 'AST', logTypes: ['assists', 'team_assists'] },
  { field: 'shotsOnGoal', label: 'SOG', logTypes: ['shotsOnGoal', 'team_shotsOnGoal'] },
  { field: 'targetsOnGoal', label: 'TOG', logTypes: ['team_targetsOnGoal'] },
  { field: 'tackles', label: 'TK', logTypes: ['tackles', 'team_tackles'] },
  { field: 'foulsCommitted', label: 'F', logTypes: ['foulsCommitted', 'team_foulsCommitted'] },
  { field: 'saves', label: 'SV', logTypes: ['saves', 'team_saves'] },
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

interface StatButtonProps {
  label: string;
  count: number;
  teamName: string;
  teamKey: TeamKey;
  log: LogEntry[];
  logTypes: readonly string[];
  onClick: () => void;
}

function StatButton({ label, count, teamName, teamKey, log, logTypes, onClick }: StatButtonProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFiredRef = useRef(false);

  function startPress() {
    longFiredRef.current = false;
    timerRef.current = setTimeout(() => {
      longFiredRef.current = true;
      setOpen(true);
    }, LONG_PRESS_MS);
  }

  function endPress() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handleClick() {
    if (longFiredRef.current) {
      longFiredRef.current = false;
      return;
    }
    onClick();
  }

  const entries = log.filter((e) => e.team === teamKey && logTypes.includes(e.type)).slice().reverse();

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        sx={btnSx}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleClick}
      >
        {label} ({count})
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>
          {teamName} {label}
        </DialogTitle>
        <DialogContent>
          {entries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No activity yet
            </Typography>
          ) : (
            entries.map((e) => (
              <Typography key={e.id} variant="body2" component="div">
                {e.clockText} {periodLabel(e.period)} — {e.detail}
              </Typography>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function TeamStatGrid({
  team,
  teamKey,
  log,
  onRecordCorner,
  onRecordOffside,
  onRecordCard,
  onRecordTeamStat,
}: TeamStatGridProps) {
  return (
    <Box sx={{ display: 'grid', width: TEAM_COLUMN_WIDTH, gridTemplateColumns: 'repeat(2, 60px)', gap: 0.5 }}>
      <StatButton
        label="Cor"
        count={team.corners}
        teamName={team.name}
        teamKey={teamKey}
        log={log}
        logTypes={['corner']}
        onClick={() => onRecordCorner(teamKey)}
      />
      <StatButton
        label="OFS"
        count={team.offsides}
        teamName={team.name}
        teamKey={teamKey}
        log={log}
        logTypes={['offside']}
        onClick={() => onRecordOffside(teamKey)}
      />
      {TEAM_STAT_BUTTONS.map(({ field, label, logTypes }) => (
        <StatButton
          key={field}
          label={label}
          count={team[field]}
          teamName={team.name}
          teamKey={teamKey}
          log={log}
          logTypes={logTypes}
          onClick={() => onRecordTeamStat(teamKey, field)}
        />
      ))}
      <StatButton
        label="YC"
        count={team.yellowCards}
        teamName={team.name}
        teamKey={teamKey}
        log={log}
        logTypes={['card_yellow', 'card_2nd_yellow']}
        onClick={() => onRecordCard(teamKey, null, 'yellow')}
      />
      <StatButton
        label="RC"
        count={team.redCards}
        teamName={team.name}
        teamKey={teamKey}
        log={log}
        logTypes={['card_red', 'card_2nd_yellow']}
        onClick={() => onRecordCard(teamKey, null, 'red')}
      />
    </Box>
  );
}
