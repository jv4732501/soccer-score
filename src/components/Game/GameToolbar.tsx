import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { MatchConfig } from '../../logic/types';

export interface GameToolbarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  config: MatchConfig;
  onUpdateConfig: (patch: Partial<MatchConfig>) => void;
  onOpenReview: () => void;
}

export function GameToolbar({
  theme,
  onToggleTheme,
  config,
  onUpdateConfig,
  onOpenReview,
}: GameToolbarProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [halfLengthMin, setHalfLengthMin] = useState(config.halfLengthMin);
  const [hasExtraTime, setHasExtraTime] = useState(config.hasExtraTime);
  const [extraTimeLengthMin, setExtraTimeLengthMin] = useState(config.extraTimeLengthMin);
  const [hasShootout, setHasShootout] = useState(config.hasShootout);
  const [hasStoppageTime, setHasStoppageTime] = useState(config.hasStoppageTime);

  function openSettings() {
    setHalfLengthMin(config.halfLengthMin);
    setHasExtraTime(config.hasExtraTime);
    setExtraTimeLengthMin(config.extraTimeLengthMin);
    setHasShootout(config.hasShootout);
    setHasStoppageTime(config.hasStoppageTime);
    setSettingsOpen(true);
    setAnchorEl(null);
  }

  function saveSettings() {
    onUpdateConfig({ halfLengthMin, hasExtraTime, extraTimeLengthMin, hasShootout, hasStoppageTime });
    setSettingsOpen(false);
  }

  function handleToggleTheme() {
    onToggleTheme();
    setAnchorEl(null);
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
      <IconButton
        aria-label="Open menu"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        size="small"
      >
        ☰
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={openSettings}>Match Settings</MenuItem>
        <MenuItem onClick={handleToggleTheme}>
          {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        </MenuItem>
      </Menu>
      <Button onClick={onOpenReview}>Review</Button>
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>Match Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Half length (minutes)"
              type="text"
              inputMode="numeric"
              value={halfLengthMin}
              onChange={(e) => setHalfLengthMin(Number(e.target.value.replace(/\D/g, '')) || 0)}
              onFocus={(e) => e.target.select()}
              sx={{ maxWidth: 200 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={hasExtraTime}
                  onChange={(e) => setHasExtraTime(e.target.checked)}
                />
              }
              label="Extra time"
            />
            {hasExtraTime && (
              <TextField
                label="Extra time period length (minutes)"
                type="text"
                inputMode="numeric"
                value={extraTimeLengthMin}
                onChange={(e) =>
                  setExtraTimeLengthMin(Number(e.target.value.replace(/\D/g, '')) || 0)
                }
                onFocus={(e) => e.target.select()}
                sx={{ maxWidth: 200 }}
              />
            )}
            <FormControlLabel
              control={
                <Checkbox checked={hasShootout} onChange={(e) => setHasShootout(e.target.checked)} />
              }
              label="Penalty shootout"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={hasStoppageTime}
                  onChange={(e) => setHasStoppageTime(e.target.checked)}
                />
              }
              label="Track stoppage time"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveSettings}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
