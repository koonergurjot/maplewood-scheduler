/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorBoundary from '../src/components/ErrorBoundary';

function ProblemChild() {
  throw new Error('Test error');
}

describe('ErrorBoundary', () => {
  it('renders fallback UI when a child throws', () => {
    const log = vi.fn();
    const { getByRole } = render(
      <ErrorBoundary onError={log}>
        <ProblemChild />
      </ErrorBoundary>
    );
    expect(getByRole('alert').textContent).toContain('Something went wrong.');
    expect(log).toHaveBeenCalled();
  });
});
