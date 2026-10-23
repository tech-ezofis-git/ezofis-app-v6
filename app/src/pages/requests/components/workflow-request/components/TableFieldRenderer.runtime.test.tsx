/* eslint-disable perfectionist/sort-jsx-props, perfectionist/sort-objects */
// @vitest-environment jsdom
//
// Runtime verification of the REAL TableFieldRenderer (the table renderer used
// by New Request / WorkflowFormRenderer through FieldRenderer) in jsdom: each
// test renders the component, drives it like a user and reads what it emits as
// the form value.
import { addIcon } from '@iconify/react'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { validateFormModel } from '@/pages/form-builder/helpers/runtimeValidation'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import TableFieldRenderer from './TableFieldRenderer'

afterEach(cleanup)

// Icons load over the network in the app; register the one we assert on so it
// renders synchronously here.
addIcon('lucide:info', {
  body: '<circle cx="12" cy="12" r="10"/>',
  height: 24,
  width: 24,
})

type Row = Record<string, unknown>

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

const tableField = (
  columns: unknown[],
  specific: Record<string, unknown> = {},
) => ({
  id: 'f_tbl',
  label: 'Items',
  type: 'TABLE',
  settings: {
    general: {},
    specific: { tableColumns: columns, ...specific },
    validation: {},
  },
})

/** Stateful host: the real renderer plus the form-model value it round-trips. */
const Host = ({
  field,
  initial,
  readOnly,
  onValue,
}: {
  field: ReturnType<typeof tableField>
  initial?: Row[]
  readOnly?: boolean
  onValue?: (rows: Row[]) => void
}) => {
  const [value, setValue] = useState<Row[]>(initial ?? [{}])
  return (
    <TableFieldRenderer
      field={field}
      readOnly={readOnly}
      value={value}
      onChange={(rows) => {
        setValue(rows)
        onValue?.(rows)
      }}
    />
  )
}

const latest = () => {
  let rows: Row[] = []
  return {
    get rows() {
      return rows
    },
    set: (next: Row[]) => {
      rows = next
    },
  }
}

// Header toolbar: Export + Add Row (+ import / scan when enabled). Add Row is last.
const addRow = (container: HTMLElement) => {
  const buttons = container
    .querySelector('h4')!
    .parentElement!.parentElement!.querySelectorAll('button')
  fireEvent.click(buttons[buttons.length - 1])
}

const textboxes = () => screen.queryAllByRole('textbox') as HTMLInputElement[]

describe('A. General settings', () => {
  it('Display Label replaces the header; a HIDDEN column is not rendered', () => {
    renderWithProviders(
      <Host
        field={tableField([
          col('a', 'SHORT_TEXT', {}, {}, { displayLabel: 'Bill No' }),
          col('b', 'SHORT_TEXT', {}, {}, { visibility: 'HIDDEN' }),
        ])}
      />,
    )
    expect(screen.getByText('Bill No')).toBeTruthy()
    expect(screen.queryByText('b')).toBeNull()
  })

  it('Placeholder is shown in the cell input', () => {
    renderWithProviders(
      <Host
        field={tableField([
          col('a', 'SHORT_TEXT', { placeholder: 'Enter bill' }),
          col('n', 'NUMBER', { placeholder: 'Qty here' }),
        ])}
      />,
    )
    expect(screen.getByPlaceholderText('Enter bill')).toBeTruthy()
    expect(screen.getByPlaceholderText('Qty here')).toBeTruthy()
  })

  it('Tooltip text reaches the DOM beside the header', () => {
    const { container } = renderWithProviders(
      <Host
        field={tableField([
          col('a', 'SHORT_TEXT', {}, {}, { tooltip: 'Explain this' }),
        ])}
      />,
    )
    const th = container.querySelector('thead th:nth-child(2)')!
    // Either a native title attribute or an SVG <title> child shows a tooltip
    expect(th.innerHTML).toContain('Explain this')
  })

  it('Read-only visibility locks the cell (no editable input)', () => {
    renderWithProviders(
      <Host
        field={tableField([
          col('a', 'SHORT_TEXT', {}, {}, { visibility: 'READ_ONLY' }),
          col('b', 'SHORT_TEXT'),
        ])}
        initial={[{ a: 'locked value' }]}
      />,
    )
    expect(textboxes()).toHaveLength(1) // only column "b" is editable
    expect(screen.getByText('locked value')).toBeTruthy()
  })
})

