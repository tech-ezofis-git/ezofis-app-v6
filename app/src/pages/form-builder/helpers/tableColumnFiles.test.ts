import { describe, expect, it } from 'vitest'
import { validateFieldValue } from './runtimeValidation'
import {
  getColumnAllowedFileTypes,
  getColumnFileError,
  getColumnMaxFileSizeMb,
  getFileInputAccept,
  getStoredFileInfo,
  isFileColumnType,
} from './tableColumnFiles'
import { normalizeV5FormJson, serializeFormPayload } from './v5SchemaAdapter'

const MB = 1024 * 1024

const col = (
  type: string,
  validation: Record<string, unknown> = {},
  id = 'f',
) => ({ id, label: id, name: id, type, settings: { validation } })

const table = (columns: unknown[]) => ({
  id: 'f_tbl',
  label: 'Docs',
  type: 'TABLE',
  settings: { specific: { tableColumns: columns } },
})

describe('Batch 5: file column helpers', () => {
  it('recognises file, image-upload and the V5 IMAGE alias', () => {
    expect(isFileColumnType('FILE_UPLOAD')).toBe(true)
    expect(isFileColumnType('IMAGE_UPLOAD')).toBe(true)
    expect(isFileColumnType('image')).toBe(true)
    expect(isFileColumnType('SHORT_TEXT')).toBe(false)
  })

  it('allowed types accept lists and comma / newline strings, normalised', () => {
    expect(
      getColumnAllowedFileTypes(
        col('FILE_UPLOAD', { allowedFileTypes: ['.PDF', 'png', ' '] }),
      ),
    ).toEqual(['pdf', 'png'])
    expect(
      getColumnAllowedFileTypes(
        col('FILE_UPLOAD', { allowedFileTypes: 'pdf, .JPG\nxlsx' }),
      ),
    ).toEqual(['pdf', 'jpg', 'xlsx'])
    expect(getColumnAllowedFileTypes(col('FILE_UPLOAD'))).toEqual([])
  })

  it('max size must be a positive number', () => {
    expect(
      getColumnMaxFileSizeMb(col('FILE_UPLOAD', { maxFileSize: '2.5' })),
    ).toBe(2.5)
    expect(
      getColumnMaxFileSizeMb(col('FILE_UPLOAD', { maxFileSize: 0 })),
    ).toBeUndefined()
    expect(
      getColumnMaxFileSizeMb(col('FILE_UPLOAD', { maxFileSize: '' })),
    ).toBeUndefined()
    expect(getColumnMaxFileSizeMb(col('FILE_UPLOAD'))).toBeUndefined()
  })

  it('picker accept: configured types win, image columns keep image/*, files stay open', () => {
    const typed = col('FILE_UPLOAD', { allowedFileTypes: ['pdf', 'png'] })
    expect(getFileInputAccept(typed, false)).toBe('.pdf,.png')
    expect(getFileInputAccept(col('IMAGE_UPLOAD'), true)).toBe('image/*')
    expect(getFileInputAccept(col('FILE_UPLOAD'), false)).toBeUndefined()
    expect(
      getFileInputAccept(
        col('IMAGE_UPLOAD', { allowedFileTypes: ['png'] }),
        true,
      ),
    ).toBe('.png')
  })
})

