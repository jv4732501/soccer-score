import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

export type HomeView = 'setup' | 'teams' | 'history';

export interface NavProps {
  homeView: HomeView;
  onChangeHomeView: (view: HomeView) => void;
  onToggleTheme: () => void;
}

export function Nav({ homeView, onChangeHomeView, onToggleTheme }: NavProps) {
  return (
    <AppBar position="static" color="default">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Soccer Score
        </Typography>
        <Tabs
          value={homeView}
          onChange={(_e, value: HomeView) => onChangeHomeView(value)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="Setup" value="setup" />
          <Tab label="Teams" value="teams" />
          <Tab label="History" value="history" />
        </Tabs>
        <IconButton aria-label="Toggle theme" onClick={onToggleTheme} color="inherit">
          ☾
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