describe('B. Defaults and rows', () => {
  const cols = [
    col('seq', 'COUNTER', { defaultValueType: 'AUTO_SEQUENCE' }),
    col('note', 'SHORT_TEXT', {
      customDefaultValue: 'n/a',
      defaultValueType: 'CUSTOM',
    }),
  ]

  it('Add Row applies custom and auto-sequence defaults', () => {
    const out = latest()
    const { container } = renderWithProviders(
      <Host
        field={tableField(cols)}
        initial={[{ note: 'kept', seq: 1 }]}
        onValue={out.set}
      />,
    )
    addRow(container)
    addRow(container)
    expect(out.rows).toHaveLength(3)
    expect(out.rows[1]).toMatchObject({ note: 'n/a', seq: 2 })
    expect(out.rows[2]).toMatchObject({ note: 'n/a', seq: 3 })
  })

  it('saved values are shown as saved, never replaced by defaults', () => {
    renderWithProviders(
      <Host
        field={tableField(cols)}
        initial={[{ note: 'saved note', seq: 41 }]}
      />,
    )
    expect(textboxes().some((i) => i.value === 'saved note')).toBe(true)
    expect(textboxes().some((i) => i.value === 'n/a')).toBe(false)
  })

  it('deleting the only row leaves a blank row carrying the defaults', () => {
    const out = latest()
    renderWithProviders(
      <Host
        field={tableField(cols)}
        initial={[{ note: 'x', seq: 1 }]}
        onValue={out.set}
      />,
    )
    fireEvent.click(screen.getByLabelText('Delete row'))
    expect(out.rows).toHaveLength(1)
    expect(out.rows[0]).toMatchObject({ note: 'n/a', seq: 1 })
  })

  it('a fixed-row table shows its configured row count and no Add Row', () => {
    const { container } = renderWithProviders(
      <Host
        field={tableField([col('a', 'SHORT_TEXT')], {
          fixedRowCount: 3,
          rowsType: 'FIXED',
        })}
        initial={[{}, {}, {}]}
      />,
    )
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3)
    expect(screen.queryAllByLabelText('Delete row')).toHaveLength(0)
  })
})

