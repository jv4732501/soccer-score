import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import type { PlayerStatField } from '../../logic/stats';

const STAT_OPTIONS: { field: PlayerStatField; label: string }[] = [
  { field: 'goals', label: 'Goal' },
  { field: 'assists', label: 'Assist' },
  { field: 'shotsOnGoal', label: 'Shot on Goal' },
  { field: 'tackles', label: 'Tackle' },
  { field: 'foulsCommitted', label: 'Foul' },
  { field: 'saves', label: 'Save' },
];

export interface StatMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onSelectStat: (stat: PlayerStatField) => void;
  onSelectCard: (color: 'yellow' | 'red') => void;
}

export function StatMenu({ anchorEl, open, onClose, onSelectStat, onSelectCard }: StatMenuProps) {
  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      {STAT_OPTIONS.map((opt) => (
        <MenuItem
          key={opt.field}
          onClick={() => {
            onSelectStat(opt.field);
            onClose();
          }}
        >
          {opt.label}
        </MenuItem>
      ))}
      <MenuItem
        onClick={() => {
          onSelectCard('yellow');
          onClose();
        }}
      >
        Yellow Card
      </MenuItem>
      <MenuItem
        onClick={() => {
          onSelectCard('red');
          onClose();
        }}
      >
        Red Card
      </MenuItem>
    </Menu>
  );
}
