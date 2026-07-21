import { useRef, useState, type ChangeEvent } from 'react';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import type { ImportSummary } from '../hooks/useMatch';

export type HomeView = 'setup' | 'teams' | 'history';

export interface NavProps {
  homeView: HomeView;
  onChangeHomeView: (view: HomeView) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => Promise<ImportSummary>;
}

export function Nav({
  homeView,
  onChangeHomeView,
  theme,
  onToggleTheme,
  onExportBackup,
  onImportBackup,
}: NavProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [snackbar, setSnackbar] = useState<{ severity: 'success' | 'error'; message: string } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleToggleTheme() {
    onToggleTheme();
    setAnchorEl(null);
  }

  function handleExportBackup() {
    onExportBackup();
    setAnchorEl(null);
  }

  function handleImportClick() {
    setAnchorEl(null);
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const summary = await onImportBackup(file);
      setSnackbar({
        severity: 'success',
        message:
          `Imported: ${summary.teamsAdded} team(s) added, ${summary.teamsUpdated} updated, ` +
          `${summary.gamesAdded} game(s) added, ${summary.gamesUpdated} updated.`,
      });
    } catch (err) {
      setSnackbar({
        severity: 'error',
        message: err instanceof Error ? err.message : 'Import failed.',
      });
    }
  }

  return (
    <AppBar position="static" color="default">
      <Toolbar variant="dense" sx={{ px: { xs: 1, sm: 2 }, gap: { xs: 0.5, sm: 1 } }}>
        <IconButton
          aria-label="Open menu"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          color="inherit"
          size="small"
        >
          ☰
        </IconButton>
        <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
          <MenuItem onClick={handleExportBackup}>Export Backup</MenuItem>
          <MenuItem onClick={handleImportClick}>Import Backup</MenuItem>
          <MenuItem onClick={handleToggleTheme}>
            {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </MenuItem>
        </Menu>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={handleImportFile}
        />
        <Tabs
          value={homeView}
          onChange={(_e, value: HomeView) => onChangeHomeView(value)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            minHeight: 0,
            '& .MuiTab-root': {
              minWidth: 0,
              minHeight: 0,
              px: { xs: 1, sm: 2 },
              py: 1.5,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            },
          }}
        >
          <Tab label="Setup" value="setup" />
          <Tab label="Teams" value="teams" />
          <Tab label="History" value="history" />
        </Tabs>
      </Toolbar>
      <Snackbar
        open={snackbar !== null}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </AppBar>
  );
}
