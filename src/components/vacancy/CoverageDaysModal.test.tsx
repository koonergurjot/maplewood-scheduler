import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CoverageDaysModal } from './CoverageDaysModal'

describe('CoverageDaysModal', () => {
  it('renders dates and saves selection', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(
      <CoverageDaysModal
        open
        role="HCA"
        startDate="2025-09-01"
        endDate="2025-09-03"
        initialSelected={['2025-09-01','2025-09-02','2025-09-03']}
        onSave={onSave}
        onClose={onClose}
      />
    )
    const modal = screen.getByTestId('coverage-days-modal')
    // Uncheck the middle day
    const day = screen.getByTestId('coverage-date-2025-09-02')
    const checkbox = within(day).getByRole('checkbox')
    await userEvent.click(checkbox)

    await userEvent.click(screen.getByTestId('coverage-save'))
    expect(onSave).toHaveBeenCalledWith(['2025-09-01','2025-09-03'])
  })

  it('blocks save when nothing selected', async () => {
    const onSave = vi.fn()
    render(
      <CoverageDaysModal
        open
        role="RN"
        startDate="2025-09-01"
        endDate="2025-09-01"
        initialSelected={[]}
        onSave={onSave}
        onClose={() => {}}
      />
    )
    await userEvent.click(screen.getByTestId('coverage-save'))
    expect(screen.getByTestId('coverage-error')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })
})
