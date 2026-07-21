import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import ListItem from '@mui/material/ListItem';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import type { Player } from '../../logic/types';
import type { PlayerStatField } from '../../logic/stats';
import { POSITIONS } from '../../logic/position';
import { StatMenu } from './StatMenu';

export interface PlayerRowProps {
  player: Player;
  selected: boolean;
  onSelect: () => void;
  onRecordStat: (stat: PlayerStatField) => void;
  onRecordCard: (color: 'yellow' | 'red') => void;
  onSubIn: (position: number | null) => void;
  onSubOut: () => void;
}

const LONG_PRESS_MS = 500;

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

export function PlayerRow({
  player,
  selected,
  onSelect,
  onRecordStat,
  onRecordCard,
  onSubIn,
  onSubOut,
}: PlayerRowProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [statAnchor, setStatAnchor] = useState<HTMLElement | null>(null);
  const [positionOpen, setPositionOpen] = useState(false);
  const [positionValue, setPositionValue] = useState<number | ''>('');

  const cardRef = useRef<HTMLLIElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFiredRef = useRef(false);

  function startPress() {
    longFiredRef.current = false;
    timerRef.current = setTimeout(() => {
      longFiredRef.current = true;
      setMenuAnchor(cardRef.current);
    }, LONG_PRESS_MS);
  }

  function endPress() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handleClick() {
    if (longFiredRef.current) {
      longFiredRef.current = false;
      return;
    }
    onSelect();
  }

  function closeMenu() {
    setMenuAnchor(null);
  }

  function handleBench() {
    onSubOut();
    closeMenu();
  }

  function handleOnClick() {
    closeMenu();
    setPositionValue(player.position ?? '');
    setPositionOpen(true);
  }

  function handleStatsClick() {
    setStatAnchor(cardRef.current);
    closeMenu();
  }

  function saveOn() {
    onSubIn(positionValue === '' ? null : positionValue);
    setPositionOpen(false);
  }

  const numberColor = player.sentOff ? 'error.main' : player.onField ? 'success.main' : 'inherit';

  return (
    <ListItem
      dense
      disablePadding
      data-testid="player-card"
      ref={cardRef}
      sx={{
        py: 0.5,
        px: 1,
        mb: 0.5,
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        borderWidth: selected ? 2 : 1,
        borderRadius: 1,
        userSelect: 'none',
        cursor: 'pointer',
      }}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onPointerCancel={endPress}
      onContextMenu={(e) => e.preventDefault()}
      onClick={handleClick}
    >
      <Typography variant="body2" title={player.name}>
        <Box component="span" sx={{ color: numberColor, fontWeight: 700 }}>
          #{player.num}
        </Box>{' '}
        {initials(player.name)} · {player.goals}G {player.assists}A
      </Typography>

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu}>
        {!player.sentOff &&
          (player.onField ? (
            <MenuItem onClick={handleBench}>Bench</MenuItem>
          ) : (
            <MenuItem onClick={handleOnClick}>On</MenuItem>
          ))}
        <MenuItem onClick={handleStatsClick}>Stats</MenuItem>
      </Menu>

      <StatMenu
        anchorEl={statAnchor}
        open={!!statAnchor}
        onClose={() => setStatAnchor(null)}
        onSelectStat={onRecordStat}
        onSelectCard={onRecordCard}
      />

      <Dialog open={positionOpen} onClose={() => setPositionOpen(false)}>
        <DialogTitle>Position</DialogTitle>
        <DialogContent>
          <FormControl size="small" sx={{ mt: 1, minWidth: 160 }}>
            <InputLabel id="on-position-label" shrink>
              Position
            </InputLabel>
            <Select
              labelId="on-position-label"
              label="Position"
              displayEmpty
              value={positionValue === '' ? '' : String(positionValue)}
              onChange={(e) =>
                setPositionValue(e.target.value === '' ? '' : Number(e.target.value))
              }
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {POSITIONS.map((pos) => (
                <MenuItem key={pos.value} value={String(pos.value)} title={pos.label}>
                  {pos.abbr}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPositionOpen(false)}>Cancel</Button>
          <Button onClick={saveOn} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </ListItem>
  );
}
