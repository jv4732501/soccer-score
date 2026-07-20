import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

export interface SubstitutionMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onField: boolean;
  onSubIn: () => void;
  onSubOut: () => void;
}

export function SubstitutionMenu({
  anchorEl,
  open,
  onClose,
  onField,
  onSubIn,
  onSubOut,
}: SubstitutionMenuProps) {
  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      {onField ? (
        <MenuItem
          onClick={() => {
            onSubOut();
            onClose();
          }}
        >
          Sub Out
        </MenuItem>
      ) : (
        <MenuItem
          onClick={() => {
            onSubIn();
            onClose();
          }}
        >
          Sub In
        </MenuItem>
      )}
    </Menu>
  );
}
