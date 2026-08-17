import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import { createFieldQuestions } from '@/pages/form-builder/helpers/field-utils'
import {
  type QuestionType,
  useFormStore,
} from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

export type CategoryType =
  | 'popular'
  | 'templates'
  | 'advanced'
  | 'display'
  | 'date_time'

export interface FieldType {
  category: CategoryType
  description: string
  icon: string
  label: string
  type:
    | QuestionType
    | 'ADDRESS_INFO'
    | 'CONTACT_INFO'
    | 'INVOICE_REPORT'
    | 'FINANCIAL_AUDIT'
}

export const ALL_FIELDS: FieldType[] = [
  // Basic
  {
    category: 'popular',
    description: 'Combined first & last name',
    icon: 'lucide:user',
    label: 'Full Name',
    type: 'FULL_NAME',
  },
  {
    category: 'popular',
    description: 'Single line text input',
    icon: 'mdi:form-textbox',
    label: 'Short Text',
    type: 'SHORT_TEXT',
  },
  {
    category: 'popular',
    description: 'Multi-line text area',
    icon: 'mdi:form-textarea',
    label: 'Long Text',
    type: 'LONG_TEXT',
  },
  {
    category: 'popular',
    description: 'Numeric only entry',
    icon: 'tabler:number-123',
    label: 'Number',
    type: 'NUMBER',
  },
  {
    category: 'popular',
    description: 'Increment/Decrement field',
    icon: 'lucide:binary',
    label: 'Counter',
    type: 'COUNTER',
  },
  {
    category: 'popular',
    description: 'Financial amount with unit',
    icon: 'lucide:banknote',
    label: 'Currency',
    type: 'CURRENCY_AMOUNT',
  },
  {
    category: 'popular',
    description: 'Visual section separator',
    icon: 'lucide:separator-horizontal',
    label: 'Divider',
    type: 'DIVIDER',
  },
  {
    category: 'popular',
    description: 'Intl. dialing prefix',
    icon: 'lucide:globe',
    label: 'Country',
    type: 'COUNTRY_CODE',
  },
  {
    category: 'popular',
    description: 'Validated email input',
    icon: 'lucide:mail',
    label: 'Email',
    type: 'EMAIL',
  },
  {
    category: 'popular',
    description: 'Document & media capture',
    icon: 'lucide:upload-cloud',
    label: 'File Upload',
    type: 'FILE_UPLOAD',
  },
  {
    category: 'popular',
    description: 'Secure text entry',
    icon: 'lucide:lock',
    label: 'Password',
    type: 'PASSWORD',
  },
  {
    category: 'popular',
    description: 'Rich-text & dynamic content',
    icon: 'lucide:type',
    label: 'Text Builder',
    type: 'TEXT_BUILDER',
  },
  {
    category: 'popular',
    description: 'Spreadsheet-style data entry',
    icon: 'lucide:layout-grid',
    label: 'Table',
    type: 'TABLE',
  },
  {
    category: 'popular',
    description: 'Phone number field',
    icon: 'lucide:phone',
    label: 'Phone',
    type: 'PHONE_NUMBER',
  },
  {
    category: 'popular',
    description: 'Star or heart-based feedback',
    icon: 'lucide:star',
    label: 'Rating',
    type: 'RATING',
  },
  {
    category: 'popular',
    description: 'Numbered 0-10 satisfaction scale',
    icon: 'lucide:bar-chart-3',
    label: 'Opinion Scale',
    type: 'OPINION_SCALE',
  },
  {
    category: 'popular',
    description: 'Hand-drawn signature capture',
    icon: 'lucide:pen-tool',
    label: 'Signature',
    type: 'SIGNATURE',
  },
  {
    category: 'popular',
    description: 'Website link input',
    icon: 'lucide:link',
    label: 'URL',
    type: 'URL',
  },

  // Selections
  {
    category: 'popular',
    description: 'Radio selection',
    icon: 'mdi:radiobox-marked',
    label: 'Choice',
    type: 'SINGLE_CHOICE',
  },
  {
    category: 'popular',
    description: 'Select from list',
    icon: 'lucide:list-todo',
    label: 'Dropdown',
    type: 'SINGLE_SELECT',
  },
  {
    category: 'popular',
    description: 'Multi-select options',
    icon: 'lucide:square-check',
    label: 'Checkbox',
    type: 'MULTI_SELECT',
  },
  {
    category: 'popular',
    description: 'Binary toggle switch',
    icon: 'lucide:toggle-left',
    label: 'Yes/No',
    type: 'YES_NO_TOGGLE',
  },

  // Date/Time
  {
    category: 'date_time',
    description: 'Date picker',
    icon: 'lucide:calendar',
    label: 'Date',
    type: 'DATE',
  },
  {
    category: 'date_time',
    description: 'Time picker',
    icon: 'lucide:clock',
    label: 'Time',
    type: 'TIME',
  },

  // Templates
  {
    category: 'templates',
    description: 'Name, Email, Phone block',
    icon: 'lucide:contact',
    label: 'Contact Template',
    type: 'CONTACT_INFO',
  },
  {
    category: 'templates',
    description: 'Complete address group',
    icon: 'lucide:home',
    label: 'Address Template',
    type: 'ADDRESS_INFO',
  },
  {
    category: 'templates',
    description: 'Street, City, State, Zip',
    icon: 'lucide:map-pin',
    label: 'Address',
    type: 'ADDRESS',
  },
  {
    category: 'templates',
    description: 'Agreement checkbox block',
    icon: 'lucide:shield-check',
    label: 'Consent',
    type: 'CONSENT',
  },
  {
    category: 'templates',
    description: 'Invoice & PO matching summary',
    icon: 'lucide:file-text',
    label: 'Invoice Report',
    type: 'INVOICE_REPORT',
  },
  {
    category: 'templates',
    description: 'GL matching & financial audit report',
    icon: 'lucide:file-chart-column',
    label: 'Financial Audit',
    type: 'FINANCIAL_AUDIT',
  },

  // Advanced
  {
    category: 'advanced',
    description: 'Total score calculation',
    icon: 'lucide:trophy',
    label: 'Score',
    type: 'SCORE',
  },
  {
    category: 'advanced',
    description: 'Dynamic formula-based result',
    icon: 'lucide:calculator',
    label: 'Calculated',
    type: 'CALCULATED',
  },
]

