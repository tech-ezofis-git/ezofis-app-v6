import { useLingui } from '@lingui/react/macro'
import { type ReactNode, useEffect, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import InputDate from '@/components/base/inputs/InputDate'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import cn from '@/utils/cn'
import {
  getConfiguredFieldOptions,
  getFieldOptions,
} from '../utils/fieldRendering'

const formatDisplayValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-'
  if (Array.isArray(value)) {
    return value.length ? value.map(String).join(', ') : '-'
  }
  if (typeof value === 'object') return '-'
  return String(value)
}

const getFieldIconName = (label: string, type?: string) => {
  const l = `${label || ''} ${type || ''}`.toLowerCase()
  if (l.includes('email')) return 'lucide:mail'
  if (l.includes('phone') || l.includes('mobile')) return 'lucide:phone'
  if (l.includes('address') || l.includes('ship') || l.includes('billing'))
    return 'lucide:map-pin'
  if (l.includes('company') || l.includes('supplier') || l.includes('vendor'))
    return 'lucide:building-2'
  if (l.includes('project') || l.includes('type')) return 'lucide:folders'
  if (l.includes('invoice') || l.includes('quote') || l.includes('number'))
    return 'lucide:hash'
  if (l.includes('date') || l.includes('time')) return 'lucide:calendar'
  if (
    l.includes('amount') ||
    l.includes('price') ||
    l.includes('total') ||
    l.includes('currency') ||
    type === 'CURRENCY_AMOUNT' ||
    type === 'NUMBER'
  )
    return 'lucide:wallet'
  if (l.includes('flag') || l.includes('reason')) return 'lucide:flag'
  if (l.includes('contact') || l.includes('name')) return 'lucide:user'
  return 'lucide:file-text'
}

interface Props {
  field: any
  value: any
  error?: string
  readOnly?: boolean
  source?: 'ai' | 'manual' | 'ocr'
  onChange: (value: any) => void
}

