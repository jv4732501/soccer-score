import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { LogEntry, Team, TeamKey } from '../../logic/types';
import type { PlayerStatField } from '../../logic/stats';
import { PlayerRow } from './PlayerRow';

export interface TeamPanelProps {
  team: Team;
  teamKey: TeamKey;
  log: LogEntry[];
  selectedPlayerId: string | null;
  onSelectPlayer: (playerId: string) => void;
  onAdjustScore: (team: TeamKey, delta: number) => void;
  onRecordCard: (team: TeamKey, playerId: string | null, color: 'yellow' | 'red') => void;
  onRecordPlayerStat: (team: TeamKey, playerId: string, stat: PlayerStatField) => void;
  onSubIn: (team: TeamKey, playerId: string, position?: number | null) => void;
  onSubOut: (team: TeamKey, playerId: string) => void;
  onAddPlayer: (team: TeamKey, num: number, name: string) => void;
}

export function TeamPanel({
  team,
  teamKey,
  log,
  selectedPlayerId,
  onSelectPlayer,
  onAdjustScore,
  onRecordCard,
  onRecordPlayerStat,
  onSubIn,
  onSubOut,
  onAddPlayer,
}: TeamPanelProps) {
  const [newNum, setNewNum] = useState('');
  const [newName, setNewName] = useState('');
  const numFieldRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    if (newNum.trim() === '') return;
    onAddPlayer(teamKey, Number(newNum), newName.trim());
    setNewNum('');
    setNewName('');
    numFieldRef.current?.focus();
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {team.collapsed && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          <Button size="small" onClick={() => onAdjustScore(teamKey, 1)}>
            +1 Goal
          </Button>
          <Button size="small" onClick={() => onAdjustScore(teamKey, -1)}>
            -1 Goal
          </Button>
          <Button size="small" onClick={() => onRecordCard(teamKey, null, 'yellow')}>
            Yellow Card
          </Button>
          <Button size="small" onClick={() => onRecordCard(teamKey, null, 'red')}>
            Red Card
          </Button>
        </Stack>
      )}
      {!team.collapsed && (
        <>
          <List sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {team.players.map((p) => (
              <PlayerRow
                key={p.id}
                player={p}
                log={log}
                selected={selectedPlayerId === p.id}
                onSelect={() => onSelectPlayer(p.id)}
                onRecordStat={(stat) => onRecordPlayerStat(teamKey, p.id, stat)}
                onRecordCard={(color) => onRecordCard(teamKey, p.id, color)}
                onSubIn={(position) => onSubIn(teamKey, p.id, position)}
                onSubOut={() => onSubOut(teamKey, p.id)}
              />
            ))}
          </List>
          <Stack direction="row" spacing={0.5} sx={{ mt: 1, alignItems: 'center', flexShrink: 0 }}>
            <TextField
              inputRef={numFieldRef}
              placeholder="#"
              type="text"
              inputMode="numeric"
              value={newNum}
              onChange={(e) => setNewNum(e.target.value.replace(/\D/g, ''))}
              onFocus={(e) => e.target.select()}
              size="small"
              sx={{ width: 56 }}
            />
            <TextField
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: 0 }}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={handleAdd}
              disabled={newNum.trim() === ''}
              sx={{ minWidth: 0, px: 1 }}
            >
              Add
            </Button>
          </Stack>
        </>
      )}
    </Box>
  );
}
