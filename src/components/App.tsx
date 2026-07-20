import { useEffect, useMemo, useState } from 'react';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '../theme';
import { useMatch } from '../hooks/useMatch';
import { Nav } from './Nav';
import type { HomeView } from './Nav';
import { TeamsScreen } from './Teams/TeamsScreen';
import { SetupScreen } from './Setup/SetupScreen';
import { GameScreen } from './Game/GameScreen';
import { ShootoutScreen } from './Shootout/ShootoutScreen';
import { SummaryScreen } from './Summary/SummaryScreen';
import { HistoryScreen } from './History/HistoryScreen';

function App() {
  const api = useMatch();
  const [homeView, setHomeView] = useState<HomeView>('teams');
  const [historyViewId, setHistoryViewId] = useState<string | null>(null);
  const theme = useMemo(() => createAppTheme(api.theme), [api.theme]);

  const reviewMatch = historyViewId
    ? (api.history.find((m) => m.id === historyViewId) ?? null)
    : null;

  useEffect(() => {
    // Guards against a stale historyViewId (e.g. its entry was deleted while being viewed).
    if (historyViewId && !reviewMatch) setHistoryViewId(null);
  }, [historyViewId, reviewMatch]);

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
      ) : api.match && api.match.screen === 'summary' ? (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <SummaryScreen
            match={api.match}
            mode="live"
            onClose={() => {
              api.closeMatch();
              setHomeView('setup');
            }}
          />
        </Container>
      ) : reviewMatch ? (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <SummaryScreen
            match={reviewMatch}
            mode="review"
            onClose={() => setHistoryViewId(null)}
          />
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
              <HistoryScreen
                history={api.history}
                onReview={(id) => setHistoryViewId(id)}
                onDelete={api.removeFromHistory}
              />
            )}
          </Container>
        </>
      )}
    </ThemeProvider>
  );
}

export default App;
