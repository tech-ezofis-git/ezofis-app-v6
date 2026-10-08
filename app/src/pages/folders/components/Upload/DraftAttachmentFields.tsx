import { useLingui } from '@lingui/react/macro'
import BaseButton from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'
import InputDate from '@/components/base/inputs/InputDate'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
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
  fieldValues: Record<string, string>
  isAnalyzing?: boolean
  onExport: () => void
  onFieldChange: (fieldKey: string, value: string) => void
  onRegenerate?: () => void
}

export default function DraftAttachmentFields({
  disabled = false,
  exportDisabled = false,
  exportLoading = false,
  fields,
  fieldValues,
  isAnalyzing = false,
  onExport,
  onFieldChange,
  onRegenerate,
}: DraftAttachmentFieldsProps) {
  const { t } = useLingui()

  const filledCount = fields.filter(
    (field) => String(fieldValues[getFieldKey(field)] ?? '').trim().length > 0,
  ).length

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
                icon='tabler:scan'
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

      <div className='ez-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3'>
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

            if (
              fieldType === 'table' ||
              fieldType === 'dynamic_table' ||
              fieldType.includes('table')
            ) {
              return (
                <TableFieldInput
                  key={fieldKey}
                  disabled={fieldDisabled}
                  field={field}
                  label={label}
                  required={required}
                  value={value}
                  onChange={(jsonVal) => onFieldChange(fieldKey, jsonVal)}
                />
              )
            }

            if (fieldType === 'date' || fieldType === 'datetime') {
              return (
                <InputDate
                  key={fieldKey}
                  disabled={fieldDisabled}
                  label={label}
                  required={required}
                  value={value || ''}
                  onChange={(nextValue: string | null) =>
                    onFieldChange(fieldKey, nextValue || '')
                  }
                />
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

              return (
                <InputSelect
                  key={fieldKey}
                  creatable
                  disabled={fieldDisabled}
                  label={label}
                  options={effectiveOptions}
                  required={required}
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
                />
              )
            }

            if (
              fieldType === 'long_text' ||
              fieldType === 'textarea' ||
              label.toLowerCase().includes('address')
            ) {
              return (
                <InputTextarea
                  key={fieldKey}
                  disabled={fieldDisabled}
                  label={label}
                  placeholder={placeholder}
                  required={required}
                  rows={3}
                  value={toTextValue(value)}
                  onChange={(nextValue: string) =>
                    onFieldChange(fieldKey, nextValue)
                  }
                />
              )
            }

            return (
              <InputText
                key={fieldKey}
                disabled={fieldDisabled}
                label={label}
                placeholder={placeholder}
                required={required}
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
              />
            )
          })
        )}
      </div>
    </div>
  )
}

export { getFieldKey as getDraftFieldKey }
