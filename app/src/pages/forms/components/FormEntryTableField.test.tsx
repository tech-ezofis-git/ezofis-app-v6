/* eslint-disable perfectionist/sort-objects */
// @vitest-environment jsdom
//
// Form Entry tables: the real runtime table renderer driven through the entry's
// JSON-string storage, plus the validation the entry save runs on that value.
import { addIcon } from '@iconify/react'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Question } from '@/pages/form-builder/store/formStore'
import { validateFormModel } from '@/pages/form-builder/helpers/runtimeValidation'
import {
  parseTableRows,
  serializeTableRows,
  withParsedTableValues,
} from '@/pages/form-builder/helpers/tableEntryValue'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import FormEntryTableField from './FormEntryTableField'

addIcon('lucide:x', { body: '<path d="M0 0"/>', height: 24, width: 24 })

afterEach(cleanup)

const col = (
  id: string,
  type: string,
  specific: Record<string, unknown> = {},
  validation: Record<string, unknown> = {},
  general: Record<string, unknown> = {},
) => ({
  id,
  name: id,
  label: id,
  type,
  size: 'MEDIUM',
  settings: { general, specific, validation },
})

const field = {
  id: 'f_tbl',
  label: 'Expenses',
  type: 'TABLE',
  settings: {
    general: {},
    specific: {
      tableColumns: [
        col(
          'bill',
          'SHORT_TEXT',
          { placeholder: 'Bill no' },
          { maximum: 5 },
          {
            displayLabel: 'Bill No',
          },
        ),
        col('qty', 'NUMBER', { prefixLabel: '#' }, { maximum: 10 }),
        col('secret', 'SHORT_TEXT', {}, {}, { visibility: 'HIDDEN' }),
      ],
    },
    validation: {},
  },
}

const Host = ({
  initial,
  onSaved,
}: {
  initial: string
  onSaved?: (serialized: string) => void
}) => {
  const [value, setValue] = useState(initial)
  return (
    <FormEntryTableField
      field={field as unknown as Question}
      value={value}
      onChange={(next) => {
        setValue(next)
        onSaved?.(next)
      }}
    />
  )
}

describe('Form Entry table field', () => {
  it('shows column settings: display label, placeholder, prefix, hidden column', () => {
    renderWithProviders(
      <Host initial={JSON.stringify([{ bill: 'A1', qty: 4 }])} />,
    )
    expect(screen.getByText('Bill No')).toBeTruthy()
    expect(screen.getByPlaceholderText('Bill no')).toBeTruthy()
    expect(screen.queryByText('secret')).toBeNull()
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
    expect(inputs.some((i) => i.value === '#4')).toBe(true)
  })

  it('loads the saved JSON-string value and shows its rows', () => {
    renderWithProviders(
      <Host initial={JSON.stringify([{ bill: 'AAA' }, { bill: 'BBB' }])} />,
    )
    const values = (screen.getAllByRole('textbox') as HTMLInputElement[]).map(
      (i) => i.value,
    )
    expect(values).toContain('AAA')
    expect(values).toContain('BBB')
  })

  it('edits are enforced (max length) and saved back as a JSON string', () => {
    let saved = ''
    renderWithProviders(
      <Host
        initial={JSON.stringify([{ bill: 'A1' }])}
        onSaved={(s) => {
          saved = s
        }}
      />,
    )
    const input = (screen.getAllByRole('textbox') as HTMLInputElement[]).find(
      (i) => i.value === 'A1',
    )!
    fireEvent.change(input, { target: { value: 'ABCDEFGHI' } })
    expect(typeof saved).toBe('string')
    expect(JSON.parse(saved)[0].bill).toBe('ABCDE') // trimmed to max 5
  })

  it('empty or missing values show a single blank row, and saved values load again', () => {
    const { unmount } = renderWithProviders(<Host initial='' />)
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0)
    unmount()
    const round = serializeTableRows([{ bill: 'X1', qty: 2 }])
    renderWithProviders(<Host initial={round} />)
    expect(
      (screen.getAllByRole('textbox') as HTMLInputElement[]).some(
        (i) => i.value === 'X1',
      ),
    ).toBe(true)
  })
})

describe('Form Entry value handling and save validation', () => {
  it('parses stored strings, arrays and junk into rows', () => {
    expect(parseTableRows('[{"a":1}]')).toEqual([{ a: 1 }])
    expect(parseTableRows([{ a: 1 }])).toEqual([{ a: 1 }])
    expect(parseTableRows('')).toEqual([])
    expect(parseTableRows('not json')).toEqual([])
    expect(parseTableRows('[bad')).toEqual([])
  })

  it('serializing drops attached File objects but keeps the file name and size', () => {
    const out = serializeTableRows([
      {
        doc: {
          fileName: 'a.pdf',
          fileSize: 12,
          rawFile: new File(['x'], 'a.pdf'),
        },
      },
    ])
    expect(out).not.toContain('rawFile')
    expect(JSON.parse(out)[0].doc).toEqual({ fileName: 'a.pdf', fileSize: 12 })
  })

  it('column rules are checked on the entry value even though it is a JSON string', () => {
    const panels = [{ fields: [field], id: 'p1' }]
    const stored = JSON.stringify([{ bill: 'A1', qty: 50 }])
    // before parsing, a string value skipped every column rule
    expect(validateFormModel(panels, { f_tbl: stored }).isValid).toBe(true)
    const parsed = withParsedTableValues(panels, { f_tbl: stored })
    const result = validateFormModel(panels, parsed)
    expect(result.isValid).toBe(false)
    expect(result.errors.f_tbl).toBe('Row 1: qty should not be more than 10')
  })

  it('non-table values are left untouched', () => {
    const panels = [{ fields: [field], id: 'p1' }]
    expect(withParsedTableValues(panels, { other: '[1,2]' })).toEqual({
      other: '[1,2]',
    })
  })
})
