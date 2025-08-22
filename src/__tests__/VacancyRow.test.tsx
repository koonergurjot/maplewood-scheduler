import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VacancyRow, type Employee, type Vacancy } from '../App';
import type { ComponentProps } from 'react';

describe('VacancyRow', () => {
  const employees: Employee[] = [
    { id: '1', firstName: 'Alice', lastName: 'Smith', classification: 'RCA', status: 'FT', seniorityRank: 1, active: true },
    { id: '2', firstName: 'Bob', lastName: 'Jones', classification: 'LPN', status: 'FT', seniorityRank: 2, active: true },
  ];

  const vacancy: Vacancy = {
    id: 'v1',
    reason: 'Vacation',
    classification: 'RCA',
    wing: 'Shamrock',
    shiftDate: '2024-06-01',
    shiftStart: '07:00',
    shiftEnd: '15:00',
    knownAt: '2024-05-01T08:00:00',
    offeringStep: 'Casuals',
    status: 'Open',
  };

  function setup(props: Partial<ComponentProps<typeof VacancyRow>> = {}) {
    return render(
      <table><tbody>
        <VacancyRow
          v={vacancy}
          recId="1"
          recName="Alice Smith"
          employees={employees}
          countdownLabel="1h"
          countdownClass=""
          isDueNext={false}
          onAward={() => {}}
          onResetKnownAt={() => {}}
          {...props}
        />
      </tbody></table>
    );
  }

  afterEach(() => cleanup());

  it('renders vacancy information', () => {
    setup();
    expect(screen.getByText('Alice Smith')).toBeTruthy();
    expect(screen.getByText('Award')).toBeTruthy();
  });

  it('calls onAward when selecting recommended employee', () => {
    const onAward = vi.fn();
    setup({ onAward });
    const input = screen.getByPlaceholderText(/Type name or ID/);
    fireEvent.change(input, { target: { value: 'Alice' } });
    const items = screen.getAllByText(/Alice Smith/);
    fireEvent.click(items[items.length - 1]);
    fireEvent.click(screen.getByText('Award'));
    expect(onAward).toHaveBeenCalledWith({ empId: '1', reason: undefined, overrideUsed: false });
  });

  it('requires reason when choosing different employee', () => {
    const onAward = vi.fn();
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    setup({ onAward });
    const input = screen.getByPlaceholderText(/Type name or ID/);
    fireEvent.change(input, { target: { value: 'Bob' } });
    const item = screen.getByText(/Bob Jones/);
    fireEvent.click(item);
    fireEvent.click(screen.getByText('Award'));
    expect(alertMock).toHaveBeenCalled();
    expect(onAward).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });
});
