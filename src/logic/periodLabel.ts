import type { Period } from './types';

const LABELS: Record<Period, string> = {
  1: 'Half 1',
  2: 'Half 2',
  ET1: 'Extra Time 1',
  ET2: 'Extra Time 2',
  shootout: 'Shootout',
};

export function periodLabel(period: Period): string {
  return LABELS[period];
}
