import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Match, TeamKey } from '../../logic/types';
import type { MatchHookApi } from '../../hooks/useMatch';
import { otherTeam } from '../../logic/log';

export interface ShootoutScreenProps {
  match: Match;
  onRecordAttempt: MatchHookApi['recordAttempt'];
  onUndo: MatchHookApi['undo'];
  onEndGame: MatchHookApi['endGame'];
}

function nextShooter(match: Match): TeamKey {
  const taken = match.shootout?.attempts.length ?? 0;
  return taken % 2 === 0 ? match.homeTeam : otherTeam(match.homeTeam);
}

export function ShootoutScreen({ match, onRecordAttempt, onUndo, onEndGame }: ShootoutScreenProps) {
  const shootout = match.shootout;
  if (!shootout) return null;

  const takenBy = (team: TeamKey) => shootout.attempts.filter((a) => a.team === team);
  const scoredBy = (team: TeamKey) => takenBy(team).filter((a) => a.scored).length;
  const next = nextShooter(match);

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        Penalty Shootout
      </Typography>
      <Stack direction="row" spacing={4} sx={{ justifyContent: 'center', mb: 3 }}>
        <Typography variant="h6">
          {match.teamA.name}: {scoredBy('teamA')} ({takenBy('teamA').length} taken)
        </Typography>
        <Typography variant="h6">
          {match.teamB.name}: {scoredBy('teamB')} ({takenBy('teamB').length} taken)
        </Typography>
      </Stack>
      {shootout.winner ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {shootout.winner === 'teamA' ? match.teamA.name : match.teamB.name} wins the shootout!
        </Alert>
      ) : (
        <>
          <Typography sx={{ mb: 2 }}>
            Next: {next === 'teamA' ? match.teamA.name : match.teamB.name}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
            <Button variant="contained" onClick={() => onRecordAttempt(next, true)}>
              Scored
            </Button>
            <Button variant="outlined" onClick={() => onRecordAttempt(next, false)}>
              Missed
            </Button>
          </Stack>
        </>
      )}
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', mt: 4 }}>
        <Button onClick={onUndo} disabled={shootout.attempts.length === 0}>
          Undo
        </Button>
        <Button variant="contained" color="error" onClick={onEndGame} disabled={!shootout.winner}>
          End Game
        </Button>
      </Stack>
    </Box>
  );
}
