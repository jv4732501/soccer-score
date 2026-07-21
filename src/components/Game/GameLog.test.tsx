// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameLog } from './GameLog';
import type { LogEntry } from '../../logic/types';

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 1,
    period: 1,
    clockText: '10:23',
    team: 'teamA',
    playerId: null,
    type: 'corner',
    detail: 'Lions corner',
    rev: null,
    ...overrides,
  };
}

describe('GameLog', () => {
  it('shows a placeholder when there is no activity yet', () => {
    render(<GameLog log={[]} />);
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });

  it('renders entries most-recent-first with clock, period, and detail', () => {
    render(
      <GameLog
        log={[
          entry({ id: 1, clockText: '10:00', period: 1, detail: 'Lions corner' }),
          entry({ id: 2, clockText: '5:00', period: 2, detail: 'Tigers offside' }),
        ]}
      />,
    );
    const items = screen.getAllByText(/—/);
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('5:00 Half 2 — Tigers offside');
    expect(items[1]).toHaveTextContent('10:00 Half 1 — Lions corner');
  });
});
