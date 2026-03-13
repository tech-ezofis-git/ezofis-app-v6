import { Portal } from '@mantine/core'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { QuestionType } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import cn from '@/utils/cn'

interface FieldType {
  category: TabType
  description: string
  icon: string
  label: string
  type: QuestionType | 'ADDRESS_INFO' | 'CONTACT_INFO'
  bgColor?: string
  iconColor?: string
}

type TabType =
  | 'explore'
  | 'popular'
  | 'advanced'
  | 'templates'
  | 'all'
  | 'display'
  | 'date_time'

const ALL_FIELDS: FieldType[] = [
  // Basic
  {
    bgColor: 'bg-blue-50',
    category: 'popular',
    description: 'Single line text input',
    icon: 'mdi:form-textbox',
    iconColor: '#3b82f6',
    label: 'Short Text',
    type: 'SHORT_TEXT',
  },
  {
    bgColor: 'bg-emerald-50',
    category: 'popular',
    description: 'Multi-line text area',
    icon: 'mdi:form-textarea',
    iconColor: '#10b981',
    label: 'Long Text',
    type: 'LONG_TEXT',
  },
  {
    bgColor: 'bg-amber-50',
    category: 'popular',
    description: 'Numeric only entry',
    icon: 'tabler:number-123',
    iconColor: '#f59e0b',
    label: 'Number',
    type: 'NUMBER',
  },
  {
    bgColor: 'bg-red-50',
    category: 'popular',
    description: 'Validated email input',
    icon: 'lucide:mail',
    iconColor: '#ef4444',
    label: 'Email',
    type: 'EMAIL',
  },
  {
    bgColor: 'bg-violet-50',
    category: 'popular',
    description: 'Phone number field',
    icon: 'lucide:phone',
    iconColor: '#8b5cf6',
    label: 'Phone',
    type: 'PHONE_NUMBER',
  },
  {
    bgColor: 'bg-indigo-50',
    category: 'popular',
    description: 'Secure text entry',
    icon: 'lucide:lock',
    iconColor: '#6366f1',
    label: 'Password',
    type: 'PASSWORD',
  },

  // Selections
  {
    bgColor: 'bg-pink-50',
    category: 'popular',
    description: 'Radio selection',
    icon: 'mdi:radiobox-marked',
    iconColor: '#ec4899',
    label: 'Choice',
    type: 'SINGLE_CHOICE',
  },
  {
    bgColor: 'bg-orange-50',
    category: 'popular',
    description: 'Select from list',
    icon: 'lucide:list-todo',
    iconColor: '#f97316',
    label: 'Dropdown',
    type: 'SINGLE_SELECT',
  },
  {
    bgColor: 'bg-teal-50',
    category: 'popular',
    description: 'Multi-select options',
    icon: 'lucide:square-check',
    iconColor: '#14b8a6',
    label: 'Checkbox',
    type: 'MULTI_SELECT',
  },

  // Date/Time
  {
    bgColor: 'bg-blue-50',
    category: 'date_time',
    description: 'Date picker',
    icon: 'lucide:calendar',
    iconColor: '#3b82f6',
    label: 'Date',
    type: 'DATE',
  },
  {
    bgColor: 'bg-emerald-50',
    category: 'date_time',
    description: 'Time picker',
    icon: 'lucide:clock',
    iconColor: '#10b981',
    label: 'Time',
    type: 'TIME',
  },

  // Templates
  {
    bgColor: 'bg-pink-50',
    category: 'templates',
    description: 'Name, Email, Phone block',
    icon: 'lucide:contact',
    iconColor: '#ec4899',
    label: 'Contact Template',
    type: 'CONTACT_INFO',
  },
  {
    bgColor: 'bg-orange-50',
    category: 'templates',
    description: 'Complete address group',
    icon: 'lucide:home',
    iconColor: '#f97316',
    label: 'Address Template',
    type: 'ADDRESS_INFO',
  },

  // Advanced
  {
    bgColor: 'bg-indigo-100',
    category: 'advanced',
    description: 'Structured data table',
    icon: 'lucide:table',
    iconColor: '#4f46e5',
    label: 'Table Grid',
    type: 'TABLE',
  },
  {
    bgColor: 'bg-indigo-50',
    category: 'advanced',
    description: 'Upload documents/images',
    icon: 'lucide:file-up',
    iconColor: '#6366f1',
    label: 'File Upload',
    type: 'FILE_UPLOAD',
  },
  {
    bgColor: 'bg-amber-50',
    category: 'advanced',
    description: 'Star or scale rating',
    icon: 'lucide:star',
    iconColor: '#f59e0b',
    label: 'Rating',
    type: 'RATING',
  },
  {
    bgColor: 'bg-blue-100',
    category: 'advanced',
    description: 'Location selector',
    icon: 'lucide:globe',
    iconColor: '#3b82f6',
    label: 'Country',
    type: 'COUNTRY_CODE',
  },

  // Display
  {
    bgColor: 'bg-slate-50',
    category: 'display',
    description: 'Static text or instructions',
    icon: 'lucide:text',
    iconColor: '#94a3b8',
    label: 'Paragraph',
    type: 'TEXT_BUILDER',
  },
  {
    bgColor: 'bg-slate-50',
    category: 'display',
    description: 'Section title',
    icon: 'lucide:heading',
    iconColor: '#94a3b8',
    label: 'Heading',
    type: 'HEADING',
  },
  {
    bgColor: 'bg-slate-50',
    category: 'display',
    description: 'Visual separator',
    icon: 'lucide:minus',
    iconColor: '#94a3b8',
    label: 'Divider',
    type: 'DIVIDER',
  },
]

