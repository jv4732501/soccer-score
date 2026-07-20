import { describe, it, expect } from 'vitest';
import { periodLabel } from './periodLabel';

describe('periodLabel', () => {
  it('labels every period value', () => {
    expect(periodLabel(1)).toBe('Half 1');
    expect(periodLabel(2)).toBe('Half 2');
    expect(periodLabel('ET1')).toBe('Extra Time 1');
    expect(periodLabel('ET2')).toBe('Extra Time 2');
    expect(periodLabel('shootout')).toBe('Shootout');
  });
});
