import { type ComponentProps, useEffect, useRef, useState } from 'react'
import InputDate from '@/components/base/inputs/InputDate'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelectBase from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import InputTime from '@/components/base/inputs/InputTime'
import {
  isFileColumnType,
  isTextFillableColumn,
} from '@/pages/form-builder/helpers/tableColumnFiles'
import {
  ADDRESS_PARTS,
  getAddressMatchingRows,
  setAddressTargets,
} from '@/pages/form-builder/helpers/tableColumnShortText'
import type { TableColumn } from './TableColumnSettingsPanel'

type ColumnSettingsPatch = Partial<NonNullable<TableColumn['settings']>>

interface Props {
  column: TableColumn
  siblingColumns?: TableColumn[]
  onUpdate: (patch: ColumnSettingsPatch) => void
}

const CURRENCY_MODE_OPTIONS = [
  { id: 'ALL', name: 'All Currencies (Global List)' },
  { id: 'SPECIFIC', name: 'Specific Currencies (Restricted)' },
]

const DATE_LIMIT_OPTIONS = [
  { id: 'NONE', name: 'No Restrictions' },
  { id: 'MIN_DATE', name: 'Minimum Date (Earliest)' },
  { id: 'MAX_DATE', name: 'Maximum Date (Latest)' },
  { id: 'RANGE', name: 'Fixed Date Range' },
]

const TIME_LIMIT_OPTIONS = [
  { id: 'NONE', name: 'No Restrictions' },
  { id: 'MIN_TIME', name: 'Minimum Time (Current)' },
  { id: 'MAX_TIME', name: 'Maximum Time (Current)' },
  { id: 'RANGE', name: 'Select Time Range' },
]

const TIME_FORMAT_OPTIONS = [
  { id: '12', name: '12 Hour' },
  { id: '24', name: '24 Hour' },
]

function InputSelect(props: ComponentProps<typeof InputSelectBase>) {
  return <InputSelectBase searchable wrapOptions {...props} />
}

/**
 * Comma-separated list input. Keeps the raw text locally so typing a trailing
 * comma or space is not swallowed, and commits the parsed list on each change.
 */
const CommaListInput = ({
  description,
  items,
  label,
  normalize,
  placeholder,
  onCommit,
}: {
  description?: string
  items: string[]
  label: string
  placeholder?: string
  normalize: (item: string) => string
  onCommit: (items: string[]) => void
}) => {
  const [text, setText] = useState(items.join(', '))
  const committed = useRef(items)

  useEffect(() => {
    // Re-sync only when the saved list changed from elsewhere
    if (JSON.stringify(items) !== JSON.stringify(committed.current)) {
      committed.current = items
      setText(items.join(', '))
    }
  }, [items])

  return (
    <InputText
      description={description}
      label={label}
      placeholder={placeholder}
      value={text}
      onChange={(value: string) => {
        const next = value
          .split(',')
          .map((s) => normalize(s.trim()))
          .filter(Boolean)
        setText(value)
        committed.current = next
        onCommit(next)
      }}
    />
  )
}

// Common upload types offered in the "Allowed File Types" dropdown. Any other
// extension can still be typed and added; saved values outside this list stay
// selected and visible.
const FILE_TYPE_OPTIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
  'ppt',
  'pptx',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'tiff',
  'webp',
  'svg',
  'zip',
  'xml',
  'json',
].map((ext) => ({ id: ext, name: ext.toUpperCase() }))

const SectionLabel = ({ children }: { children: string }) => (
  <label className='block text-[11px] font-bold tracking-wider text-gray-7 uppercase'>
    {children}
  </label>
)

const sectionClass =
  'animate-in fade-in slide-in-from-top-1 space-y-2 rounded-lg border border-dashed border-gray-3 p-2.5 duration-200'

