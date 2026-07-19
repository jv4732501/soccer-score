import { useMemo, useState } from 'react';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { createAppTheme } from '../theme';
import { useMatch } from '../hooks/useMatch';
import { Nav } from './Nav';
import type { HomeView } from './Nav';
import { TeamsScreen } from './Teams/TeamsScreen';

function App() {
  const api = useMatch();
  const [homeView, setHomeView] = useState<HomeView>('teams');
  const theme = useMemo(() => createAppTheme(api.theme), [api.theme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {api.match ? (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography>
            A match is in progress. Resuming and playing a match arrive in the next update.
          </Typography>
        </Container>
      ) : (
        <>
          <Nav
            homeView={homeView}
            onChangeHomeView={setHomeView}
            onToggleTheme={() => api.setTheme(api.theme === 'dark' ? 'light' : 'dark')}
          />
          <Container maxWidth="md" sx={{ py: 4 }}>
            {homeView === 'teams' && (
              <TeamsScreen
                savedTeams={api.savedTeams}
                onUpsertTeam={api.upsertTeam}
                onRemoveTeam={api.removeTeam}
              />
            )}
            {homeView === 'setup' && (
              <Typography>Match setup is coming in the next update.</Typography>
            )}
            {homeView === 'history' && (
              <Typography>Match history is coming in a future update.</Typography>
            )}
          </Container>
        </>
      )}
    </ThemeProvider>
  );
}

export default App;
