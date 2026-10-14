import { describe, expect, it } from 'vitest'
import { formatRuntimeFieldDisplayValue } from './runtimeFieldAdapter'
import { validateFieldValue } from './runtimeValidation'
import {
  addFilesToValue,
  buildColumnOcrHints,
  getColumnOcrTargets,
  getStoredFilesError,
  isMultiFileColumn,
  mapOcrToRowPatch,
  removeFileFromValue,
  toFileList,
} from './tableColumnFiles'
import { normalizeV5FormJson, serializeFormPayload } from './v5SchemaAdapter'

const MB = 1024 * 1024

const col = (
  id: string,
  type: string,
  specific: Record<string, unknown> = {},
  validation: Record<string, unknown> = {},
) => ({ id, label: id, name: id, type, settings: { specific, validation } })

const multi = col('f', 'FILE_UPLOAD', { allowMultipleFiles: true })
const single = col('f', 'FILE_UPLOAD')
const entry = (fileName: string, fileSize = 10) => ({ fileName, fileSize })

const table = (columns: unknown[]) => ({
  id: 'f_tbl',
  label: 'Docs',
  type: 'TABLE',
  settings: { specific: { tableColumns: columns } },
})

describe('Batch 7: multiple files in a cell', () => {
  it('only columns with allowMultipleFiles accept several', () => {
    expect(isMultiFileColumn(multi)).toBe(true)
    expect(isMultiFileColumn(single)).toBe(false)
    expect(
      isMultiFileColumn(col('f', 'FILE_UPLOAD', { allowMultipleFiles: false })),
    ).toBe(false)
  })

  it('reads a cell as a list whether it holds none, one object, a list or a name', () => {
    expect(toFileList(undefined)).toEqual([])
    expect(toFileList(null)).toEqual([])
    expect(toFileList([])).toEqual([])
    expect(toFileList(entry('a.pdf'))).toEqual([entry('a.pdf')])
    expect(toFileList([entry('a.pdf'), entry('b.pdf')])).toHaveLength(2)
    expect(toFileList('c.pdf')).toEqual([{ fileName: 'c.pdf' }])
  })

  it('multi column appends picks and skips a file that is already attached', () => {
    const first = addFilesToValue(multi, undefined, [entry('a.pdf')])
    expect(first).toEqual([entry('a.pdf')])
    const second = addFilesToValue(multi, first, [
      entry('a.pdf'),
      entry('b.pdf', 20),
    ])
    expect(second).toEqual([entry('a.pdf'), entry('b.pdf', 20)])
  })

  it('a legacy single object in a multi column is kept as the first file', () => {
    expect(
      addFilesToValue(multi, entry('old.pdf'), [entry('new.pdf')]),
    ).toEqual([entry('old.pdf'), entry('new.pdf')])
  })

  it('single column keeps the old behaviour: the newest file replaces the value', () => {
    expect(
      addFilesToValue(single, entry('old.pdf'), [entry('new.pdf')]),
    ).toEqual(entry('new.pdf'))
    expect(addFilesToValue(single, entry('old.pdf'), [])).toEqual(
      entry('old.pdf'),
    )
  })

  it('removing files: multi keeps the rest, empties to null; single clears', () => {
    const list = [entry('a.pdf'), entry('b.pdf')]
    expect(removeFileFromValue(multi, list, 0)).toEqual([entry('b.pdf')])
    expect(removeFileFromValue(multi, [entry('a.pdf')], 0)).toBeNull()
    expect(removeFileFromValue(single, entry('a.pdf'), 0)).toBeNull()
  })

  it('read-only display lists the file names', () => {
    expect(
      formatRuntimeFieldDisplayValue([entry('a.pdf'), entry('b.pdf')], multi),
    ).toBe('a.pdf, b.pdf')
    expect(formatRuntimeFieldDisplayValue(entry('a.pdf'), single)).toBe('a.pdf')
  })
})