const ExtractedFieldCell = ({
  error,
  field,
  readOnly,
  source = 'ocr',
  value,
  onChange,
}: Props) => {
  const { t } = useLingui()
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const label =
    field?.label ||
    field?.settings?.general?.label ||
    field?.name ||
    field?.title ||
    field?.settings?.title ||
    'Field'
  const type = String(field?.type || 'SHORT_TEXT').toUpperCase()
  const iconName = getFieldIconName(label, type)
  const display = formatDisplayValue(value)
  const missing = Boolean(error)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const commit = (next: any) => {
    setLocalValue(next)
    onChange(next)
  }

  const stopEditing = () => {
    setIsEditing(false)
    if (localValue !== value) onChange(localValue)
  }

  const sourceBadge =
    source === 'manual' ? (
      <span className='inline-flex shrink-0 items-center gap-1 rounded border border-[var(--orange-3)] bg-[var(--orange-1)] px-1.5 py-0.5 text-[10px] font-normal text-[var(--orange-10)]'>
        <Icon className='h-2.5 w-2.5' name='lucide:pencil' />
        <span>{t`Manual`}</span>
      </span>
    ) : source === 'ai' ? (
      <span className='inline-flex shrink-0 items-center gap-1 rounded border border-[var(--primary-3)] bg-[var(--primary-1)] px-1.5 py-0.5 text-[10px] font-normal text-[var(--primary-10)]'>
        <AiBrandIcon className='size-[10px] shrink-0' />
        <span>AI</span>
      </span>
    ) : (
      <span className='inline-flex shrink-0 items-center gap-1 rounded border border-[var(--teal-3)] bg-[var(--teal-1)] px-1.5 py-0.5 text-[10px] font-normal text-[var(--teal-10)]'>
        <Icon className='h-2.5 w-2.5' name='lucide:scan-text' />
        <span>OCR</span>
      </span>
    )

  let editor: ReactNode = null
  if (type === 'DATE') {
    editor = (
      <InputDate
        className='w-full font-semibold'
        value={
          localValue != null && localValue !== '' ? String(localValue) : null
        }
        onChange={(val) => commit(val || '')}
      />
    )
  } else if (
    type === 'NUMBER' ||
    type === 'CURRENCY_AMOUNT' ||
    type === 'COUNTER'
  ) {
    editor = (
      <InputNumber
        className='w-full font-semibold'
        value={localValue != null ? localValue : ''}
        onChange={(val) => commit(val)}
      />
    )
  } else if (
    type === 'SINGLE_SELECT' ||
    type === 'DROPDOWN' ||
    type === 'SINGLE_CHOICE'
  ) {
    const options =
      getConfiguredFieldOptions(field).length > 0
        ? getConfiguredFieldOptions(field)
        : getFieldOptions(field)
    const selected =
      localValue != null && localValue !== ''
        ? options.find((o) => String(o.id) === String(localValue)) || {
            id: String(localValue),
            name: String(localValue),
          }
        : null
    editor = (
      <InputSelect
        className='w-full font-semibold'
        options={options}
        value={selected}
        searchable
        onChange={(opt) => {
          commit(opt ? String(opt.id) : null)
          setIsEditing(false)
        }}
      />
    )
  } else if (type === 'LONG_TEXT') {
    editor = (
      <div
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            stopEditing()
          }
        }}
      >
        <InputTextarea
          className='w-full font-semibold'
          maxRows={6}
          minRows={2}
          value={localValue != null ? String(localValue) : ''}
          autosize
          onChange={(val) => setLocalValue(val)}
        />
      </div>
    )
  } else {
    editor = (
      <input
        className='w-full border-none bg-transparent p-0 text-[13px] font-semibold text-[var(--gray-13)] placeholder:font-normal focus:ring-0 focus:outline-none'
        placeholder={`Enter ${label}...`}
        type='text'
        autoFocus
        value={
          localValue === '-' || localValue == null ? '' : String(localValue)
        }
        onBlur={stopEditing}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') stopEditing()
          if (e.key === 'Escape') {
            setLocalValue(value)
            setIsEditing(false)
          }
        }}
      />
    )
  }

  const shellClass = cn(
    'group flex w-full items-start gap-3 rounded-lg p-3 text-left transition-all',
    isEditing
      ? 'border border-[var(--primary-3)] bg-surface shadow-sm ring-1 ring-[var(--primary-3)]/20'
      : 'border border-transparent bg-transparent hover:border-[var(--gray-3)] hover:bg-surface hover:shadow-sm',
    missing && 'border border-solid border-red-8 bg-red-1',
  )

  const body = (
    <>
      <div className='mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--gray-2)] text-[var(--gray-11)] transition-colors group-hover:bg-[var(--primary-3)] group-hover:text-[var(--primary-9)]'>
        <Icon className='h-3.5 w-3.5' name={iconName} />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='mb-0.5 flex min-w-0 flex-wrap items-center justify-between gap-1'>
          <p className='shrink-0 text-[10px] font-semibold text-[var(--gray-11)]'>
            {label}
          </p>
          <div className='flex shrink-0 items-center gap-1.5'>
            {sourceBadge}
          </div>
        </div>
        {isEditing ? (
          <div className='animate-in fade-in zoom-in-95 duration-200'>
            {editor}
          </div>
        ) : (
          <p
            className={cn(
              'text-[13px] leading-tight font-semibold text-[var(--gray-13)] transition-colors group-hover:text-[var(--primary-9)]',
              display === '-' && 'font-medium text-[var(--gray-9)]',
            )}
          >
            {display}
          </p>
        )}
        {missing ? (
          <p className='mt-1 text-12 font-medium text-red-9'>{error}</p>
        ) : null}
      </div>
    </>
  )

  if (readOnly || isEditing) {
    return (
      <div className={shellClass} data-field-id={field?.id}>
        {body}
      </div>
    )
  }

  return (
    <button
      data-field-id={field?.id}
      type='button'
      className={cn(
        shellClass,
        'cursor-pointer focus:ring-1 focus:ring-[var(--primary-3)]/50 focus:outline-none',
      )}
      onClick={() => setIsEditing(true)}
    >
      {body}
    </button>
  )
}

ExtractedFieldCell.displayName = 'ExtractedFieldCell'
export default ExtractedFieldCell
