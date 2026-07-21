import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { makeId } from '../../logic/log';
import { POSITIONS, positionLabel } from '../../logic/position';
import type { SavedPlayer, SavedTeam } from '../../logic/types';

export interface TeamEditorProps {
  team: SavedTeam | null;
  onSave: (team: SavedTeam) => void;
  onCancel: () => void;
}

interface PlayerDraft {
  num: string;
  name: string;
  starter: boolean;
  position: number | null;
}

function draftFromPlayer(p: SavedPlayer): PlayerDraft {
  return { num: String(p.num), name: p.name, starter: p.starter, position: p.position };
}

const positionMenuItems = POSITIONS.map((pos) => (
  <MenuItem key={pos.value} value={String(pos.value)} title={pos.label}>
    {pos.value} {pos.abbr}
  </MenuItem>
));

// Compact, unlabeled combo used inline on a roster row (matches the density of
// the Starter/Edit/Delete buttons next to it).
function PositionSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <Tooltip title={positionLabel(value) ?? ''}>
      <Select
        aria-label="Position"
        variant="standard"
        value={value != null ? String(value) : ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        displayEmpty
        size="small"
        disableUnderline
        sx={{
          minWidth: 62,
          '& .MuiSelect-select': { pl: 0.5, pr: '18px !important', py: 0.25 },
          '& .MuiSelect-icon': { right: 0 },
        }}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {positionMenuItems}
      </Select>
    </Tooltip>
  );
}

// Labeled combo used in the Edit Player dialog, styled like the # and Name
// fields above it.
function LabeledPositionSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <Tooltip title={positionLabel(value) ?? ''}>
      <FormControl size="small" sx={{ minWidth: 140, alignSelf: 'flex-start' }}>
        <InputLabel id="edit-player-position-label" shrink>
          Position
        </InputLabel>
        <Select
          labelId="edit-player-position-label"
          label="Position"
          value={value != null ? String(value) : ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          displayEmpty
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {positionMenuItems}
        </Select>
      </FormControl>
    </Tooltip>
  );
}

export function TeamEditor({ team, onSave, onCancel }: TeamEditorProps) {
  const [name, setName] = useState(team?.name ?? '');
  const [players, setPlayers] = useState<SavedPlayer[]>(team?.players ?? []);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<PlayerDraft | null>(null);

  const [newNum, setNewNum] = useState('');
  const [newName, setNewName] = useState('');
  const numFieldRef = useRef<HTMLInputElement>(null);

  function updatePlayer(id: string, patch: Partial<SavedPlayer>) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  function handleAdd() {
    if (newNum.trim() === '') return;
    setPlayers((prev) => [
      ...prev,
      { id: makeId(), num: Number(newNum), name: newName.trim(), starter: false, position: null },
    ]);
    setNewNum('');
    setNewName('');
    numFieldRef.current?.focus();
  }

  function openEdit(p: SavedPlayer) {
    setEditDraft(draftFromPlayer(p));
    setEditingId(p.id);
  }

  function saveEdit() {
    if (editingId && editDraft) {
      updatePlayer(editingId, {
        num: Number(editDraft.num) || 0,
        name: editDraft.name,
        starter: editDraft.starter,
        position: editDraft.position,
      });
    }
    setEditingId(null);
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
          <Stack
            key={p.id}
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography
              sx={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
                flexShrink: 1,
              }}
            >
              #{p.num}
              {p.name ? ` ${p.name}` : ''}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
              <Button
                size="small"
                variant={p.starter ? 'contained' : 'outlined'}
                onClick={() => updatePlayer(p.id, { starter: !p.starter })}
                sx={{ minWidth: 0, px: 1 }}
              >
                START
              </Button>
              <PositionSelect
                value={p.position}
                onChange={(position) => updatePlayer(p.id, { position })}
              />
              <Button size="small" onClick={() => openEdit(p)} sx={{ minWidth: 0, px: 1 }}>
                Edit
              </Button>
              <Button
                size="small"
                color="error"
                onClick={() => setPendingDeleteId(p.id)}
                sx={{ minWidth: 0, px: 1 }}
              >
                Delete
              </Button>
            </Stack>
          </Stack>
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 2 }}>
        <TextField
          label="#"
          type="text"
          inputMode="numeric"
          inputRef={numFieldRef}
          value={newNum}
          onChange={(e) => setNewNum(e.target.value.replace(/\D/g, ''))}
          sx={{ width: 80 }}
        />
        <TextField
          label="Name (optional)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
        <Button variant="contained" onClick={handleAdd} disabled={newNum.trim() === ''}>
          Add
        </Button>
      </Stack>
      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
          Save
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Stack>

      <Dialog open={editingId !== null} onClose={() => setEditingId(null)}>
        <DialogTitle>Edit Player</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="#"
              type="text"
              inputMode="numeric"
              value={editDraft?.num ?? ''}
              onChange={(e) =>
                setEditDraft((d) => (d ? { ...d, num: e.target.value.replace(/\D/g, '') } : d))
              }
              onFocus={(e) => e.target.select()}
              sx={{ width: 100 }}
            />
            <TextField
              label="Name"
              value={editDraft?.name ?? ''}
              onChange={(e) => setEditDraft((d) => (d ? { ...d, name: e.target.value } : d))}
            />
            <LabeledPositionSelect
              value={editDraft?.position ?? null}
              onChange={(position) => setEditDraft((d) => (d ? { ...d, position } : d))}
            />
            <Button
              variant={editDraft?.starter ? 'contained' : 'outlined'}
              onClick={() => setEditDraft((d) => (d ? { ...d, starter: !d.starter } : d))}
              sx={{ alignSelf: 'flex-start' }}
            >
              Starter
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingId(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pendingDeleteId !== null} onClose={() => setPendingDeleteId(null)}>
        <DialogTitle>Remove this player?</DialogTitle>
        <DialogContent>
          <DialogContentText>This cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeleteId(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              if (pendingDeleteId) removePlayer(pendingDeleteId);
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
