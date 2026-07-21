export interface PositionInfo {
  value: number;
  abbr: string;
  label: string;
}

export const POSITIONS: PositionInfo[] = [
  { value: 1, abbr: 'G', label: 'Goalkeeper' },
  { value: 2, abbr: 'RB', label: 'Right Outside Back' },
  { value: 3, abbr: 'LB', label: 'Left Outside Back' },
  { value: 4, abbr: 'CB', label: 'Center Back' },
  { value: 5, abbr: 'CB', label: 'Center Back' },
  { value: 6, abbr: 'DM', label: 'Defensive Center Midfielder' },
  { value: 7, abbr: 'RW', label: 'Right Winger' },
  { value: 8, abbr: 'CM', label: 'Center Midfielder' },
  { value: 9, abbr: 'CF', label: 'Center Forward' },
  { value: 10, abbr: 'AM', label: 'Attacking Center Midfielder' },
  { value: 11, abbr: 'LW', label: 'Left Winger' },
];

function findPosition(position: number): PositionInfo | undefined {
  return POSITIONS.find((p) => p.value === position);
}

export function positionLabel(position: number | null): string | null {
  return position == null ? null : (findPosition(position)?.label ?? null);
}

export function positionAbbr(position: number | null): string | null {
  return position == null ? null : (findPosition(position)?.abbr ?? null);
}
