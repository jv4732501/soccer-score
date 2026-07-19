import { useRef, useState, type ChangeEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { TeamPicker } from './TeamPicker';
import type { TeamSelection } from './TeamPicker';
import type { newMatch } from '../../logic/match';
import type { ImportSummary } from '../../hooks/useMatch';
import type { SavedTeam, TeamKey } from '../../logic/types';

export interface SetupScreenProps {
  savedTeams: SavedTeam[];
  onStartMatch: (args: Parameters<typeof newMatch>[0]) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => Promise<ImportSummary>;
}

const emptySelection: TeamSelection = { team: null, activeIds: [], collapsed: false };

export function SetupScreen({
  savedTeams,
  onStartMatch,
  onExportBackup,
  onImportBackup,
}: SetupScreenProps) {
  const [selA, setSelA] = useState<TeamSelection>(emptySelection);
  const [selB, setSelB] = useState<TeamSelection>(emptySelection);
  const [homeTeam, setHomeTeam] = useState<TeamKey>('teamA');
  const [halfLengthMin, setHalfLengthMin] = useState(45);
  const [hasExtraTime, setHasExtraTime] = useState(false);
  const [extraTimeLengthMin, setExtraTimeLengthMin] = useState(15);
  const [hasShootout, setHasShootout] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canStart =
    !!selA.team &&
    !!selB.team &&
    (selA.collapsed || selA.activeIds.length > 0) &&
    (selB.collapsed || selB.activeIds.length > 0);

  const homeTeamName =
    homeTeam === 'teamA' ? (selA.team?.name ?? 'Team A') : (selB.team?.name ?? 'Team B');

  function handleStart() {
    if (!selA.team || !selB.team) return;
    onStartMatch({
      config: { halfLengthMin, hasExtraTime, extraTimeLengthMin, hasShootout },
      teamA: selA.team,
      activeIdsA: selA.activeIds,
      collapsedA: selA.collapsed,
      teamB: selB.team,
      activeIdsB: selB.activeIds,
      collapsedB: selB.collapsed,
      homeTeam,
    });
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);
    setImportMessage(null);
    try {
      const summary = await onImportBackup(file);
      setImportMessage(
        `Imported: ${summary.teamsAdded} team(s) added, ${summary.teamsUpdated} updated, ` +
          `${summary.gamesAdded} game(s) added, ${summary.gamesUpdated} updated.`,
      );
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Setup
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} sx={{ mb: 3 }}>
        <TeamPicker label="Team A" savedTeams={savedTeams} value={selA} onChange={setSelA} />
        <TeamPicker label="Team B" savedTeams={savedTeams} value={selB} onChange={setSelB} />
      </Stack>
      <FormControlLabel
        control={
          <Checkbox
            checked={homeTeam === 'teamB'}
            onChange={(e) => setHomeTeam(e.target.checked ? 'teamB' : 'teamA')}
          />
        }
        label={`Home team: ${homeTeamName}`}
      />
      <Stack spacing={2} sx={{ my: 2 }}>
        <TextField
          label="Half length (minutes)"
          type="number"
          value={halfLengthMin}
          onChange={(e) => setHalfLengthMin(Number(e.target.value))}
          sx={{ maxWidth: 200 }}
        />
        <FormControlLabel
          control={
            <Checkbox checked={hasExtraTime} onChange={(e) => setHasExtraTime(e.target.checked)} />
          }
          label="Extra time"
        />
        {hasExtraTime && (
          <TextField
            label="Extra time period length (minutes)"
            type="number"
            value={extraTimeLengthMin}
            onChange={(e) => setExtraTimeLengthMin(Number(e.target.value))}
            sx={{ maxWidth: 200 }}
          />
        )}
        <FormControlLabel
          control={
            <Checkbox checked={hasShootout} onChange={(e) => setHasShootout(e.target.checked)} />
          }
          label="Penalty shootout"
        />
      </Stack>
      <Button variant="contained" onClick={handleStart} disabled={!canStart}>
        Start Match
      </Button>
      <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
        <Button onClick={onExportBackup}>Export Backup</Button>
        <Button onClick={() => fileInputRef.current?.click()}>Import Backup</Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={handleImportFile}
        />
      </Stack>
      {importMessage && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {importMessage}
        </Alert>
      )}
      {importError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {importError}
        </Alert>
      )}
    </Box>
  );
}
