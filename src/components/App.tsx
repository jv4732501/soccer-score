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
import { SetupScreen } from './Setup/SetupScreen';
import { GameScreen } from './Game/GameScreen';
import { ShootoutScreen } from './Shootout/ShootoutScreen';

function App() {
  const api = useMatch();
  const [homeView, setHomeView] = useState<HomeView>('teams');
  const theme = useMemo(() => createAppTheme(api.theme), [api.theme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {api.match && api.match.screen === 'game' ? (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <GameScreen
            match={api.match}
            onAdjustScore={api.adjustScore}
            onRecordPlayerStat={api.recordPlayerStat}
            onRecordCard={api.recordCard}
            onRecordCorner={api.recordCorner}
            onRecordOffside={api.recordOffside}
            onSubIn={api.subIn}
            onSubOut={api.subOut}
            onSetPossession={api.setPossession}
            onRecordStoppage={api.recordStoppage}
            onToggleClock={api.toggleClock}
            onEndHalf={api.endHalf}
            onAddExtraTime={api.addExtraTime}
            onEndGame={api.endGame}
            onStartShootout={api.startShootout}
            onUndo={api.undo}
          />
        </Container>
      ) : api.match && api.match.screen === 'shootout' ? (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <ShootoutScreen
            match={api.match}
            onRecordAttempt={api.recordAttempt}
            onUndo={api.undo}
            onEndGame={api.endGame}
          />
        </Container>
      ) : api.match ? (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography>Match summary is coming in the next update.</Typography>
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
              <SetupScreen
                savedTeams={api.savedTeams}
                onStartMatch={api.startMatch}
                onExportBackup={api.exportBackup}
                onImportBackup={api.importBackup}
              />
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
