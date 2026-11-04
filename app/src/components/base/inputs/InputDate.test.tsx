// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import InputDate from './InputDate'

afterEach(cleanup)

const renderDate = (value: string | null) => {
  const onChange = vi.fn()
  const { container } = renderWithProviders(
    <InputDate label='Invoice Date' value={value} onChange={onChange} />,
  )
  return { input: container.querySelector('input')!, onChange }
}

describe('InputDate with OCR-style values', () => {
  it('shows a day-first date instead of "Invalid Date"', () => {
    const { input } = renderDate('15/10/2026')
    expect(input.value).toBe('15-Oct-2026')
  })

  it.each(['Net 30', 'Invalid Date', 'CUSTOM'])(
    'shows %j as empty, not "Invalid Date"',
    (value) => {
      const { input } = renderDate(value)
      expect(input.value).toBe('')
    },
  )

  it('still lets a date be picked after a bad value', async () => {
    const { input, onChange } = renderDate('Net 30')
    fireEvent.focus(input)
    fireEvent.click(input)
    const day = (await screen.findAllByText('15')).find((el) =>
      el.closest('table'),
    )
    expect(day).toBeDefined()
    fireEvent.click(day!)
    expect(onChange).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-15$/),
    )
  })
})
