// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { vi, expect, test } from 'vitest';
import Analytics from '../src/Analytics';

// Mock chart components to avoid canvas requirement
vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Line: () => null,
}));

test('loading indicator disappears after fetch abort', async () => {
  global.fetch = vi.fn(() =>
    Promise.reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
  ) as any;

  render(<Analytics />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).toBeNull();
  });
});
