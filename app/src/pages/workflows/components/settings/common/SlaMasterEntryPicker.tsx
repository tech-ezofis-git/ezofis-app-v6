import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Option } from '@/types/option'
import formApi from '@/api/form/form'
import { getFormFieldsQueryOptions } from '@/api/form/queries'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputSelect from '@/components/base/inputs/InputSelect'
import {
  createSlaMasterRow,
  type SlaMasterRow,
  type SlaSettings,
  type SlaValidationErrors,
} from '../../../utils/slaSettings'

type Row = Record<string, unknown>

interface SlaMasterEntryPickerProps {
  /** Stage = response SLA (Response Time / Type); workflow = resolution SLA (Resolution Time / Type). */
  isBlock: boolean
  value: SlaSettings
  errors?: SlaValidationErrors
  onChange: (value: SlaSettings) => void
}

const asRow = (value: unknown): Row =>
  value && typeof value === 'object' ? (value as Row) : {}

/** "Response_Time", "response time" → "responsetime" (as the API matches labels). */
const normalizeLabel = (label: unknown) =>
  String(label ?? '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

/** GET /form/{id}/entry/all → { entries: [...] } (or a bare array). */
const entryList = (data: unknown): Row[] => {
  const list = Array.isArray(data)
    ? data
    : (asRow(data).entries ?? asRow(asRow(data).data).entries)
  return Array.isArray(list) ? list.map(asRow) : []
}

const toText = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map(String).join(', ')
  return String(value).trim()
}

/** An entry's value for a field: by jsonId, else a key matching its label. */
const fieldValue = (entry: Row, field: { id: string; label: string }) => {
  const direct = toText(entry[field.id] ?? asRow(entry.formData)[field.id])
  if (direct) return direct
  const target = normalizeLabel(field.label)
  const key = Object.keys(entry).find((k) => normalizeLabel(k) === target)
  return key ? toText(entry[key]) : ''
}

const entryKey = (entry: Row) =>
  String(entry.item_id ?? entry.itemId ?? entry.id ?? '')

/**
 * Advanced SLA: pick one or more entries of the SLA form. Older forms set each
 * to Notify, Escalate or both; with an SLA Steps table the entry decides. Times
 * and people are read from the form when the SLA runs, so they are not shown or
 * copied here.
 */
