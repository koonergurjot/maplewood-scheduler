import { describe, it, expect } from 'vitest';
import { parseCSV } from '../src/utils/csv';

describe('parseCSV', () => {
  it('handles quoted fields and escaped quotes', () => {
    const csv = 'id,name\n1,"Doe, John"\n2,"Alice ""The Ace"""';
    const rows = parseCSV(csv);
    expect(rows).toEqual([
      { id: '1', name: 'Doe, John' },
      { id: '2', name: 'Alice "The Ace"' }
    ]);
  });

  it('trims whitespace and skips blank lines', () => {
    const csv = 'id,name\n1, John \n\n2, Alice\n';
    const rows = parseCSV(csv);
    expect(rows).toEqual([
      { id: '1', name: 'John' },
      { id: '2', name: 'Alice' }
    ]);
  });
});

