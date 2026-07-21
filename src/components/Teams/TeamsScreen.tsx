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
import { TeamEditor } from './TeamEditor';
import type { SavedTeam } from '../../logic/types';

export interface TeamsScreenProps {
  savedTeams: SavedTeam[];
  onUpsertTeam: (team: SavedTeam) => void;
  onRemoveTeam: (id: string) => void;
}

export function TeamsScreen({ savedTeams, onUpsertTeam, onRemoveTeam }: TeamsScreenProps) {
  const [editing, setEditing] = useState<SavedTeam | 'new' | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  if (editing !== null) {
    return (
      <TeamEditor
        team={editing === 'new' ? null : editing}
        onSave={(team) => {
          onUpsertTeam(team);
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Teams
      </Typography>
      <List>
        {savedTeams.map((team) => (
          <ListItem
            key={team.id}
            secondaryAction={
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => setEditing(team)}>
                  Edit
                </Button>
                <Button size="small" color="error" onClick={() => setPendingDeleteId(team.id)}>
                  Delete
                </Button>
              </Stack>
            }
          >
            <ListItemText primary={team.name} secondary={`${team.players.length} players`} />
          </ListItem>
        ))}
      </List>
      <Button variant="contained" onClick={() => setEditing('new')}>
        Add Team
      </Button>
      <Dialog open={pendingDeleteId !== null} onClose={() => setPendingDeleteId(null)}>
        <DialogTitle>Delete this team?</DialogTitle>
        <DialogContent>
          <DialogContentText>This cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeleteId(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              if (pendingDeleteId) onRemoveTeam(pendingDeleteId);
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
