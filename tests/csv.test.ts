import { describe, it, expect } from 'vitest';
import { parseCSV } from '../src/utils/csv';

describe('parseCSV', () => {
  it('parses simple CSV with headers', () => {
    const input = 'id,firstName,lastName\n1,John,Doe\n2,Jane,Smith';
    const rows = parseCSV(input);
    expect(rows).toEqual([
      { id: '1', firstName: 'John', lastName: 'Doe' },
      { id: '2', firstName: 'Jane', lastName: 'Smith' },
    ]);
  });

  it('handles quoted fields and commas', () => {
    const input = 'id,name\n1,"Doe, John"';
    const rows = parseCSV(input);
    expect(rows).toEqual([
      { id: '1', name: 'Doe, John' }
    ]);
  });

  it('preserves whitespace inside quoted fields', () => {
    const input = 'id,name\n1,"  John  "';
    const rows = parseCSV(input);
    expect(rows).toEqual([
      { id: '1', name: '  John  ' }
    ]);
  });

  it('handles embedded quotes', () => {
    const input = 'id,quote\n1,"She said ""Hello"""';
    const rows = parseCSV(input);
    expect(rows).toEqual([
      { id: '1', quote: 'She said "Hello"' }
    ]);
  });

  it('handles newlines within quoted fields', () => {
    const input = 'id,notes\n1,"Line1\nLine2"';
    const rows = parseCSV(input);
    expect(rows).toEqual([
      { id: '1', notes: 'Line1\nLine2' }
    ]);
  });
});

