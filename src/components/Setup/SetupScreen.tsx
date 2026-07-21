import { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { TeamPicker } from './TeamPicker';
import type { TeamSelection } from './TeamPicker';
import type { newMatch } from '../../logic/match';
import type { SavedTeam, TeamKey } from '../../logic/types';

export interface SetupScreenProps {
  savedTeams: SavedTeam[];
  onStartMatch: (args: Parameters<typeof newMatch>[0]) => void;
}

const emptySelection: TeamSelection = { team: null, activeIds: [], collapsed: false };

export function SetupScreen({ savedTeams, onStartMatch }: SetupScreenProps) {
  const [selA, setSelA] = useState<TeamSelection>(emptySelection);
  const [selB, setSelB] = useState<TeamSelection>(emptySelection);
  const [homeTeam, setHomeTeam] = useState<TeamKey>('teamA');
  const [halfLengthMin, setHalfLengthMin] = useState(45);
  const [hasExtraTime, setHasExtraTime] = useState(false);
  const [extraTimeLengthMin, setExtraTimeLengthMin] = useState(15);
  const [hasShootout, setHasShootout] = useState(false);
  const [hasStoppageTime, setHasStoppageTime] = useState(false);

  const sameTeamSelected = !!selA.team && !!selB.team && selA.team.id === selB.team.id;

  const canStart = !!selA.team && !!selB.team && !sameTeamSelected;

  function handleStart() {
    if (!selA.team || !selB.team) return;
    onStartMatch({
      config: { halfLengthMin, hasExtraTime, extraTimeLengthMin, hasShootout, hasStoppageTime },
      teamA: selA.team,
      activeIdsA: selA.activeIds,
      collapsedA: selA.collapsed,
      teamB: selB.team,
      activeIdsB: selB.activeIds,
      collapsedB: selB.collapsed,
      homeTeam,
    });
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Setup
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} sx={{ mb: 3 }}>
        <TeamPicker label="Team 1" savedTeams={savedTeams} value={selA} onChange={setSelA} />
        <TeamPicker label="Team 2" savedTeams={savedTeams} value={selB} onChange={setSelB} />
      </Stack>
      {sameTeamSelected && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Team 1 and Team 2 must be different teams.
        </Alert>
      )}
      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
        <Typography>Team 1 is</Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={homeTeam === 'teamA' ? 'home' : 'away'}
          onChange={(_e, value: 'home' | 'away' | null) => {
            if (value === 'home') setHomeTeam('teamA');
            else if (value === 'away') setHomeTeam('teamB');
          }}
        >
          <ToggleButton value="home">Home</ToggleButton>
          <ToggleButton value="away">Away</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Accordion sx={{ my: 2 }} slotProps={{ transition: { unmountOnExit: true } }}>
        <AccordionSummary expandIcon={<span aria-hidden="true">▾</span>}>
          <Typography>Match Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
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
        </AccordionDetails>
      </Accordion>
      <Button variant="contained" onClick={handleStart} disabled={!canStart}>
        Start Match
      </Button>
    </Box>
  );
}
