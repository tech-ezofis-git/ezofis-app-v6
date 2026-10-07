import { describe, expect, it } from 'vitest'
import {
  buildQualifierViewModel,
  dedupeQualifierRows,
} from './qualifierResultUtils'

const excludedRow = (item: string, reason: string) => ({
  Item: item,
  Reason: reason,
})

const excludedRows = [
  excludedRow('Visionplus power supply', 'Included only when detector'),
  excludedRow('Car door panel adaptor(s)', 'Panel adapter is only required'),
  excludedRow(
    'Universal car door panel(s)',
    'RFQ excerpt does not explicitly mention',
  ),
]

describe('buildQualifierViewModel excluded items', () => {
  it('renders one excluded table when the form repeats that table', () => {
    const result = {
      'Confidence': 42,
      'Excluded Items': [...excludedRows, ...excludedRows],
      'Qualify': 'Needs Review',
    }
    const tableFields = [
      { id: 'excluded-a', label: 'Excluded Items', type: 'TABLE' },
      { id: 'excluded-b', label: 'Excluded Items', type: 'TABLE' },
    ]

    const view = buildQualifierViewModel(result, [], tableFields)
    const excluded = view.tables.filter((table) =>
      table.label.toLowerCase().includes('exclud'),
    )

    expect(excluded).toHaveLength(1)
    expect(excluded[0]?.rows).toHaveLength(excludedRows.length)
  })

  it('does not add an alias key as a second excluded table', () => {
    const result = {
      'Excluded Items': excludedRows,
      'Excluded Items Summary': 'These parts are outside the detector package.',
      'excluded_items': excludedRows,
    }
    const tableFields = [
      { id: 'excluded-a', label: 'Excluded Items', type: 'TABLE' },
    ]

    const view = buildQualifierViewModel(result, [], tableFields)
    const excluded = view.tables.filter((table) =>
      table.label.toLowerCase().includes('exclud'),
    )

    expect(excluded).toHaveLength(1)
    expect(view.tables).toHaveLength(1)
    expect(excluded[0]?.rows).toHaveLength(excludedRows.length)
    const scalarValues = [
      view.titleEntry?.value,
      ...view.metaEntries.map((entry) => entry.value),
      ...view.longTextEntries.map((entry) => entry.value),
    ]
    expect(
      scalarValues.some((value) => String(value).includes('detector package')),
    ).toBe(true)
  })

  it('keeps matched items separate from excluded items', () => {
    const result = {
      'Excluded Items': excludedRows,
      'Matched Items': [excludedRow('Detector', 'In catalog')],
    }
    const tableFields = [
      { id: 'matched', label: 'Matched Items', type: 'TABLE' },
      { id: 'excluded', label: 'Excluded Items', type: 'TABLE' },
    ]

    const view = buildQualifierViewModel(result, [], tableFields)

    expect(view.tables.map((table) => table.label).sort()).toEqual([
      'Excluded Items',
      'Matched Items',
    ])
  })
})

describe('dedupeQualifierRows', () => {
  it('collapses rows that show the same column values', () => {
    const columns = [
      { id: 'item-id', name: 'Item' },
      { id: 'reason-id', name: 'Reason' },
    ]
    const rows = [
      {
        'item-id': 'Visionplus power supply',
        'reason-id': 'Included only when detector',
      },
      {
        Item: 'Visionplus power supply',
        Reason: 'Included only when detector',
      },
      {
        'item-id': 'Car door panel adaptor(s)',
        'reason-id': 'Panel adapter is only required',
      },
    ]

    expect(dedupeQualifierRows(rows, columns)).toHaveLength(2)
  })
})
