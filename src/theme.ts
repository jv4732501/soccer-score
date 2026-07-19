import { createTheme, type Theme } from '@mui/material/styles';

export function createAppTheme(mode: 'light' | 'dark'): Theme {
  return createTheme({ palette: { mode } });
}
