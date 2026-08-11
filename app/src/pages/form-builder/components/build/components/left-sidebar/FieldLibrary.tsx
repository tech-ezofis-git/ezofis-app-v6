import { useMemo, useState } from 'react'
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
  const { addFieldPosition, addQuestion, setAddFieldPosition, setSidebarView } =
    useFormStore()
  const [search, setSearch] = useState('')

  const filteredFields = useMemo(() => {
    if (!search.trim()) return ALL_FIELDS
    return ALL_FIELDS.filter(
      (f) =>
        f.label.toLowerCase().includes(search.toLowerCase()) ||
        f.description.toLowerCase().includes(search.toLowerCase()),
    )
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
          <div className='text-[11px] font-extrabold tracking-widest text-gray-10 uppercase'>
            Fields Library
          </div>
        </div>
      </div>

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
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            <div className='space-y-3.5' key={cat.id}>
              <div className='flex items-center justify-between px-1'>
                <div className='flex items-center gap-2'>
                  <div
                    className={cn(
                      'size-2 rounded-full shadow-sm',
                      theme.icon.replace('text', 'bg'),
                    )}
                  />
                  <div className='text-[11px] font-black tracking-[0.2em] text-gray-12 uppercase'>
                    {cat.label}
                  </div>
                </div>
                <div className='ml-4 h-px flex-1 bg-gradient-to-r from-gray-2 to-transparent' />
              </div>
              <div className='grid grid-cols-1 gap-2'>
                {catFields.map((field, idx) => (
                  <motion.button
                    animate={{ opacity: 1, x: 0 }}
                    className='group relative flex items-center gap-4 rounded-2xl border border-transparent bg-white/40 p-3 text-left shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-gray-2 hover:bg-white hover:shadow-[0_8px_25px_rgba(0,0,0,0.05)] active:scale-[0.97]'
                    initial={{ opacity: 0, x: -10 }}
                    key={field.type + field.label}
                    transition={{ delay: catIdx * 0.08 + idx * 0.04 }}
                    onClick={() => handleSelect(field.type)}
                  >
                    <div
                      className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-transparent transition-all duration-500',
                        theme.bg,
                        theme.icon,
                        'group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg group-hover:shadow-current/10',
                      )}
                    >
                      <Icon height={20} name={field.icon} width={20} />
                    </div>
                    <div className='flex min-w-0 flex-col'>
                      <div className='truncate text-[14px] font-bold tracking-tight text-gray-13 transition-colors group-hover:text-accent-primary'>
                        {field.label}
                      </div>
                      <div className='truncate text-[11px] leading-tight font-medium text-gray-5 opacity-70 transition-opacity group-hover:opacity-100'>
                        {field.description}
                      </div>
                    </div>
                    <div className='bg-gray-50 ml-auto flex size-8 translate-x-2 items-center justify-center rounded-full text-accent-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:bg-accent-soft group-hover:opacity-100'>
                      <Icon height={16} name='lucide:plus' width={16} />
                    </div>
                  </motion.button>
                ))}
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