describe('Batch 7: validation of every file in a cell', () => {
  const restricted = col(
    'f',
    'FILE_UPLOAD',
    { allowMultipleFiles: true },
    { allowedFileTypes: ['pdf'], maxFileSize: 1 },
  )

  it('rejects the first bad file in a list and names it', () => {
    const t = table([restricted])
    expect(
      validateFieldValue(t, [{ f: [entry('a.pdf', 100), entry('b.exe', 100)] }])
        .error,
    ).toBe('Row 1: f should be a pdf file (b.exe)')
    expect(
      validateFieldValue(t, [
        { f: [entry('a.pdf', 100), entry('big.pdf', 2 * MB)] },
      ]).error,
    ).toBe('Row 1: f file size should not be more than 1 mb (big.pdf)')
  })

  it('accepts a list where every file is fine, and an empty list', () => {
    const t = table([restricted])
    expect(
      validateFieldValue(t, [{ f: [entry('a.pdf'), entry('b.pdf')] }]).isValid,
    ).toBe(true)
    expect(validateFieldValue(t, [{ f: [] }]).isValid).toBe(true)
  })

  it('a single object still reports the original message without a file name', () => {
    expect(getStoredFilesError(restricted, entry('a.exe'))).toBe(
      'should be a pdf file',
    )
  })

  it('a required multi-file column is empty until a file is attached', () => {
    const required = table([
      col('note', 'SHORT_TEXT'),
      col(
        'f',
        'FILE_UPLOAD',
        { allowMultipleFiles: true },
        { fieldRule: 'REQUIRED' },
      ),
    ])
    // (a row needs another filled cell, or the whole table counts as empty)
    expect(validateFieldValue(required, [{ f: [], note: 'x' }]).errors).toEqual(
      ['Row 1: f is required and cannot be empty'],
    )
    expect(
      validateFieldValue(required, [{ f: [entry('a.pdf')], note: 'x' }])
        .isValid,
    ).toBe(true)
  })
})

describe('Batch 7: fill other columns from the document (uploadForOcr)', () => {
  const siblings = [
    col('bill', 'SHORT_TEXT'),
    col('merchant', 'SHORT_TEXT'),
    col('total', 'NUMBER'),
    col('when', 'DATE'),
    col('calc', 'CALCULATED'),
    col('other', 'FILE_UPLOAD'),
  ]
  const upload = col(
    'upload',
    'FILE_UPLOAD',
    {},
    {
      assignOtherControls: [
        'bill',
        'merchant',
        'total',
        'calc',
        'other',
        'ghost',
        'upload',
      ],
    },
  )

  it('targets are the selected sibling columns that can hold text', () => {
    const targets = getColumnOcrTargets(upload, [...siblings, upload])
    expect(targets.map((t) => t.id)).toEqual(['bill', 'merchant', 'total'])
  })

  it('no selection means no targets (and no OCR call)', () => {
    expect(getColumnOcrTargets(single, siblings)).toEqual([])
  })

  it('field list passed to uploadForOcr is "Name,TYPE" for the selected columns', () => {
    const targets = getColumnOcrTargets(upload, siblings)
    expect(buildColumnOcrHints(targets)).toEqual([
      'bill,SHORT_TEXT',
      'merchant,SHORT_TEXT',
      'total,NUMBER',
    ])
  })

  it('maps OCR values to the matching selected columns of the row only', () => {
    const targets = getColumnOcrTargets(upload, siblings)
    const patch = mapOcrToRowPatch(
      targets,
      [
        { name: 'Bill', value: 'B-100' },
        { name: 'MERCHANT,SHORT_TEXT', value: 'Acme' },
        { name: 'total', value: 42.5 },
        { name: 'when', value: '2026-01-01' }, // not selected
        { name: 'bill', value: '' }, // blank is ignored
        { name: 'unknown', value: 'x' },
      ],
      {},
      true,
    )
    expect(patch).toEqual({ bill: 'B-100', merchant: 'Acme', total: '42.5' })
  })

  it('does not overwrite typed values unless the file replaces the document', () => {
    const targets = getColumnOcrTargets(upload, siblings)
    const ocr = [
      { name: 'bill', value: 'B-100' },
      { name: 'merchant', value: 'Acme' },
    ]
    const row = { bill: 'MINE', merchant: '' }
    expect(mapOcrToRowPatch(targets, ocr, row, false)).toEqual({
      merchant: 'Acme',
    })
    expect(mapOcrToRowPatch(targets, ocr, row, true)).toEqual({
      bill: 'B-100',
      merchant: 'Acme',
    })
  })

  it('returns an empty patch for missing or malformed OCR output', () => {
    const targets = getColumnOcrTargets(upload, siblings)
    expect(mapOcrToRowPatch(targets, undefined, {}, true)).toEqual({})
    expect(mapOcrToRowPatch(targets, [], {}, true)).toEqual({})
  })
})

describe('Batch 7: schema save / reload', () => {
  it('keeps allowMultipleFiles and the auto-fill column list', () => {
    const raw = {
      panels: [
        {
          fields: [
            table([
              col('bill', 'SHORT_TEXT'),
              col(
                'upload',
                'FILE_UPLOAD',
                { allowMultipleFiles: true },
                { assignOtherControls: ['bill'] },
              ),
            ]),
          ],
          id: 'p1',
        },
      ],
    }
    const saved = serializeFormPayload(normalizeV5FormJson(raw))
    const [bill, upload] =
      saved.panels[0].fields[0].settings.specific.tableColumns
    expect(upload.settings.specific.allowMultipleFiles).toBe(true)
    // the table's column ids are rewritten on load; the list must follow
    expect(upload.settings.validation.assignOtherControls).toEqual([bill.id])
  })
})
