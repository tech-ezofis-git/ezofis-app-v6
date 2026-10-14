import { describe, expect, it } from 'vitest'
import { getTableFieldErrors } from './runtimeValidation'

const col = (
  id: string,
  type: string,
  specific: Record<string, unknown> = {},
  validation: Record<string, unknown> = {},
) => ({ id, label: id, name: id, type, settings: { specific, validation } })

const table = (columns: unknown[], id = 'f_tbl', label = 'Items') => ({
  id,
  label,
  type: 'TABLE',
  settings: { specific: { tableColumns: columns } },
})

const panelsOf = (...fields: unknown[]) => [{ fields, id: 'p1' }]

describe('getTableFieldErrors (what blocks a New Request submit)', () => {
  const t = table([
    col('qty', 'NUMBER', {}, { maximum: 10 }),
    col('code', 'SHORT_TEXT', {}, { contentRule: 'ALPHA' }),
  ])

  it('reports invalid table cells with the table name, row and column', () => {
    const errors = getTableFieldErrors(panelsOf(t), {
      f_tbl: [{ code: 'ab', qty: 50 }],
    })
    expect(errors).toEqual(['Items: Row 1: qty should not be more than 10'])
  })

  it('is empty for a valid table and for a table with no rules', () => {
    expect(
      getTableFieldErrors(panelsOf(t), { f_tbl: [{ code: 'ab', qty: 5 }] }),
    ).toEqual([])
    expect(
      getTableFieldErrors(panelsOf(table([col('a', 'SHORT_TEXT')])), {
        f_tbl: [{ a: 'x' }],
      }),
    ).toEqual([])
  })

  it('does not include errors from fields that are not tables', () => {
    const badEmail = {
      id: 'f_mail',
      label: 'Email',
      type: 'SHORT_TEXT',
      settings: { specific: {}, validation: { contentRule: 'EMAIL' } },
    }
    expect(
      getTableFieldErrors(panelsOf(badEmail, t), {
        f_mail: 'not an email',
        f_tbl: [{ code: 'ab', qty: 5 }],
      }),
    ).toEqual([])
  })

  it('covers every kind of table rule: required column, conditional rule, file type', () => {
    const rich = table([
      col(
        'type',
        'SHORT_TEXT',
        {},
        {
          mandatorySettings: [{ controls: ['note'], id: 'm', value: 'Custom' }],
        },
      ),
      col('note', 'SHORT_TEXT'),
      col('doc', 'FILE_UPLOAD', {}, { allowedFileTypes: ['pdf'] }),
    ])
    const errors = getTableFieldErrors(panelsOf(rich), {
      f_tbl: [
        { doc: { fileName: 'a.exe' }, note: '', type: 'Custom' },
        { doc: { fileName: 'b.pdf' }, note: 'ok', type: 'Custom' },
      ],
    })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('Row 1: note is required and cannot be empty')
    expect(errors[0]).toContain('Row 1: doc should be a pdf file')
  })

  it('a hidden or read-only table is never blocking', () => {
    const hidden = {
      ...t,
      settings: {
        ...t.settings,
        general: { visibility: 'HIDDEN' },
      },
    }
    expect(
      getTableFieldErrors(panelsOf(hidden), {
        f_tbl: [{ code: 'ab', qty: 50 }],
      }),
    ).toEqual([])
  })
})