/**
 * Type-specific column settings for CURRENCY_AMOUNT, DATE and TIME columns.
 * Uses the same setting keys as the top-level fields (see QuestionSettings):
 * specific.currencyOptionsType / specificCurrencies, and
 * validation.dateLimitType / timeLimitType / timeFormat plus their offsets
 * and fixed bounds.
 */
const TableColumnFormatSettings = ({
  column,
  siblingColumns = [],
  onUpdate,
}: Props) => {
  const specific = column.settings?.specific
  const validation = column.settings?.validation

  if (column.type === 'CURRENCY_AMOUNT') {
    const mode =
      specific?.currencyOptionsType === 'SPECIFIC' ? 'SPECIFIC' : 'ALL'
    return (
      <div className={sectionClass}>
        <SectionLabel>Currency</SectionLabel>
        <InputSelect
          options={CURRENCY_MODE_OPTIONS}
          value={CURRENCY_MODE_OPTIONS.find((o) => o.id === mode) || null}
          onChange={(opt) =>
            onUpdate({
              specific: {
                currencyOptionsType:
                  opt?.id === 'SPECIFIC' ? 'SPECIFIC' : 'ALL',
              },
            })
          }
        />
        {mode === 'SPECIFIC' && (
          <CommaListInput
            description='Users pick from this list when it has two or more currencies.'
            items={specific?.specificCurrencies || []}
            label='Restricted List'
            normalize={(s) => s.toUpperCase()}
            placeholder='e.g. USD, EUR, GBP (comma separated)'
            onCommit={(items) =>
              onUpdate({ specific: { specificCurrencies: items } })
            }
          />
        )}
        <InputText
          description='Shown when the cell has no currency yet. Leave empty to keep the plain $ prefix.'
          label='Default Currency'
          placeholder='USD'
          value={specific?.defaultCurrency || ''}
          onChange={(value: string) =>
            onUpdate({ specific: { defaultCurrency: value.toUpperCase() } })
          }
        />
      </div>
    )
  }

  if (isFileColumnType(column.type)) {
    // Columns a document's extracted text can be written into
    const fillableColumns = siblingColumns
      .filter(isTextFillableColumn)
      .map((c) => ({ id: c.id, name: c.name || 'Column' }))
    // Date columns can hold the document's expiry date
    const dateColumns = siblingColumns
      .filter((c) => c.type === 'DATE' || c.type === 'DATE_TIME')
      .map((c) => ({ id: c.id, name: c.name || 'Column' }))
    const allowedTypes = (validation?.allowedFileTypes || []).map(String)
    const fileTypeOptions = [
      ...FILE_TYPE_OPTIONS,
      ...allowedTypes
        .filter((ext) => !FILE_TYPE_OPTIONS.some((o) => o.id === ext))
        .map((ext) => ({ id: ext, name: ext.toUpperCase() })),
    ]
    return (
      <div className={sectionClass}>
        <SectionLabel>File Restrictions</SectionLabel>
        <InputSelectMultiple
          description='Extensions users may upload. Leave empty to allow any file. Type to add another extension.'
          label='Allowed File Types'
          options={fileTypeOptions}
          placeholder='Select file types'
          value={fileTypeOptions.filter((o) => allowedTypes.includes(o.id))}
          creatable
          searchable
          onChange={(vals) =>
            onUpdate({
              validation: {
                allowedFileTypes: Array.from(
                  new Set(
                    vals
                      .map((v) => {
                        // A typed extension arrives with a generated id; its
                        // text is in `value` / `name`.
                        const known = fileTypeOptions.some((o) => o.id === v.id)
                        return String(known ? v.id : (v.value ?? v.name))
                          .trim()
                          .replace(/^\./, '')
                          .toLowerCase()
                      })
                      .filter((ext) => /^[a-z0-9]+$/.test(ext)),
                  ),
                ),
              },
            })
          }
        />
        <InputNumber
          description='Largest file accepted, in MB. Leave empty for no limit.'
          label='Max File Size (MB)'
          min={0}
          value={validation?.maxFileSize ?? ''}
          onChange={(v) => onUpdate({ validation: { maxFileSize: v } })}
        />
        <InputSwitch
          checked={specific?.allowMultipleFiles === true}
          description='Let users attach more than one file in a cell. Each file is checked against the limits above.'
          label='Allow Multiple Files'
          onChange={(checked) =>
            onUpdate({ specific: { allowMultipleFiles: checked } })
          }
        />
        <InputSwitch
          checked={specific?.fileInStageOnly === true}
          description='Keep the uploaded file in the stage when the request is initiated.'
          label='File In Stage Only'
          onChange={(checked) =>
            onUpdate({ specific: { fileInStageOnly: checked } })
          }
        />
        <InputSwitch
          checked={validation?.answerIndicator === 'YES'}
          description='Show whether this question has been addressed.'
          label='Answer Status Indicator'
          onChange={(checked) =>
            onUpdate({
              validation: { answerIndicator: checked ? 'YES' : 'NO' },
            })
          }
        />
        {dateColumns.length > 0 && (
          <InputSelect
            description='Date column that holds this document’s expiry date.'
            label='Document Expiry Field'
            options={dateColumns}
            placeholder='Select a date column'
            clearable
            value={
              dateColumns.find((c) => c.id === validation?.expiryFieldId) ||
              null
            }
            onChange={(opt) =>
              onUpdate({
                validation: { expiryFieldId: opt?.id ? String(opt.id) : null },
              })
            }
          />
        )}
        {fillableColumns.length > 0 && (
          <InputSelectMultiple
            label='Fill other columns from the document'
            options={fillableColumns}
            placeholder='Select columns to auto-fill'
            value={fillableColumns.filter((c) =>
              (validation?.assignOtherControls || []).includes(c.id),
            )}
            onChange={(vals) =>
              onUpdate({
                validation: {
                  assignOtherControls: vals.map((v) => String(v.id)),
                },
              })
            }
          />
        )}
      </div>
    )
  }

  if (column.type === 'SHORT_TEXT') {
    const textColumns = siblingColumns
      .filter(isTextFillableColumn)
      .map((c) => ({ id: c.id, name: c.name || 'Column' }))
    const isAddress = specific?.isAddressField === true
    const rows = getAddressMatchingRows(column)
    return (
      <div className={sectionClass}>
        <SectionLabel>Short Text</SectionLabel>
        <InputSwitch
          checked={isAddress}
          description='Suggest addresses while typing and split the picked address into other columns.'
          label='Address Field'
          onChange={(checked) =>
            onUpdate({ specific: { isAddressField: checked } })
          }
        />
        {isAddress &&
          (textColumns.length > 0 ? (
            ADDRESS_PARTS.map((part) => (
              <InputSelectMultiple
                key={part.id}
                label={`Fill ${part.name.toLowerCase()} into`}
                options={textColumns}
                placeholder='Select columns'
                value={textColumns.filter((c) =>
                  (
                    rows.find((r) => r.addressColumn === part.id)
                      ?.selectFieldColumn || []
                  ).includes(c.id),
                )}
                onChange={(vals) =>
                  onUpdate({
                    specific: {
                      addressMatchingFields: setAddressTargets(
                        column,
                        part.id,
                        vals.map((v) => String(v.id)),
                      ),
                    },
                  })
                }
              />
            ))
          ) : (
            <p className='text-[10px] text-gray-6 italic'>
              Add other text columns to fill address parts into.
            </p>
          ))}
        <InputSwitch
          checked={specific?.qrValue === true}
          description='Show a scan button in the cell to read a QR code or barcode into this column.'
          label='Read Values From QR'
          onChange={(checked) => onUpdate({ specific: { qrValue: checked } })}
        />
      </div>
    )
  }

  if (column.type === 'DATE') {
    const limitType = validation?.dateLimitType || 'NONE'
    return (
      <div className={sectionClass}>
        <SectionLabel>Date Limits</SectionLabel>
        <InputSelect
          options={DATE_LIMIT_OPTIONS}
          value={DATE_LIMIT_OPTIONS.find((o) => o.id === limitType) || null}
          onChange={(opt) =>
            onUpdate({
              validation: {
                dateLimitType: (opt?.id || 'NONE') as
                  | 'MAX_DATE'
                  | 'MIN_DATE'
                  | 'NONE'
                  | 'RANGE',
              },
            })
          }
        />
        {limitType === 'MIN_DATE' && (
          <InputNumber
            description='Current date is the default minimum.'
            label='Years from Current'
            value={validation?.minDateOffset ?? ''}
            onChange={(v) => onUpdate({ validation: { minDateOffset: v } })}
          />
        )}
        {limitType === 'MAX_DATE' && (
          <InputNumber
            description='Current date is the default maximum.'
            label='Years from Current'
            value={validation?.maxDateOffset ?? ''}
            onChange={(v) => onUpdate({ validation: { maxDateOffset: v } })}
          />
        )}
        {limitType === 'RANGE' && (
          <div className='grid grid-cols-2 gap-2'>
            <InputDate
              label='Start Date'
              value={validation?.fixedStartDate || null}
              clearable
              onChange={(v) =>
                onUpdate({ validation: { fixedStartDate: v || '' } })
              }
            />
            <InputDate
              label='End Date'
              value={validation?.fixedEndDate || null}
              clearable
              onChange={(v) =>
                onUpdate({ validation: { fixedEndDate: v || '' } })
              }
            />
          </div>
        )}
      </div>
    )
  }

  if (column.type === 'TIME') {
    const limitType = validation?.timeLimitType || 'NONE'
    const format = validation?.timeFormat === '24' ? '24' : '12'
    return (
      <div className={sectionClass}>
        <SectionLabel>Time</SectionLabel>
        <InputSelect
          label='Time Format'
          options={TIME_FORMAT_OPTIONS}
          value={TIME_FORMAT_OPTIONS.find((o) => o.id === format) || null}
          onChange={(opt) =>
            onUpdate({
              validation: { timeFormat: opt?.id === '24' ? '24' : '12' },
            })
          }
        />
        <InputSelect
          label='Time Limits'
          options={TIME_LIMIT_OPTIONS}
          value={TIME_LIMIT_OPTIONS.find((o) => o.id === limitType) || null}
          onChange={(opt) =>
            onUpdate({
              validation: {
                timeLimitType: (opt?.id || 'NONE') as
                  | 'MAX_TIME'
                  | 'MIN_TIME'
                  | 'NONE'
                  | 'RANGE',
              },
            })
          }
        />
        {limitType === 'MIN_TIME' && (
          <InputNumber
            description='Current time is the default minimum.'
            label='Hours from Current'
            value={validation?.minTimeOffset ?? ''}
            onChange={(v) => onUpdate({ validation: { minTimeOffset: v } })}
          />
        )}
        {limitType === 'MAX_TIME' && (
          <InputNumber
            description='Current time is the default maximum.'
            label='Hours from Current'
            value={validation?.maxTimeOffset ?? ''}
            onChange={(v) => onUpdate({ validation: { maxTimeOffset: v } })}
          />
        )}
        {limitType === 'RANGE' && (
          <div className='grid grid-cols-2 gap-2'>
            <InputTime
              format={format === '24' ? '24h' : '12h'}
              label='Start Time'
              value={validation?.fixedStartTime || ''}
              clearable
              onChange={(v) =>
                onUpdate({ validation: { fixedStartTime: v || '' } })
              }
            />
            <InputTime
              format={format === '24' ? '24h' : '12h'}
              label='End Time'
              value={validation?.fixedEndTime || ''}
              clearable
              onChange={(v) =>
                onUpdate({ validation: { fixedEndTime: v || '' } })
              }
            />
          </div>
        )}
      </div>
    )
  }

  return null
}

export default TableColumnFormatSettings
