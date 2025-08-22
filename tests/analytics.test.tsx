// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { vi, expect, test } from 'vitest';
import Analytics, { controllerRef } from '../src/Analytics';

// Mock chart components to avoid canvas requirement
vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Line: () => null,
}));

test('controller cleared after successful load', async () => {
  const mockData = [
    { period: '2023', posted: 1, awarded: 1, cancelled: 0, cancellationRate: 0, overtime: 0 }
  ];
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) })
  ) as any;

  render(<Analytics />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).toBeNull();
  });

  expect(controllerRef.current).toBeNull();
});

test('controller cleared after fetch abort', async () => {
  global.fetch = vi.fn(() =>
    Promise.reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
  ) as any;

  render(<Analytics />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).toBeNull();
  });

  expect(controllerRef.current).toBeNull();
});