interface Props {
  onClose: () => void
  onSelect: (type: QuestionType | 'ADDRESS_INFO' | 'CONTACT_INFO') => void
}

const AddFieldInline = ({ onClose, onSelect }: Props) => {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [activeTab, search])

  const filteredFields = ALL_FIELDS.filter((field) => {
    const matchesSearch =
      field.label.toLowerCase().includes(search.toLowerCase()) ||
      field.description.toLowerCase().includes(search.toLowerCase())
    const matchesTab = activeTab === 'all' || field.category === activeTab
    return matchesSearch && matchesTab
  })

  const renderItem = (field: FieldType) => (
    <button
      className='hover:bg-gray-50 group hover:border-gray-200 flex items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition-all duration-200'
      key={field.type}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onSelect(field.type)
      }}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm transition-colors',
          field.bgColor || 'bg-gray-50',
        )}
      >
        <Icon className='h-5 w-5 text-accent-primary' name={field.icon} />
      </div>
      <div className='flex min-w-0 flex-col'>
        <span className='truncate text-xs leading-tight font-bold text-gray-13 group-hover:text-accent-primary'>
          {field.label}
        </span>
        <span className='mt-0.5 truncate text-[10px] leading-none text-gray-5'>
          {field.description}
        </span>
      </div>
    </button>
  )

  return (
    <Portal>
      <div className='pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center'>
        {/* Click outside overlay - capture events */}
        <div
          className='pointer-events-auto absolute inset-0 z-0'
          onClick={onClose}
        />

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className='pointer-events-auto z-10 flex w-full max-w-[500px] flex-col overflow-hidden rounded-xl border border-gray-2 bg-white font-inter shadow-2xl'
          dragElastic={0}
          dragMomentum={false}
          initial={{ opacity: 0, y: 10 }}
          drag
        >
          {/* Search */}
          <div className='shrink-0 border-b border-gray-1 bg-white p-3'>
            <div className='relative'>
              <Input
                className='w-full'
                placeholder='Search fields...'
                value={search}
                classNames={{
                  input:
                    'border-gray-2 bg-gray-1 py-1.5 text-xs focus:bg-white',
                }}
                leftSection={
                  <Icon
                    className='text-gray-4'
                    height={14}
                    name='lucide:search'
                    width={14}
                  />
                }
                onChange={(val: string) => setSearch(val)}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className='flex min-h-0 flex-1 flex-col'>
            {/* Tabs */}
            <div className='no-scrollbar bg-gray-50/30 flex shrink-0 items-center gap-1 overflow-x-auto border-b border-gray-1 px-3 py-2'>
              {[
                { icon: 'lucide:layout-grid', id: 'all', label: 'All' },
                { icon: 'lucide:star', id: 'popular', label: 'Basic' },
                {
                  icon: 'lucide:layout-template',
                  id: 'templates',
                  label: 'Templates',
                },
                { icon: 'lucide:zap', id: 'advanced', label: 'Advanced' },
                { icon: 'lucide:type', id: 'display', label: 'Display' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-wider whitespace-nowrap uppercase transition-all duration-200',
                    activeTab === tab.id
                      ? 'bg-accent-soft text-accent-primary'
                      : 'hover:bg-gray-100 text-gray-11',
                  )}
                  onClick={() => setActiveTab(tab.id as any)}
                >
                  <Icon height={12} name={tab.icon} width={12} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div
              className='custom-scrollbar grid max-h-[360px] grid-cols-2 gap-1.5 overflow-y-auto p-3'
              ref={listRef}
            >
              {filteredFields.map((f) => renderItem(f))}
              {filteredFields.length === 0 && (
                <div className='col-span-2 mt-2 py-10 text-center text-gray-4'>
                  <Icon
                    className='mx-auto mb-2 h-8 w-8 opacity-20'
                    name='lucide:search-x'
                  />
                  <span className='text-xs font-medium'>
                    No elements found matching "{search}"
                  </span>
                </div>
              )}
            </div>
          </div>

          <style
            dangerouslySetInnerHTML={{
              __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e5e7eb;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #d1d5db;
                }
            `,
            }}
          />
        </motion.div>
      </div>
    </Portal>
  )
}

export default AddFieldInline