describe('Batch 5: file checks', () => {
  const restricted = col('FILE_UPLOAD', {
    allowedFileTypes: ['pdf', 'png'],
    maxFileSize: 2,
  })

  it('rejects a disallowed extension, case-insensitively accepts allowed ones', () => {
    expect(getColumnFileError(restricted, { name: 'a.exe', size: 10 })).toBe(
      'should be a pdf | png file',
    )
    expect(
      getColumnFileError(restricted, { name: 'A.PDF', size: 10 }),
    ).toBeUndefined()
    expect(getColumnFileError(restricted, { name: 'noextension' })).toBe(
      'should be a pdf | png file',
    )
  })

  it('rejects files over the size limit; the limit itself is allowed', () => {
    expect(
      getColumnFileError(restricted, { name: 'a.pdf', size: 2 * MB + 1 }),
    ).toBe('file size should not be more than 2 mb')
    expect(
      getColumnFileError(restricted, { name: 'a.pdf', size: 2 * MB }),
    ).toBeUndefined()
  })

  it('a missing size is not a violation (already-uploaded files)', () => {
    expect(getColumnFileError(restricted, { name: 'a.pdf' })).toBeUndefined()
  })

  it('legacy columns without settings accept everything', () => {
    const legacy = col('FILE_UPLOAD')
    expect(
      getColumnFileError(legacy, { name: 'a.exe', size: 999 * MB }),
    ).toBeUndefined()
  })

  it('reads name and size from the shapes a cell can hold', () => {
    expect(getStoredFileInfo({ fileName: 'a.pdf', fileSize: 5 })).toEqual({
      name: 'a.pdf',
      size: 5,
    })
    expect(
      getStoredFileInfo({
        fileName: 'a.pdf',
        rawFile: { name: 'a.pdf', size: 7 },
      }),
    ).toEqual({ name: 'a.pdf', size: 7 })
    expect(getStoredFileInfo({ fileName: 'a.pdf', itemId: 'i1' })).toEqual({
      name: 'a.pdf',
      size: undefined,
    })
    expect(getStoredFileInfo('b.png')).toEqual({ name: 'b.png' })
    expect(getStoredFileInfo(null)).toEqual({})
  })
})

describe('Batch 5: submission validation', () => {
  const restricted = col('FILE_UPLOAD', {
    allowedFileTypes: ['pdf'],
    maxFileSize: 1,
  })

  it('rejects a stored file with a bad type or size', () => {
    const t = table([restricted])
    expect(
      validateFieldValue(t, [{ f: { fileName: 'a.exe', fileSize: 10 } }]).error,
    ).toBe('Row 1: f should be a pdf file')
    expect(
      validateFieldValue(t, [{ f: { fileName: 'a.pdf', fileSize: 2 * MB } }])
        .error,
    ).toBe('Row 1: f file size should not be more than 1 mb')
    expect(
      validateFieldValue(t, [
        { f: { fileName: 'a.pdf', rawFile: { name: 'a.pdf', size: 2 * MB } } },
      ]).isValid,
    ).toBe(false)
  })

  it('accepts valid files, uploaded files without size, and empty cells', () => {
    const t = table([restricted])
    expect(
      validateFieldValue(t, [{ f: { fileName: 'a.pdf', fileSize: MB / 2 } }])
        .isValid,
    ).toBe(true)
    expect(
      validateFieldValue(t, [{ f: { fileName: 'a.pdf', itemId: 'i1' } }])
        .isValid,
    ).toBe(true)
    expect(validateFieldValue(t, [{ f: undefined }]).isValid).toBe(true)
  })

  it('applies to IMAGE_UPLOAD and the IMAGE alias; legacy columns are unchanged', () => {
    const img = table([col('IMAGE_UPLOAD', { allowedFileTypes: ['png'] })])
    expect(
      validateFieldValue(img, [{ f: { fileName: 'a.gif' } }]).isValid,
    ).toBe(false)
    const alias = table([col('IMAGE', { allowedFileTypes: ['png'] })])
    expect(
      validateFieldValue(alias, [{ f: { fileName: 'a.gif' } }]).isValid,
    ).toBe(false)
    const legacy = table([col('FILE_UPLOAD')])
    expect(
      validateFieldValue(legacy, [
        { f: { fileName: 'a.exe', fileSize: 999 * MB } },
      ]).isValid,
    ).toBe(true)
  })
})

describe('Batch 5: schema save / reload', () => {
  it('keeps allowed types and max size through load and save', () => {
    const raw = {
      panels: [
        {
          fields: [
            table([
              col('FILE_UPLOAD', {
                allowedFileTypes: ['pdf', 'png'],
                maxFileSize: 5,
              }),
            ]),
          ],
          id: 'p1',
        },
      ],
    }
    const saved = serializeFormPayload(normalizeV5FormJson(raw))
    const [fileCol] = saved.panels[0].fields[0].settings.specific.tableColumns
    expect(fileCol.settings.validation).toMatchObject({
      allowedFileTypes: ['pdf', 'png'],
      maxFileSize: 5,
    })
  })
})