describe('C. Text and number columns', () => {
  it('max length trims typed text', () => {
    const out = latest()
    renderWithProviders(
      <Host
        field={tableField([col('code', 'SHORT_TEXT', {}, { maximum: 4 })])}
        onValue={out.set}
      />,
    )
    fireEvent.change(textboxes()[0], { target: { value: 'abcdefg' } })
    expect(out.rows[0].code).toBe('abcd')
  })

  it('Integer content rule does not accept a decimal point', () => {
    const out = latest()
    renderWithProviders(
      <Host
        field={tableField([col('q', 'NUMBER', {}, { contentRule: 'INTEGER' })])}
        onValue={out.set}
      />,
    )
    fireEvent.change(textboxes()[0], { target: { value: '12.5' } })
    expect(String(out.rows[0].q)).not.toContain('.')
  })

  it('Decimal digits limit the decimals typed', () => {
    const out = latest()
    renderWithProviders(
      <Host
        field={tableField([
          col('p', 'NUMBER', {}, { contentRule: 'DECIMAL', decimalDigits: 2 }),
        ])}
        onValue={out.set}
      />,
    )
    fireEvent.change(textboxes()[0], { target: { value: '1.2345' } })
    expect(String(out.rows[0].p)).toBe('1.23')
  })

  it('prefix and suffix are displayed while the stored value stays numeric', () => {
    renderWithProviders(
      <Host
        field={tableField([
          col('w', 'NUMBER', { prefixLabel: '$', suffixLabel: ' kg' }),
        ])}
        initial={[{ w: 7 }]}
      />,
    )
    expect(textboxes()[0].value).toBe('$7 kg')
  })

  it('Commas shows thousands separators', () => {
    renderWithProviders(
      <Host
        field={tableField([col('t', 'NUMBER', {}, { contentRule: 'COMMAS' })])}
        initial={[{ t: 1234567 }]}
      />,
    )
    expect(textboxes()[0].value).toBe('1,234,567')
  })

  it('max value clamps on blur; min value clamps on blur', () => {
    const out = latest()
    renderWithProviders(
      <Host
        field={tableField([
          col('n', 'NUMBER', {}, { maximum: 100, minimum: 10 }),
        ])}
        onValue={out.set}
      />,
    )
    fireEvent.change(textboxes()[0], { target: { value: '500' } })
    fireEvent.blur(textboxes()[0])
    expect(Number(out.rows[0].n)).toBe(100)
    fireEvent.change(textboxes()[0], { target: { value: '3' } })
    fireEvent.blur(textboxes()[0])
    expect(Number(out.rows[0].n)).toBe(10)
  })

  it('range read from another column limits the cell per row', () => {
    const out = latest()
    renderWithProviders(
      <Host
        field={tableField([
          col('limit', 'NUMBER'),
          col(
            'qty',
            'NUMBER',
            {},
            { maximumNumberField: 'limit', rangeType: 'MIN_FIXED_MAX_FLEX' },
          ),
        ])}
        initial={[{ limit: 10 }, { limit: 500 }]}
        onValue={out.set}
      />,
    )
    const inputs = textboxes()
    // inputs: [limit r1, qty r1, limit r2, qty r2]
    fireEvent.change(inputs[1], { target: { value: '50' } })
    fireEvent.blur(inputs[1])
    expect(Number(out.rows[0].qty)).toBe(10) // clamped to row 1's limit
    fireEvent.change(inputs[3], { target: { value: '50' } })
    fireEvent.blur(inputs[3])
    expect(Number(out.rows[1].qty)).toBe(50) // row 2 allows it
  })

  it('column totals sum the underlying numeric values', () => {
    renderWithProviders(
      <Host
        field={tableField([
          col('amt', 'NUMBER', { prefixLabel: '$', showColumnTotal: true }),
        ])}
        initial={[{ amt: 2 }, { amt: 3.5 }]}
      />,
    )
    const totalRow = screen.getByText('Total').closest('tr')!
    expect(within(totalRow).getByText('5.5')).toBeTruthy()
  })

  it('Calculated column Integer rule rounds the shown result', () => {
    renderWithProviders(
      <Host
        field={tableField([
          col('q', 'NUMBER'),
          col('p', 'NUMBER'),
          {
            ...col('t', 'CALCULATED', {}, { contentRule: 'INTEGER' }),
            settings: {
              general: {},
              specific: {
                formulaTokens: [
                  { type: 'FIELD', value: 'q' },
                  { type: 'OPERATOR', value: '*' },
                  { type: 'FIELD', value: 'p' },
                ],
              },
              validation: { contentRule: 'INTEGER' },
            },
          },
        ])}
        initial={[{ p: 1.25, q: 3 }]}
      />,
    )
    expect(screen.getByText('4')).toBeTruthy() // 3 x 1.25 = 3.75 -> 4
  })
})

describe('F. Choice columns', () => {
  it('a saved selection stays visible even when it is not in the option list', () => {
    renderWithProviders(
      <Host
        field={tableField([
          col('c', 'SINGLE_SELECT', { customOptions: 'A,B' }),
        ])}
        initial={[{ c: 'Saved Value' }]}
      />,
    )
    expect(screen.getAllByText('Saved Value').length).toBeGreaterThan(0)
  })

  it('a stored selection is shown for each row', () => {
    renderWithProviders(
      <Host
        field={tableField([
          col('c', 'SINGLE_SELECT', { customOptions: 'Red,Green' }),
        ])}
        initial={[{ c: 'Red' }, { c: 'Green' }]}
      />,
    )
    expect(screen.getAllByText('Red').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Green').length).toBeGreaterThan(0)
  })
})

const fileInputs = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll('input[type="file"]'),
  ) as HTMLInputElement[]

// Tables with an upload column use the expandable card view, which opens row 1
// itself; expand it only if it is collapsed.
const openFirstRow = () => {
  const expand = screen.queryAllByLabelText('Expand row')[0]
  if (expand) fireEvent.click(expand)
}

const pick = (input: HTMLInputElement, files: File[]) => {
  Object.defineProperty(input, 'files', { configurable: true, value: files })
  fireEvent.change(input)
}

