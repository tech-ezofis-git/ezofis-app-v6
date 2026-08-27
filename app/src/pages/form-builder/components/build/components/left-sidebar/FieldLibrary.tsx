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
    activePanelId,
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
    const fallbackPanelId = activePanelId ?? panels[0]?.id
    const fallbackPanel = panels.find((p) => p.id === fallbackPanelId)
    const position =
      addFieldPosition ??
      (fallbackPanel
        ? { index: fallbackPanel.fields.length, panelId: fallbackPanel.id }
        : null)

    if (!position) return

    const { index, panelId } = position
    const questions = createFieldQuestions(type)

    questions.forEach((q, i) => {
      addQuestion(panelId, q, index + i)
    })

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
            className='rounded-md  p-1 text-gray-11 transition-colors  hover:bg-gray-2 hover:text-gray-13'
            onClick={() => setSidebarView('explorer')}
          >
            <Icon height={16} name='lucide:arrow-left' width={16} />
          </button>
          <div className='text-xs font-bold text-gray-13'>
            Fields Library
          </div>
        </div>
      </div>

      {/* Search */}
      <div className='sticky top-0 z-10 border-b border-gray-3 bg-white p-3'>
        <div className='group relative w-full'>
          <Icon
            height={14}
            name='lucide:search'
            width={14}
            className={cn(
              'absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-9 transition-colors',
              search && 'text-primary-9',
            )}
          />
          <input
            className='w-full rounded-lg border border-gray-3 bg-white py-1.5 pr-8 pl-8 text-xs font-semibold text-gray-12 opacity-100 transition-all outline-none placeholder:text-gray-9 focus:border-primary-9 focus:ring-2 focus:ring-primary-3 shadow-2xs'
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
              {cat.id !== 'popular' && (
                <div className='flex items-center gap-2 px-1 py-0.5'>
                  <div className='size-2 rounded-full bg-primary-9' />
                  <div className='text-xs font-bold text-gray-12'>
                    {cat.label}
                  </div>
                </div>
              )}
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
                        'group relative flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all duration-200 active:scale-[0.98]',
                        isSelected
                          ? 'border-primary-4 bg-primary-3/60 shadow-2xs'
                          : 'border-transparent bg-white hover:border-gray-3 hover:bg-gray-2',
                      )}
                      onClick={() => handleSelect(field.type)}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                    >
                      <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-3 text-primary-9 transition-transform duration-200 group-hover:scale-105'>
                        <Icon height={16} name={field.icon} width={16} />
                      </div>
                      <div className='flex min-w-0 flex-1 flex-col justify-center'>
                        <div className='truncate text-xs font-semibold text-gray-12 transition-colors group-hover:text-primary-9'>
                          {field.label}
                        </div>
                        <div className='truncate text-[10px] font-normal text-gray-10'>
                          {field.description}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'ml-auto flex size-6 shrink-0 items-center justify-center rounded-md text-primary-9 transition-all duration-200',
                          isSelected
                            ? 'translate-x-0 bg-primary-4/50 opacity-100'
                            : 'translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:bg-primary-3 group-hover:opacity-100',
                        )}
                      >
                        <Icon height={14} name='lucide:plus' width={14} />
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
