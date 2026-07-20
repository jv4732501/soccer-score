import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Match } from '../../logic/types';

export interface HistoryScreenProps {
  history: Match[];
  onReview: (id: string) => void;
  onDelete: (id: string) => void;
}

function result(match: Match): string {
  const homeScore = match.score[match.homeTeam];
  const awayTeam = match.homeTeam === 'teamA' ? 'teamB' : 'teamA';
  const awayScore = match.score[awayTeam];
  if (homeScore > awayScore) return 'W';
  if (homeScore < awayScore) return 'L';
  return 'T';
}

export function HistoryScreen({ history, onReview, onDelete }: HistoryScreenProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const sorted = history.slice().sort((a, b) => (b.date ?? 0) - (a.date ?? 0));

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        History
      </Typography>
      {sorted.length === 0 ? (
        <Typography color="text.secondary">No finished matches yet.</Typography>
      ) : (
        <List>
          {sorted.map((match) => (
            <ListItem
              key={match.id}
              secondaryAction={
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => onReview(match.id)}>
                    Review
                  </Button>
                  <Button size="small" color="error" onClick={() => setPendingDeleteId(match.id)}>
                    Delete
                  </Button>
                </Stack>
              }
            >
              <ListItemText
                primary={`${match.teamA.name} vs ${match.teamB.name}`}
                secondary={`${match.date ? new Date(match.date).toLocaleDateString() : ''} · ${match.score.teamA}–${match.score.teamB} ${result(match)}`}
              />
            </ListItem>
          ))}
        </List>
      )}
      <Dialog open={pendingDeleteId !== null} onClose={() => setPendingDeleteId(null)}>
        <DialogTitle>Delete this match from history?</DialogTitle>
        <DialogContent>
          <DialogContentText>This cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeleteId(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              if (pendingDeleteId) onDelete(pendingDeleteId);
              setPendingDeleteId(null);
            }}
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
