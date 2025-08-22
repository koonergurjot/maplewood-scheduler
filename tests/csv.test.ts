import { describe, it, expect } from 'vitest';
import { parseCSV } from '../src/utils/csv';

describe('parseCSV', () => {
  it('handles quoted fields and escaped quotes', () => {
    const csv = `id,name
1,"Doe, John"
2,"Alice ""The Ace"""
`;
    const rows = parseCSV(csv);
    expect(rows).toEqual([
      { id: '1', name: 'Doe, John' },
      { id: '2', name: 'Alice "The Ace"' }
    ]);
  });
});
