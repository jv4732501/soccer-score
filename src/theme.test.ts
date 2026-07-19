import { describe, it, expect } from 'vitest';
import { createAppTheme } from './theme';

describe('createAppTheme', () => {
  it('creates a dark-mode theme', () => {
    expect(createAppTheme('dark').palette.mode).toBe('dark');
  });

  it('creates a light-mode theme', () => {
    expect(createAppTheme('light').palette.mode).toBe('light');
  });
});