describe('G. File columns', () => {
  const restricted = col(
    'doc',
    'FILE_UPLOAD',
    {},
    { allowedFileTypes: ['pdf'], maxFileSize: 1 },
  )

  it('the picker is limited to the allowed types', () => {
    const { container } = renderWithProviders(
      <Host field={tableField([restricted])} />,
    )
    openFirstRow()
    expect(fileInputs(container)[0].getAttribute('accept')).toBe('.pdf')
  })

  it('a disallowed file shows an error and is not accepted', () => {
    const out = latest()
    const { container } = renderWithProviders(
      <Host field={tableField([restricted])} onValue={out.set} />,
    )
    openFirstRow()
    pick(fileInputs(container)[0], [
      new File(['x'], 'virus.exe', { type: 'application/octet-stream' }),
    ])
    expect(screen.getByText(/virus\.exe/)).toBeTruthy()
    expect(out.rows.length === 0 || !out.rows[0].doc).toBe(true)
  })

  it('an oversized file is rejected with a clear message', () => {
    const out = latest()
    const { container } = renderWithProviders(
      <Host field={tableField([restricted])} onValue={out.set} />,
    )
    const big = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    Object.defineProperty(big, 'size', { value: 3 * 1024 * 1024 })
    openFirstRow()
    pick(fileInputs(container)[0], [big])
    expect(
      screen.getByText(/file size should not be more than 1 mb/),
    ).toBeTruthy()
    expect(out.rows.length === 0 || !out.rows[0].doc).toBe(true)
  })

  it('rejecting a file keeps the previously valid selection', () => {
    const out = latest()
    const { container } = renderWithProviders(
      <Host field={tableField([restricted])} onValue={out.set} />,
    )
    openFirstRow()
    pick(fileInputs(container)[0], [
      new File(['ok'], 'good.pdf', { type: 'application/pdf' }),
    ])
    expect((out.rows[0].doc as { fileName: string }).fileName).toBe('good.pdf')
    pick(fileInputs(container)[0], [
      new File(['bad'], 'bad.exe', { type: 'application/octet-stream' }),
    ])
    expect(screen.getByText(/bad\.exe/)).toBeTruthy()
    expect((out.rows[0].doc as { fileName: string }).fileName).toBe('good.pdf')
  })

  it('multiple files: several can be attached and one removed', () => {
    const out = latest()
    const { container } = renderWithProviders(
      <Host
        field={tableField([
          col('doc', 'FILE_UPLOAD', { allowMultipleFiles: true }),
        ])}
        onValue={out.set}
      />,
    )
    openFirstRow()
    pick(fileInputs(container)[0], [
      new File(['1'], 'a.pdf'),
      new File(['2'], 'b.pdf'),
    ])
    const names = (out.rows[0].doc as Array<{ fileName: string }>).map(
      (f) => f.fileName,
    )
    expect(names).toEqual(['a.pdf', 'b.pdf'])
    fireEvent.click(screen.getAllByLabelText('Remove file')[0])
    expect(
      (out.rows[0].doc as Array<{ fileName: string }>).map((f) => f.fileName),
    ).toEqual(['b.pdf'])
  })
})

describe('H. Conditional mandatory / read-only rules (per row)', () => {
  const rulesField = tableField([
    col(
      'state',
      'SHORT_TEXT',
      {},
      {
        mandatorySettings: [{ controls: ['note'], id: 'm1', value: 'Custom' }],
        readonlySettings: [{ controls: ['locked'], id: 'r1', value: 'Fixed' }],
      },
    ),
    col('note', 'SHORT_TEXT'),
    col('locked', 'SHORT_TEXT'),
  ])

  it('locks the controlled cell only in the row that matches, keeping its value', () => {
    renderWithProviders(
      <Host
        field={rulesField}
        initial={[
          { locked: 'kept 1', state: 'Fixed' },
          { locked: 'kept 2', state: 'Open' },
        ]}
      />,
    )
    // row 1 is locked (rendered as text), row 2 stays editable
    expect(screen.getByText('kept 1')).toBeTruthy()
    expect(textboxes().some((i) => i.value === 'kept 2')).toBe(true)
    expect(textboxes().some((i) => i.value === 'kept 1')).toBe(false)
  })

  it('unlocks as soon as the controlling value no longer matches', () => {
    renderWithProviders(
      <Host
        field={rulesField}
        initial={[{ locked: 'keep me', state: 'Fixed' }]}
      />,
    )
    expect(textboxes().some((i) => i.value === 'keep me')).toBe(false)
    const stateInput = textboxes().find((i) => i.value === 'Fixed')!
    fireEvent.change(stateInput, { target: { value: 'Open' } })
    expect(textboxes().some((i) => i.value === 'keep me')).toBe(true)
  })

  it('submission reports the row and column of a conditionally required cell', () => {
    const result = validateFormModel([{ id: 'p1', fields: [rulesField] }], {
      f_tbl: [
        { note: '', state: 'Custom' },
        { note: '', state: 'Open' },
      ],
    })
    expect(result.isValid).toBe(false)
    expect(result.fieldErrors.f_tbl).toEqual([
      'Row 1: note is required and cannot be empty',
    ])
  })
})
