import { describe, expect, it } from 'vitest'
import { buildSlaFormPayload } from './slaForm'
import { getTablePreviewColumns } from './tablePreviewColumns'

const field = (...ids: string[]) => ({
  settings: { specific: { tableColumns: ids.map((id) => ({ id })) } },
})

describe('getTablePreviewColumns', () => {
  it("uses the form's column order, not the saved row's key order", () => {
    const rows = [
      { notifyUsers: ['a'], sendBy: ['Email'], after: 1, unit: 'Hours' },
    ]
    expect(
      getTablePreviewColumns(
        field('after', 'unit', 'notifyUsers', 'sendBy'),
        rows,
      ),
    ).toEqual(['after', 'unit', 'notifyUsers', 'sendBy'])
  })

  it('lists columns a row left empty, so cells stay under their headers', () => {
    const rows = [{ after: 1 }, { after: 2, unit: 'Days' }]
    expect(
      getTablePreviewColumns(field('after', 'unit', 'stage'), rows),
    ).toEqual(['after', 'unit', 'stage'])
  })

  it('keeps keys the form no longer has, after the form columns', () => {
    const rows = [{ after: 1, oldColumn: 'x' }, { newer: 'y' }]
    expect(getTablePreviewColumns(field('after'), rows)).toEqual([
      'after',
      'oldColumn',
      'newer',
    ])
  })

  it('falls back to the saved keys for a table with no column settings', () => {
    expect(getTablePreviewColumns({}, [{ b: 1, a: 2 }, { c: 3 }])).toEqual([
      'b',
      'a',
      'c',
    ])
    expect(getTablePreviewColumns(null, [])).toEqual([])
  })

  it('shows After and Time unit first for the SLA Steps table', () => {
    const steps = buildSlaFormPayload('SLA', '').panels[0].fields[2]
    const rows = [{ notifyUsers: ['a'], after: 1, unit: 'Minutes' }]
    expect(getTablePreviewColumns(steps as never, rows).slice(0, 3)).toEqual([
      'after',
      'unit',
      'notifyUsers',
    ])
  })
})
