import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
                <Button size="small" color="error" onClick={() => onRemoveTeam(team.id)}>
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
    </Box>
  );
}
