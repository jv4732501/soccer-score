import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { makeId } from '../../logic/log';
import type { SavedPlayer, SavedTeam } from '../../logic/types';

export interface TeamEditorProps {
  team: SavedTeam | null;
  onSave: (team: SavedTeam) => void;
  onCancel: () => void;
}

function blankPlayer(): SavedPlayer {
  return { id: makeId(), num: 0, name: '', starter: true, goalkeeper: false };
}

export function TeamEditor({ team, onSave, onCancel }: TeamEditorProps) {
  const [name, setName] = useState(team?.name ?? '');
  const [players, setPlayers] = useState<SavedPlayer[]>(team?.players ?? []);

  function updatePlayer(id: string, patch: Partial<SavedPlayer>) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  function addPlayer() {
    setPlayers((prev) => [...prev, blankPlayer()]);
  }

  function handleSave() {
    onSave({ id: team?.id ?? makeId(), name, players });
  }

  return (
    <Box component="form" onSubmit={(e) => e.preventDefault()}>
      <Typography variant="h6" gutterBottom>
        {team ? 'Edit Team' : 'Add Team'}
      </Typography>
      <TextField
        label="Team name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Roster
      </Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {players.map((p) => (
          <Stack key={p.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TextField
              label="#"
              type="number"
              value={p.num}
              onChange={(e) => updatePlayer(p.id, { num: Number(e.target.value) })}
              sx={{ width: 80 }}
            />
            <TextField
              label="Name"
              value={p.name}
              onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
              sx={{ flexGrow: 1 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={p.starter}
                  onChange={(e) => updatePlayer(p.id, { starter: e.target.checked })}
                />
              }
              label="Starter"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={p.goalkeeper}
                  onChange={(e) => updatePlayer(p.id, { goalkeeper: e.target.checked })}
                />
              }
              label="GK"
            />
            <IconButton
              aria-label={`Remove ${p.name || 'player'}`}
              onClick={() => removePlayer(p.id)}
            >
              ✕
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Button onClick={addPlayer} sx={{ mt: 1 }}>
        Add Player
      </Button>
      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
          Save
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Stack>
    </Box>
  );
}
