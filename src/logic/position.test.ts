import { describe, it, expect } from 'vitest';
import { POSITIONS, positionLabel, positionAbbr } from './position';

describe('POSITIONS', () => {
  it('lists all 11 traditional position numbers in order', () => {
    expect(POSITIONS.map((p) => p.value)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});

describe('positionLabel', () => {
  it('labels every position value 1-11 (U.S. Soccer position names)', () => {
    expect(positionLabel(1)).toBe('Goalkeeper');
    expect(positionLabel(2)).toBe('Right Outside Back');
    expect(positionLabel(3)).toBe('Left Outside Back');
    expect(positionLabel(4)).toBe('Center Back');
    expect(positionLabel(5)).toBe('Center Back');
    expect(positionLabel(6)).toBe('Defensive Center Midfielder');
    expect(positionLabel(7)).toBe('Right Winger');
    expect(positionLabel(8)).toBe('Center Midfielder');
    expect(positionLabel(9)).toBe('Center Forward');
    expect(positionLabel(10)).toBe('Attacking Center Midfielder');
    expect(positionLabel(11)).toBe('Left Winger');
  });

  it('returns null for a null position', () => {
    expect(positionLabel(null)).toBeNull();
  });
});

describe('positionAbbr', () => {
  it('abbreviates every position value 1-11', () => {
    expect(positionAbbr(1)).toBe('G');
    expect(positionAbbr(2)).toBe('RB');
    expect(positionAbbr(3)).toBe('LB');
    expect(positionAbbr(4)).toBe('CB');
    expect(positionAbbr(5)).toBe('CB');
    expect(positionAbbr(6)).toBe('DM');
    expect(positionAbbr(7)).toBe('RW');
    expect(positionAbbr(8)).toBe('CM');
    expect(positionAbbr(9)).toBe('CF');
    expect(positionAbbr(10)).toBe('AM');
    expect(positionAbbr(11)).toBe('LW');
  });

  it('returns null for a null position', () => {
    expect(positionAbbr(null)).toBeNull();
  });
});
