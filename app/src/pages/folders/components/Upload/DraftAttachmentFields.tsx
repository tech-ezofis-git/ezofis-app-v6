import { useLingui } from '@lingui/react/macro'
import type { ReactNode } from 'react'
import BaseButton from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InfoCard from '@/components/base/InfoCard'
import Tooltip from '@/components/base/Tooltip'
import InputDate from '@/components/base/inputs/InputDate'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import { getFileIcon } from '@/pages/requests/components/request/components/sections/attachment/Attachments'
import cn from '@/utils/cn'
import type { DynamicRepositoryColumn } from '../../api/folderApi'
import {
  findSelectedOption,
  getSelectOptions,
  normalizeType,
  toTextValue,
} from '../../hooks/useEditMetadataForm'
import TableFieldInput from './TableFieldInput'

export type DraftRepositoryField = {
  dataType: string
  id: string
  isMandatory?: boolean
  isReadOnly?: boolean
  name: string
  optionsJson?: string | null
  sqlColumnName: string
}

const getFieldKey = (field: DraftRepositoryField) =>
  field.sqlColumnName || field.id

const normalizeComparable = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

const parseFieldDate = (value: unknown): Date | null => {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    return Number.isNaN(date.getTime()) ? null : date
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

const isDateAfterToday = (value: unknown) => {
  const date = parseFieldDate(value)
  if (!date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date.getTime() > today.getTime()
}

const statusTone = (status: string): 'danger' | 'info' | 'success' => {
  const normalized = status.toLowerCase()
  if (
    /(expired|invalid|error|fail|reject|overdue|revoke|denied|dead)/.test(
      normalized,
    )
  ) {
    return 'danger'
  }
  if (
    /(valid|active|current|ok|success|complete|pass|good|verified|ready)/.test(
      normalized,
    )
  ) {
    return 'success'
  }
  return 'info'
}

const visibleFieldStatus = (
  field: DraftRepositoryField,
  fieldValues: Record<string, string>,
  fieldStatuses: Record<string, string>,
  ocrExtractedValues: Record<string, string>,
) => {
  const fieldKey = getFieldKey(field)
  const original = String(fieldStatuses[fieldKey] ?? '').trim()
  if (!original) return ''
  const current = fieldValues[fieldKey] ?? ''
  const fieldType = normalizeType(field.dataType)
  if (fieldType === 'date' || fieldType === 'datetime') {
    if (!String(current).trim()) return ''
    if (isDateAfterToday(current)) return ''
    return original
  }
  if (
    normalizeComparable(current) ===
    normalizeComparable(ocrExtractedValues[fieldKey] ?? '')
  ) {
    return original
  }
  return ''
}

const toDynamicColumn = (
  field: DraftRepositoryField,
): DynamicRepositoryColumn => {
  const column: DynamicRepositoryColumn & Record<string, unknown> = {
    dataType: field.dataType,
    fieldId: field.id,
    isMandatory: field.isMandatory,
    key: getFieldKey(field),
    label: field.name,
  }
  if (field.optionsJson) {
    try {
      column.options = JSON.parse(field.optionsJson)
    } catch {
      // ignore invalid options JSON
    }
  }
  return column
}

type DraftAttachmentFieldsProps = {
  disabled?: boolean
  exportDisabled?: boolean
  exportLoading?: boolean
  fields: DraftRepositoryField[]
  fieldStatuses?: Record<string, string>
  fieldValues: Record<string, string>
  fileName?: string
  isAnalyzing?: boolean
  ocrExtractedValues?: Record<string, string>
  rawOcrJson?: unknown
  onExport: () => void
  onFieldChange: (fieldKey: string, value: string) => void
  onRegenerate?: () => void
}

export default function DraftAttachmentFields({
  disabled = false,
  exportDisabled = false,
  exportLoading = false,
  fields,
  fieldStatuses = {},
  fieldValues,
  fileName,
  isAnalyzing = false,
  ocrExtractedValues = {},
  rawOcrJson,
  onExport,
  onFieldChange,
  onRegenerate,
}: DraftAttachmentFieldsProps) {
  const { t } = useLingui()

  const resolvedStatuses = (() => {
    const merged = { ...fieldStatuses }
    const visit = (value: unknown, seen: Set<unknown>) => {
      if (!value || seen.has(value)) return
      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return
        try {
          visit(JSON.parse(trimmed), seen)
        } catch {
          // ignore invalid OCR JSON
        }
        return
      }
      if (typeof value !== 'object') return
      seen.add(value)
      if (Array.isArray(value)) {
        value.forEach((item) => visit(item, seen))
        return
      }
      const record = value as Record<string, unknown>
      const name = String(record.name || record.fieldName || '').trim()
      const status = [record.status, record.fieldStatus, record.ocrStatus]
        .map((item) => (item == null ? '' : String(item).trim()))
        .find((item) => item && item !== '[object Object]')
      if (name && status) {
        const match = fields.find((field) => {
          const key = getFieldKey(field)
          return (
            normalizeComparable(key) === normalizeComparable(name) ||
            normalizeComparable(field.name) === normalizeComparable(name) ||
            normalizeComparable(field.sqlColumnName) ===
              normalizeComparable(name)
          )
        })
        if (match && !merged[getFieldKey(match)]) {
          merged[getFieldKey(match)] = status
        }
      }
      Object.values(record).forEach((item) => visit(item, seen))
    }
    visit(rawOcrJson, new Set())
    return merged
  })()

  const requiredFields = fields.filter((field) => field.isMandatory)
  const missingRequiredFields = requiredFields.filter((field) => {
    if (isAnalyzing) return false
    return !String(fieldValues[getFieldKey(field)] ?? '').trim()
  })
  const filledRequiredCount = requiredFields.length - missingRequiredFields.length
  const requiredComplete =
    !isAnalyzing &&
    (requiredFields.length === 0 || missingRequiredFields.length === 0)

  const filledCount = fields.filter(
    (field) => String(fieldValues[getFieldKey(field)] ?? '').trim().length > 0,
  ).length

  const statusCards = (() => {
    const grouped = new Map<
      'danger' | 'info' | 'success',
      Array<{ name: string; status: string }>
    >()
    for (const field of fields) {
      const status = visibleFieldStatus(
        field,
        fieldValues,
        resolvedStatuses,
        ocrExtractedValues,
      )
      if (!status) continue
      const variant = statusTone(status)
      const list = grouped.get(variant) ?? []
      list.push({ name: field.name, status })
      grouped.set(variant, list)
    }
    const joinNames = (names: string[]) => {
      if (names.length <= 1) return names[0] ?? ''
      if (names.length === 2) return `${names[0]} and ${names[1]}`
      return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
    }
    return (['danger', 'info', 'success'] as const).flatMap((variant) => {
      const items = grouped.get(variant)
      if (!items?.length) return []
      const sameStatus = items.every((item) => item.status === items[0].status)
      return [
        {
          description: sameStatus
            ? joinNames(items.map((item) => item.name))
            : items.map((item) => `${item.name}: ${item.status}`).join('. '),
          title: sameStatus ? items[0].status : t`Review these fields`,
          variant,
        },
      ]
    })
  })()

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div className='flex shrink-0 items-center justify-between gap-2 border-b border-gray-3 px-4 py-2.5'>
        <div className='min-w-0'>
          <p className='text-13 font-semibold text-gray-12'>{t`Extracted Data`}</p>
          <p className='text-11 text-gray-10'>
            {t`${filledCount} of ${fields.length} fields ready`}
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          {onRegenerate ? (
            <Tooltip content={t`Regenerate`} position='top'>
              <IconButton
                ariaLabel={t`Regenerate`}
                color='secondary'
                disabled={disabled || isAnalyzing || exportLoading}
                icon='lucide:refresh-cw'
                size='sm'
                variant='subtle'
                onClick={onRegenerate}
              />
            </Tooltip>
          ) : null}
          <BaseButton
            color='primary'
            disabled={exportDisabled || exportLoading || isAnalyzing}
            icon='lucide:arrow-up-from-line'
            label={t`Export`}
            loading={exportLoading}
            size='xs'
            onClick={onExport}
          />
        </div>
      </div>

      {fileName || requiredFields.length > 0 ? (
        <div className='flex shrink-0 flex-col gap-2 border-b border-gray-3 px-4 py-3'>
          <div className='flex items-center gap-2'>
            {fileName ? (
              <div className='flex min-w-0 flex-1 items-center gap-2'>
                <Icon
                  className='size-4 shrink-0 text-red-9'
                  name={getFileIcon(fileName.split('.').pop() || '')}
                />
                <p className='min-w-0 truncate text-13 font-semibold text-gray-12'>
                  {fileName}
                </p>
              </div>
            ) : (
              <div className='min-w-0 flex-1' />
            )}
            {requiredComplete ? (
              <Tooltip
                content={t`All ${requiredFields.length} Mandatory Fields Filled.`}
                position='top'
              >
                <span className='flex size-4 shrink-0 items-center justify-center text-green-9'>
                  <Icon className='size-4' name='lucide:circle-check' />
                </span>
              </Tooltip>
            ) : (
              <RequiredProgressPie
                filled={filledRequiredCount}
                total={requiredFields.length}
              />
            )}
          </div>
        </div>
      ) : null}

      <div className='ez-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3'>
        {requiredFields.length > 0 ? (
          <InfoCard
            description=''
            title={
              requiredComplete
                ? t`All Mandatory fields are filled.`
                : t`${missingRequiredFields.length} Mandatory fields need to be filled.`
            }
            variant={requiredComplete ? 'success' : 'info'}
            className={
              requiredComplete
                ? 'rounded-xl border-l border-l-green-4'
                : 'rounded-xl border-l border-orange-4 bg-orange-1 text-orange-12 [&_svg]:text-orange-9'
            }
          />
        ) : null}
        {statusCards.map((card) => (
          <InfoCard
            description={card.description}
            key={card.variant}
            title={card.title}
            variant={card.variant}
          />
        ))}
        {fields.length === 0 ? (
          <p className='text-12 text-gray-10'>
            {t`No repository fields configured.`}
          </p>
        ) : (
          fields.map((field) => {
            const fieldKey = getFieldKey(field)
            const fieldType = normalizeType(field.dataType)
            const value = isAnalyzing ? '' : (fieldValues[fieldKey] ?? '')
            const fieldDisabled =
              disabled || Boolean(field.isReadOnly) || isAnalyzing
            const label = field.name
            const required = Boolean(field.isMandatory)
            const column = toDynamicColumn(field)
            const options = getSelectOptions(column)
            const placeholder = isAnalyzing
              ? t`Extracting...`
              : t`Enter ${label}`
            const fromOcr =
              !isAnalyzing &&
              Boolean(String(value).trim()) &&
              normalizeComparable(value) ===
                normalizeComparable(ocrExtractedValues[fieldKey] ?? '')
            const missingRequired =
              required && !isAnalyzing && !String(value).trim()
            const fieldStatus = isAnalyzing
              ? ''
              : visibleFieldStatus(
                  field,
                  fieldValues,
                  resolvedStatuses,
                  ocrExtractedValues,
                )
            const tone = fieldStatus ? statusTone(fieldStatus) : null
            const frame = (control: ReactNode, ownLabel = true) => (
              <div
                className={cn(
                  'flex flex-col gap-1',
                  tone === 'danger' &&
                    'rounded-lg border border-red-4 bg-red-1 p-2 [&_button]:!bg-red-1 [&_input]:!bg-red-1 [&_textarea]:!bg-red-1',
                  tone === 'info' &&
                    'rounded-lg border border-orange-4 bg-orange-1 p-2 [&_button]:!bg-orange-1 [&_input]:!bg-orange-1 [&_textarea]:!bg-orange-1',
                  tone === 'success' &&
                    'rounded-lg border border-green-4 bg-green-1 p-2 [&_button]:!bg-green-1 [&_input]:!bg-green-1 [&_textarea]:!bg-green-1',
                  !tone &&
                    missingRequired &&
                    '[&_button]:!border-orange-7 [&_input]:!border-orange-7 [&_textarea]:!border-orange-7',
                )}
                key={fieldKey}
              >
                {ownLabel ? (
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex min-w-0 items-center gap-1.5'>
                      <span className='truncate text-13 font-medium text-gray-12'>
                        {label}
                        {required ? (
                          <span className='ml-0.5 text-red-9'>*</span>
                        ) : null}
                      </span>
                    </div>
                    {fromOcr ? (
                      <Tooltip content={t`Extracted by OCR`} position='top'>
                        <span className='ml-auto inline-flex shrink-0'>
                          <Icon
                            className='size-3.5 text-primary-11'
                            name='tabler:scan'
                          />
                        </span>
                      </Tooltip>
                    ) : null}
                    {fieldStatus ? (
                      <span
                        className={cn(
                          'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                          tone === 'danger' &&
                            'border-red-4 bg-red-2 text-red-11',
                          tone === 'info' &&
                            'border-orange-4 bg-orange-2 text-orange-11',
                          tone === 'success' &&
                            'border-green-4 bg-green-2 text-green-11',
                        )}
                      >
                        {fieldStatus}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {control}
              </div>
            )

            if (
              fieldType === 'table' ||
              fieldType === 'dynamic_table' ||
              fieldType.includes('table')
            ) {
              return frame(
                <TableFieldInput
                  disabled={fieldDisabled}
                  field={field}
                  label={label}
                  required={required}
                  value={value}
                  onChange={(jsonVal) => onFieldChange(fieldKey, jsonVal)}
                />,
                false,
              )
            }

            if (fieldType === 'date' || fieldType === 'datetime') {
              return frame(
                <InputDate
                  disabled={fieldDisabled}
                  value={value || ''}
                  onChange={(nextValue: string | null) =>
                    onFieldChange(fieldKey, nextValue || '')
                  }
                />,
              )
            }

            if (
              fieldType === 'select' ||
              fieldType === 'dropdown' ||
              fieldType === 'single_select' ||
              fieldType === 'multi_select' ||
              fieldType === 'single_choice' ||
              fieldType === 'multiple_choice' ||
              options.length > 0
            ) {
              const textVal = toTextValue(value)
              const selectedOption = findSelectedOption(options, textVal)
              const effectiveOptions =
                selectedOption &&
                !options.some(
                  (option) =>
                    String(option.value ?? '').toLowerCase() ===
                      String(selectedOption.value ?? '').toLowerCase() ||
                    String(option.name).toLowerCase() ===
                      selectedOption.name.toLowerCase() ||
                    String(option.id).toLowerCase() ===
                      String(selectedOption.id).toLowerCase(),
                )
                  ? [...options, selectedOption]
                  : options

              return frame(
                <InputSelect
                  creatable
                  disabled={fieldDisabled}
                  options={effectiveOptions}
                  searchable
                  value={selectedOption}
                  onChange={(selected) =>
                    onFieldChange(
                      fieldKey,
                      String(
                        selected?.value ?? selected?.name ?? selected?.id ?? '',
                      ),
                    )
                  }
                />,
              )
            }

            if (
              fieldType === 'long_text' ||
              fieldType === 'textarea' ||
              label.toLowerCase().includes('address')
            ) {
              return frame(
                <InputTextarea
                  disabled={fieldDisabled}
                  placeholder={placeholder}
                  rows={3}
                  value={toTextValue(value)}
                  onChange={(nextValue: string) =>
                    onFieldChange(fieldKey, nextValue)
                  }
                />,
              )
            }

            return frame(
              <InputText
                disabled={fieldDisabled}
                placeholder={placeholder}
                type={
                  fieldType === 'decimal' ||
                  fieldType === 'number' ||
                  fieldType === 'int' ||
                  fieldType === 'integer' ||
                  fieldType === 'currency'
                    ? 'number'
                    : 'text'
                }
                value={toTextValue(value)}
                onChange={(nextValue: string) =>
                  onFieldChange(fieldKey, nextValue)
                }
              />,
            )
          })
        )}
      </div>
    </div>
  )
}

export function RequiredProgressPie({
  className,
  filled,
  total,
}: {
  className?: string
  filled: number
  total: number
}) {
  const { t } = useLingui()
  const ratio = total <= 0 ? 0 : Math.min(1, Math.max(0, filled / total))
  const cx = 8
  const cy = 8
  const radius = 7
  const start = -Math.PI / 2
  const end = start + ratio * Math.PI * 2
  const x1 = cx + radius * Math.cos(start)
  const y1 = cy + radius * Math.sin(start)
  const x2 = cx + radius * Math.cos(end)
  const y2 = cy + radius * Math.sin(end)
  const largeArc = ratio > 0.5 ? 1 : 0
  const sector =
    ratio > 0 && ratio < 1
      ? `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
      : ''

  return (
    <Tooltip
      content={t`${filled} of ${total} Mandatory Fields Filled.`}
      position='top'
    >
      <span className={cn('inline-flex size-4 shrink-0', className)}>
        <svg aria-hidden className='size-full' viewBox='0 0 16 16'>
          <circle className='fill-primary-3' cx={cx} cy={cy} r={radius} />
          {ratio >= 1 ? (
            <circle className='fill-green-9' cx={cx} cy={cy} r={radius} />
          ) : sector ? (
            <path className='fill-primary-9' d={sector} />
          ) : null}
        </svg>
      </span>
    </Tooltip>
  )
}

export { getFieldKey as getDraftFieldKey }
