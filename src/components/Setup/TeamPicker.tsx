import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SavedTeam } from '../../logic/types';

export interface TeamSelection {
  team: SavedTeam | null;
  activeIds: string[];
  collapsed: boolean;
}

export interface TeamPickerProps {
  label: string;
  savedTeams: SavedTeam[];
  value: TeamSelection;
  onChange: (value: TeamSelection) => void;
}

export function TeamPicker({ label, savedTeams, value, onChange }: TeamPickerProps) {
  function selectTeam(team: SavedTeam) {
    const activeIds = team.players.filter((p) => p.starter).map((p) => p.id);
    onChange({ team, activeIds, collapsed: value.collapsed });
  }

  function handleSelectChange(e: SelectChangeEvent) {
    const team = savedTeams.find((t) => t.id === e.target.value);
    if (team) selectTeam(team);
  }

  function toggleActive(id: string) {
    const activeIds = value.activeIds.includes(id)
      ? value.activeIds.filter((x) => x !== id)
      : [...value.activeIds, id];
    onChange({ ...value, activeIds });
  }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1">{label}</Typography>
      <Select
        aria-label={label}
        value={value.team?.id ?? ''}
        onChange={handleSelectChange}
        displayEmpty
        size="small"
        sx={{ minWidth: 200 }}
      >
        <MenuItem value="" disabled>
          <em>Select a team</em>
        </MenuItem>
        {savedTeams.map((t) => (
          <MenuItem key={t.id} value={t.id}>
            {t.name}
          </MenuItem>
        ))}
      </Select>
      {value.team && (
        <Stack sx={{ pl: 2 }}>
          {value.team.players.map((p) => (
            <FormControlLabel
              key={p.id}
              sx={{ my: -0.5 }}
              control={
                <Checkbox
                  checked={value.activeIds.includes(p.id)}
                  onChange={() => toggleActive(p.id)}
                  size="small"
                  sx={{ py: 0.25 }}
                />
              }
              label={`#${p.num} ${p.name}`}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