import { motion } from 'framer-motion'

const FIELD_THEMES: Record<
  CategoryType,
  { accent: string; bg: string; icon: string }
> = {
  advanced: {
    accent: 'group-hover:bg-amber-600',
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
  },
  date_time: {
    accent: 'group-hover:bg-cyan-600',
    bg: 'bg-cyan-50',
    icon: 'text-cyan-600',
  },
  display: {
    accent: 'group-hover:bg-emerald-600',
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
  },
  popular: {
    accent: 'group-hover:bg-blue-600',
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
  },
  templates: {
    accent: 'group-hover:bg-purple-600',
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
  },
}

const FieldLibrary = () => {
  const {
    addFieldPosition,
    addQuestion,
    panels,
    setAddFieldPosition,
    setSidebarView,
  } = useFormStore()
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  const targetPanel = panels.find((p) => p.id === addFieldPosition?.panelId)

  const filteredFields = useMemo(() => {
    if (!search.trim()) return ALL_FIELDS
    return ALL_FIELDS.filter(
      (f) =>
        f.label.toLowerCase().includes(search.toLowerCase()) ||
        f.description.toLowerCase().includes(search.toLowerCase()),
    )
  }, [search])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const handleSelect = (type: string) => {
    if (!addFieldPosition) return

    const { index, panelId } = addFieldPosition
    const questions = createFieldQuestions(type)

    questions.forEach((q, i) => {
      addQuestion(panelId, q, index + i)
    })

    setSidebarView('explorer')
    setAddFieldPosition(null)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredFields.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % filteredFields.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(
        (prev) => (prev - 1 + filteredFields.length) % filteredFields.length,
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(filteredFields[selectedIndex].type)
    }
  }

  const categories = [
    { id: 'popular', label: 'Basic Elements' },
    { id: 'templates', label: 'Smart Templates' },
    { id: 'advanced', label: 'Advanced Fields' },
    { id: 'display', label: 'Presentation' },
    { id: 'date_time', label: 'Date & Time' },
  ]

  return (
    <div className='animate-in fade-in slide-in-from-bottom-4 flex h-full flex-col duration-500'>
      {/* Header */}
      <div className='sticky top-0 z-20 flex items-center justify-between border-b border-gray-2 bg-white px-4 py-3'>
        <div className='flex items-center gap-2'>
          <button
            className='rounded-md p-1 text-gray-5 transition-colors hover:bg-gray-1'
            onClick={() => setSidebarView('explorer')}
          >
            <Icon height={16} name='lucide:arrow-left' width={16} />
          </button>
          <div className='text-xs font-bold text-gray-13'>
            Fields Library
          </div>
        </div>
      </div>

      {/* Target panel indicator + quick retarget */}
      {panels.length > 0 && (
        <div className='border-b border-gray-2 bg-accent-soft/5 px-3 py-2'>
          <div className='mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-gray-8'>
            <Icon
              className='text-accent-primary'
              height={12}
              name='lucide:corner-down-right'
              width={12}
            />
            <span>Adding to:</span>
            <span className='truncate font-bold text-accent-primary'>
              {targetPanel?.settings.title || 'Untitled Section'}
            </span>
          </div>
          {panels.length > 1 && (
            <div className='no-scrollbar flex items-center gap-1.5 overflow-x-auto'>
              {panels.map((p) => (
                <button
                  key={p.id}
                  className={cn(
                    'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap transition-colors',
                    p.id === targetPanel?.id
                      ? 'border-accent-primary bg-accent-primary text-white'
                      : 'border-gray-2 bg-white text-gray-7 hover:border-accent-soft hover:text-accent-primary',
                  )}
                  onClick={() =>
                    setAddFieldPosition({
                      index: p.fields.length,
                      panelId: p.id,
                    })
                  }
                >
                  {p.settings.title || 'Untitled Section'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className='sticky top-12 z-10 border-b border-gray-2 bg-white/50 p-3 backdrop-blur-sm'>
        <div className='group relative'>
          <Icon
            height={13}
            name='lucide:search'
            width={13}
            className={cn(
              'absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-4 transition-colors',
              search && 'text-accent-primary',
            )}
          />
          <input
            className='bg-gray-50 w-full rounded-lg border border-gray-2 py-1.5 pr-8 pl-8 text-xs font-medium transition-all outline-none placeholder:text-gray-4 focus:border-accent-primary focus:bg-white focus:ring-2 focus:ring-accent-soft/20'
            placeholder='Search fields...'
            ref={searchRef}
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
      </div>

      {/* List */}
      <div className='custom-scrollbar flex-1 space-y-8 overflow-y-auto p-3 pb-10'>
        {categories.map((cat, catIdx) => {
          const catFields = filteredFields.filter((f) => f.category === cat.id)
          if (catFields.length === 0) return null
          const theme = FIELD_THEMES[cat.id as CategoryType]

          return (
            <div className='space-y-3' key={cat.id}>
              <div className='flex items-center gap-2 px-1 py-1'>
                <div className='size-2.5 rounded-full bg-primary-9 shadow-xs' />
                <div className='text-sm font-bold text-gray-12'>
                  {cat.label}
                </div>
              </div>
              <div className='grid grid-cols-1 gap-2'>
                {catFields.map((field, idx) => {
                  const flatIndex = filteredFields.indexOf(field)
                  const isSelected = flatIndex === selectedIndex
                  return (
                    <motion.button
                      animate={{ opacity: 1, x: 0 }}
                      initial={{ opacity: 0, x: -10 }}
                      key={field.type + field.label}
                      transition={{ delay: catIdx * 0.06 + idx * 0.03 }}
                      className={cn(
                        'group relative flex items-center gap-3.5 rounded-2xl border p-3 text-left transition-all duration-200 active:scale-[0.98]',
                        isSelected
                          ? 'border-primary-4 bg-primary-3/50 shadow-2xs'
                          : 'border-transparent bg-gray-1/60 hover:border-gray-3 hover:bg-gray-2/80',
                      )}
                      onClick={() => handleSelect(field.type)}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                    >
                      <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-3 text-primary-9 transition-transform duration-200 group-hover:scale-105'>
                        <Icon height={20} name={field.icon} width={20} />
                      </div>
                      <div className='flex min-w-0 flex-1 flex-col justify-center'>
                        <div className='truncate text-sm font-bold text-gray-12 transition-colors group-hover:text-primary-9'>
                          {field.label}
                        </div>
                        <div className='truncate text-xs font-normal text-gray-10'>
                          {field.description}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'ml-auto flex size-7 shrink-0 items-center justify-center rounded-lg text-primary-9 transition-all duration-200',
                          isSelected
                            ? 'translate-x-0 bg-primary-4/50 opacity-100'
                            : 'translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:bg-primary-3 group-hover:opacity-100',
                        )}
                      >
                        <Icon height={16} name='lucide:plus' width={16} />
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {filteredFields.length === 0 && (
          <div className='py-20 text-center'>
            <Icon
              className='mx-auto mb-2 h-8 w-8 text-gray-3 opacity-50'
              name='lucide:search-x'
            />
            <div className='text-xs font-bold tracking-widest text-gray-4 uppercase'>
              No matching fields
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FieldLibrary
