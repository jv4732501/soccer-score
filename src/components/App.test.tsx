// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the Teams tab by default and can switch to Setup', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Teams' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Setup' }));
    expect(screen.getByText(/coming in the next update/i)).toBeInTheDocument();
  });
});
