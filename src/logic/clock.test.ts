import { describe, it, expect } from 'vitest';
import { formatClock, parseClock } from './clock';

describe('formatClock', () => {
  it('formats whole minutes and seconds as M:SS', () => {
    expect(formatClock(125)).toBe('2:05');
  });

  it('pads single-digit seconds', () => {
    expect(formatClock(61)).toBe('1:01');
  });

  it('clamps negative input to 0:00', () => {
    expect(formatClock(-5)).toBe('0:00');
  });

  it('floors fractional seconds', () => {
    expect(formatClock(59.9)).toBe('0:59');
  });
});

describe('parseClock', () => {
  it('parses M:SS into total seconds', () => {
    expect(parseClock('2:05')).toBe(125);
  });

  it('returns null for malformed input', () => {
    expect(parseClock('not a clock')).toBeNull();
  });

  it('returns null when seconds are 60 or more', () => {
    expect(parseClock('1:60')).toBeNull();
  });
});
