import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { Match, Team } from '../../logic/types';
import { formatClock } from '../../logic/clock';
import { periodLabel } from '../../logic/periodLabel';

export interface SummaryScreenProps {
  match: Match;
  mode: 'live' | 'review' | 'inprogress';
  onClose: () => void;
}

const CLOSE_LABEL = {
  live: 'New Match',
  review: 'Back to History',
  inprogress: 'Back to Game',
} as const;

// periodScores holds one cumulative-score snapshot per period actually played, taken in strict
// ladder order (1 -> 2 -> ET1 -> ET2 -> shootout) by endHalf/addExtraTime/startShootout/endGame --
// so the Nth snapshot always corresponds to the Nth period in this fixed sequence, regardless of
// which of those functions produced it.
const PERIOD_LADDER = [1, 2, 'ET1', 'ET2'] as const;

function periodRows(match: Match): { label: string; teamA: number; teamB: number }[] {
  return match.periodScores.map((snapshot, i) => {
    const prev = i > 0 ? match.periodScores[i - 1] : { teamA: 0, teamB: 0 };
    return {
      label: periodLabel(PERIOD_LADDER[i]),
      teamA: snapshot.teamA - prev.teamA,
      teamB: snapshot.teamB - prev.teamB,
    };
  });
}

function TeamBoxScore({ team }: { team: Team }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {team.name}
      </Typography>
      {team.collapsed ? (
        <Typography>
          Corners: {team.corners} · Offsides: {team.offsides} · Yellow cards: {team.yellowCards} ·
          Red cards: {team.redCards}
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align="right">G</TableCell>
              <TableCell align="right">A</TableCell>
              <TableCell align="right">Shots</TableCell>
              <TableCell align="right">Tackles</TableCell>
              <TableCell align="right">Fouls</TableCell>
              <TableCell align="right">Saves</TableCell>
              <TableCell align="right">YC</TableCell>
              <TableCell align="right">RC</TableCell>
              <TableCell align="right">Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {team.players.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.num}</TableCell>
                <TableCell>
                  {p.name}
                  {p.sentOff ? ' (sent off)' : ''}
                </TableCell>
                <TableCell align="right">{p.goals}</TableCell>
                <TableCell align="right">{p.assists}</TableCell>
                <TableCell align="right">{p.shotsOnGoal}</TableCell>
                <TableCell align="right">{p.tackles}</TableCell>
                <TableCell align="right">{p.foulsCommitted}</TableCell>
                <TableCell align="right">{p.saves}</TableCell>
                <TableCell align="right">{p.yellowCards}</TableCell>
                <TableCell align="right">{p.redCards}</TableCell>
                <TableCell align="right">{formatClock(p.fieldSecs)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

export function SummaryScreen({ match, mode, onClose }: SummaryScreenProps) {
  const rows = periodRows(match);
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {mode === 'inprogress' ? 'Current' : 'Final'}: {match.teamA.name} {match.score.teamA} –{' '}
        {match.score.teamB} {match.teamB.name}
      </Typography>
      {match.shootout?.winner && (
        <Typography variant="h6" sx={{ mb: 2 }}>
          {match.shootout.winner === 'teamA' ? match.teamA.name : match.teamB.name} win on
          penalties ({match.shootout.attempts.filter((a) => a.team === 'teamA' && a.scored).length}
          –{match.shootout.attempts.filter((a) => a.team === 'teamB' && a.scored).length})
        </Typography>
      )}
      <Table size="small" sx={{ mb: 3, maxWidth: 400 }}>
        <TableHead>
          <TableRow>
            <TableCell>Period</TableCell>
            <TableCell align="right">{match.teamA.name}</TableCell>
            <TableCell align="right">{match.teamB.name}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.label}>
              <TableCell>{r.label}</TableCell>
              <TableCell align="right">{r.teamA}</TableCell>
              <TableCell align="right">{r.teamB}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Divider sx={{ my: 2 }} />
      <TeamBoxScore team={match.teamA} />
      <TeamBoxScore team={match.teamB} />
      <Divider sx={{ my: 2 }} />
      <Typography sx={{ mb: 2 }}>
        Possession: {match.teamA.name} {formatClock(match.possession.accumSec.teamA)} ·{' '}
        {match.teamB.name} {formatClock(match.possession.accumSec.teamB)}
      </Typography>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" gutterBottom>
        Event Log
      </Typography>
      <List dense>
        {match.log.map((entry) => (
          <ListItem key={entry.id}>
            <ListItemText
              primary={`${entry.clockText} ${periodLabel(entry.period)} — ${entry.detail}`}
            />
          </ListItem>
        ))}
      </List>
      <Button variant="contained" onClick={onClose} sx={{ mt: 3 }}>
        {CLOSE_LABEL[mode]}
      </Button>
    </Box>
  );
}
