import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
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

  function toggleActive(id: string) {
    const activeIds = value.activeIds.includes(id)
      ? value.activeIds.filter((x) => x !== id)
      : [...value.activeIds, id];
    onChange({ ...value, activeIds });
  }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1">{label}</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {savedTeams.map((t) => (
          <Button
            key={t.id}
            variant={value.team?.id === t.id ? 'contained' : 'outlined'}
            onClick={() => selectTeam(t)}
          >
            {t.name}
          </Button>
        ))}
      </Stack>
      <FormControlLabel
        control={
          <Checkbox
            checked={value.collapsed}
            onChange={(e) => onChange({ ...value, collapsed: e.target.checked })}
          />
        }
        label="Collapsed (score-only tracking)"
      />
      {value.team && !value.collapsed && (
        <Stack sx={{ pl: 2 }}>
          {value.team.players.map((p) => (
            <FormControlLabel
              key={p.id}
              control={
                <Checkbox
                  checked={value.activeIds.includes(p.id)}
                  onChange={() => toggleActive(p.id)}
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
