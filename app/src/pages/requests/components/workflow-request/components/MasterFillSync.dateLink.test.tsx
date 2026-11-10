// @vitest-environment jsdom
import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import MasterFillSync from './MasterFillSync'

afterEach(cleanup)

const source = { id: 'start', label: 'Start date', type: 'DATE' }
const linked = (offset = 7) => ({
  id: 'due',
  label: 'Due date',
  type: 'DATE',
  settings: {
    specific: {
      dateDefaultValueType: 'PARENT_FIELD',
      parentDateFieldId: 'start',
      parentDateOffset: offset,
    },
  },
})

const renderSync = (
  props: Partial<React.ComponentProps<typeof MasterFillSync>>,
) => {
  const onChange = vi.fn()
  const view = renderWithProviders(
    <MasterFillSync
      allFields={[source, linked()]}
      field={linked()}
      formModel={{}}
      value=''
      onChange={onChange}
      {...props}
    />,
  )
  return { view, onChange }
}

describe('date link ("Copy the answer from another field" on a date field)', () => {
  it('starts with the other date plus the days set', () => {
    const { onChange } = renderSync({ formModel: { start: '2026-11-09' } })

    expect(onChange).toHaveBeenCalledWith('2026-11-16')
  })

  it('goes back with a negative number of days', () => {
    const field = linked(-3)
    const { onChange } = renderSync({
      allFields: [source, field],
      field,
      formModel: { start: '2026-11-09' },
    })

    expect(onChange).toHaveBeenCalledWith('2026-11-06')
  })

  it('waits while the other date is empty', () => {
    const { onChange } = renderSync({ formModel: { start: '' } })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps a date that is already saved on the request', () => {
    const { onChange } = renderSync({
      formModel: { start: '2026-11-09' },
      value: '2026-12-25',
    })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('follows the other date when it changes', () => {
    const { view, onChange } = renderSync({
      formModel: { start: '2026-11-09' },
      value: '2026-11-16',
    })
    expect(onChange).not.toHaveBeenCalled()

    view.rerender(
      <MasterFillSync
        allFields={[source, linked()]}
        field={linked()}
        formModel={{ start: '2026-12-01' }}
        value='2026-11-16'
        onChange={onChange}
      />,
    )

    expect(onChange).toHaveBeenCalledWith('2026-12-08')
  })

  it('does nothing when the form is view only', () => {
    const { onChange } = renderSync({
      formModel: { start: '2026-11-09' },
      readOnly: true,
    })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('does nothing when the other value is not a date', () => {
    const { onChange } = renderSync({ formModel: { start: 'Net 30' } })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('does nothing for a date field that does not use the link', () => {
    const plain = {
      id: 'due',
      label: 'Due date',
      type: 'DATE',
      settings: { specific: {} },
    }
    const { onChange } = renderSync({
      allFields: [source, plain],
      field: plain,
      formModel: { start: '2026-11-09' },
    })

    expect(onChange).not.toHaveBeenCalled()
  })
})