export default function SlaMasterEntryPicker({
  errors = {},
  isBlock,
  value,
  onChange,
}: SlaMasterEntryPickerProps) {
  const masterId = value.slaMasterId
  const config = errors._config ?? {}

  const { data: rawFields = [], isLoading: isFieldsLoading } = useQuery({
    ...getFormFieldsQueryOptions(String(masterId ?? '')),
    enabled: Boolean(masterId),
  })
  const fields = useMemo(
    () =>
      rawFields
        .filter(
          (f) =>
            f && !['DIVIDER', 'HEADING', 'LABEL', 'PARAGRAPH'].includes(f.type),
        )
        .map((f) => ({
          id: String(f.id),
          label: String(f.label || f.displayLabel || f.id),
        })),
    [rawFields],
  )

  const { data: entries = [], isLoading: isEntriesLoading } = useQuery({
    enabled: Boolean(masterId),
    queryKey: ['sla-master-entries', masterId],
    queryFn: async () => {
      const response = await formApi.getFormEntries(String(masterId), 1, 1000)
      return entryList(response?.data)
    },
  })

  // The field that names the entries is chosen for you: Policy Name, as new
  // SLA forms have, else Name, else what was saved, else the first field.
  const fieldLabelled = (label: string) =>
    fields.find((f) => normalizeLabel(f.label) === normalizeLabel(label))
  const selectedField =
    fieldLabelled('Policy Name') ??
    fieldLabelled('Name') ??
    fields.find((f) => f.id === value.masterFieldId) ??
    fields[0]
  // One option per entry, keyed by its id and named by the field's current
  // value, so a renamed entry keeps its place and shows its new name.
  const valueOptions: Option[] = useMemo(() => {
    if (!selectedField) return []
    return entries
      .map((entry) => ({
        id: entryKey(entry),
        name: fieldValue(entry, selectedField),
      }))
      .filter((o) => o.id && o.name)
  }, [entries, selectedField])
  const rows = value.masterEntries ?? []
  // A form with an SLA Steps table: each entry holds its own actions and people.
  const stepsField = fields.find(
    (f) => normalizeLabel(f.label) === normalizeLabel('SLA Steps'),
  )
  // With a steps table an entry holds everything, so this is just one choice.
  const plainEntry = Boolean(stepsField) && rows.length <= 1
  const plainRow = rows[0]
  const plainMissing =
    Boolean(plainRow?.entryId) &&
    !isEntriesLoading &&
    !entries.some((e) => entryKey(e) === plainRow?.entryId)
  const setRow = (id: string, patch: Partial<SlaMasterRow>) =>
    onChange({
      ...value,
      masterEntries: rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      masterFieldId: selectedField?.id ?? value.masterFieldId,
    })

  // The SLA values are found by these labels when the SLA runs.
  const required = isBlock
    ? ['Response Time', 'Response Type']
    : ['Resolution Time', 'Resolution Type']
  const missing =
    masterId && !isFieldsLoading && fields.length > 0 && !stepsField
      ? required.filter(
          (label) =>
            !fields.some(
              (f) => normalizeLabel(f.label) === normalizeLabel(label),
            ),
        )
      : []

  return (
    <div className='flex flex-col gap-3'>
      {plainEntry && (
        <InputSelect
          label='Select Master Form Entry'
          loading={isEntriesLoading}
          options={valueOptions}
          placeholder='Select an entry...'
          required
          searchable
          error={
            config.entryId ??
            (plainRow ? errors[plainRow.id]?.entryId : undefined) ??
            (plainMissing
              ? 'This entry is no longer in the SLA form. Choose another one.'
              : undefined)
          }
          value={
            valueOptions.find((o) => o.id === plainRow?.entryId) ??
            (plainRow?.entryId
              ? {
                  id: plainRow.entryId,
                  name: plainMissing ? 'Missing entry' : '…',
                }
              : null)
          }
          onChange={(opt) =>
            onChange({
              ...value,
              masterEntries: [
                {
                  ...(plainRow ?? createSlaMasterRow()),
                  entryId: opt ? String(opt.id) : null,
                  // The table decides; this keeps the row valid.
                  notify: true,
                },
              ],
              masterFieldId: selectedField?.id ?? value.masterFieldId,
            })
          }
        />
      )}

      {!plainEntry && (
        <span className='text-13 font-medium text-gray-11'>
          SLA Rules &amp; Entries
        </span>
      )}

      {!plainEntry &&
        rows.map((row, index) => {
          const rowErrors = errors[row.id] ?? {}
          const missingEntry =
            Boolean(row.entryId) &&
            !isEntriesLoading &&
            !entries.some((e) => entryKey(e) === row.entryId)
          return (
            <div
              className='animate-in fade-in slide-in-from-top-1 flex flex-col gap-3 rounded-lg border border-gray-3 p-3 duration-200'
              key={row.id}
            >
              <div className='flex items-center justify-between gap-2'>
                <span className='text-12 font-semibold text-gray-11'>
                  SLA Rule {index + 1}
                </span>
                <IconButton
                  ariaLabel='Remove SLA rule'
                  color='red'
                  icon='lucide:trash-2'
                  size='xs'
                  tooltip='Remove'
                  type='button'
                  variant='ghost'
                  onClick={() =>
                    onChange({
                      ...value,
                      masterEntries: rows.filter((r) => r.id !== row.id),
                    })
                  }
                />
              </div>
              <InputSelect
                label='Select Master Form Entry'
                loading={isEntriesLoading}
                options={valueOptions}
                placeholder='Select an entry...'
                required
                searchable
                error={
                  rowErrors.entryId ??
                  (missingEntry
                    ? 'This entry is no longer in the SLA form. Choose another one.'
                    : undefined)
                }
                value={
                  valueOptions.find((o) => o.id === row.entryId) ??
                  (row.entryId
                    ? {
                        id: row.entryId,
                        name: missingEntry ? 'Missing entry' : '…',
                      }
                    : null)
                }
                onChange={(opt) =>
                  setRow(row.id, {
                    entryId: opt ? String(opt.id) : null,
                    // Hidden with a steps table, where the table decides; keeps the row valid.
                    ...(stepsField ? { notify: true } : {}),
                  })
                }
              />
              {!stepsField && (
                <>
                  <InputCheckbox
                    checked={row.notify}
                    description="Message this entry's Notify users"
                    label='Notify'
                    onChange={(notify) => setRow(row.id, { notify })}
                  />
                  <InputCheckbox
                    checked={row.escalate}
                    label='Escalate'
                    description={
                      isBlock
                        ? 'Message and reassign to Escalate user'
                        : "Message this entry's Escalate users"
                    }
                    onChange={(escalate) => setRow(row.id, { escalate })}
                  />
                </>
              )}
              {rowErrors.action && (
                <span className='text-12 text-red-11'>{rowErrors.action}</span>
              )}
            </div>
          )
        })}

      {!plainEntry && config.entryId && (
        <span className='text-12 text-red-11'>{config.entryId}</span>
      )}

      {!plainEntry && (
        <button
          className='flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-4 py-2 text-13 font-medium text-primary-9 transition-all duration-200 hover:border-primary-7 hover:bg-primary-1 active:scale-[0.99]'
          type='button'
          onClick={() =>
            onChange({
              ...value,
              masterEntries: [...rows, createSlaMasterRow()],
            })
          }
        >
          <Icon className='h-4 w-4' name='lucide:plus' />
          {rows.length === 0 ? 'Add an SLA rule' : 'Add another SLA rule'}
        </button>
      )}

      {missing.length > 0 && (
        <span className='text-12 text-red-11'>
          This SLA form has no {missing.join(' or ')} field, so the SLA cannot
          be calculated. Choose another SLA form.
        </span>
      )}
    </div>
  )
}
