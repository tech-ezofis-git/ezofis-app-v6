import { Portal } from '@mantine/core'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { QuestionType } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import cn from '@/utils/cn'
// import { Text } from '@mantine/core'

// type TabType = 'explore' | 'popular' | 'advanced' | 'templates' | 'all' | 'display' | 'date_time'

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

  // Advanced
  {
    category: 'advanced',
    description: 'Structured data table',
    icon: 'lucide:table',
    label: 'Table Grid',
    type: 'TABLE',
  },
  {
    category: 'advanced',
    description: 'Upload documents/images',
    icon: 'lucide:file-up',
    label: 'File Upload',
    type: 'FILE_UPLOAD',
  },
  {
    category: 'advanced',
    description: 'Total score calculation',
    icon: 'lucide:trophy',
    label: 'Score',
    type: 'SCORE',
  },
  {
    category: 'advanced',
    description: 'Customer feedback stars',
    icon: 'lucide:star',
    label: 'Rating',
    type: 'RATING',
  },
  {
    category: 'advanced',
    description: 'Dynamic formula-based result',
    icon: 'lucide:calculator',
    label: 'Calculated',
    type: 'CALCULATED',
  },
  {
    category: 'advanced',
    description: 'Linear numeric scale',
    icon: 'lucide:sliders',
    label: 'Scale',
    type: 'OPINION_SCALE',
  },
  {
    category: 'advanced',
    description: 'Digital signature pad',
    icon: 'lucide:pen-tool',
    label: 'Signature',
    type: 'SIGNATURE',
  },
  {
    category: 'advanced',
    description: '1-10 rating scale',
    icon: 'lucide:bar-chart',
    label: 'Opinion Scale',
    type: 'OPINION_SCALE',
  },
  {
    category: 'advanced',
    description: 'Location selector',
    icon: 'lucide:globe',
    label: 'Country',
    type: 'COUNTRY_CODE',
  },

  // Display
  {
    category: 'display',
    description: 'Static text or instructions',
    icon: 'lucide:text',
    label: 'Paragraph',
    type: 'TEXT_BUILDER',
  },
  {
    category: 'display',
    description: 'Section title',
    icon: 'lucide:heading',
    label: 'Heading',
    type: 'HEADING',
  },
  {
    category: 'display',
    description: 'Visual separator',
    icon: 'lucide:minus',
    label: 'Divider',
    type: 'DIVIDER',
  },
]

interface Props {
  anchorRect: DOMRect | null
  onClose: () => void
  onSelect: (type: QuestionType | 'ADDRESS_INFO' | 'CONTACT_INFO') => void
}

const AddFieldInline = ({ anchorRect, onClose, onSelect }: Props) => {
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [search])

  useEffect(() => {
    if (anchorRect && containerRef.current) {
      const menuWidth = 500 // Max width
      const menuHeight = containerRef.current.offsetHeight || 420
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight

      let left = anchorRect.left + anchorRect.width / 2 - menuWidth / 2
      let top = anchorRect.bottom + 12

      // Keep within horizontal bounds
      if (left < 20) left = 20
      if (left + menuWidth > windowWidth - 20)
        left = windowWidth - menuWidth - 20

      // If would go off bottom, show above instead
      if (top + menuHeight > windowHeight - 20) {
        top = anchorRect.top - menuHeight - 12
      }

      // Ensure top is not negative
      if (top < 20) top = 20

      setPosition({ left, top })
    }
  }, [anchorRect])

  const renderItem = (field: FieldType) => (
    <button
      className='w-full' // Make the button take full width of its grid cell
      key={field.type}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onSelect(field.type)
      }}
    >
      <div className='flex flex-col gap-1'>
        <div className='group flex cursor-pointer items-center justify-between gap-3 rounded-lg p-2 transition-all hover:bg-gray-1 active:scale-[0.98]'>
          <div className='flex items-center gap-3'>
            <div
              className={cn(
                'flex size-8 items-center justify-center rounded-lg border shadow-sm',
                'border-gray-2 bg-white text-gray-11 transition-all group-hover:border-accent-soft group-hover:bg-accent-soft group-hover:text-accent-primary',
              )}
            >
              <Icon height={16} name={field.icon} width={16} />
            </div>
            <div className='flex flex-col'>
              <span className='text-13 font-medium text-gray-12 transition-colors group-hover:text-accent-primary'>
                {field.label}
              </span>
              <span className='max-w-[200px] truncate text-11 text-gray-9'>
                {field.description}
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )

  if (!anchorRect) return null

  return (
    <Portal>
      <div className='pointer-events-none fixed inset-0 z-[10001] flex items-start justify-start'>
        {/* Click outside overlay - capture events */}
        <div
          className='bg-gray-900/5 animate-in fade-in pointer-events-auto absolute inset-0 z-0 backdrop-blur-[1px] duration-300'
          onClick={onClose}
        />

        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className='pointer-events-auto z-10 flex w-full max-w-[500px] flex-col overflow-hidden rounded-xl border border-gray-2 bg-white font-inter shadow-[0_20px_50px_rgba(0,0,0,0.15)]'
          initial={{ opacity: 0, scale: 0.95 }}
          ref={containerRef}
          style={{
            left: position.left,
            position: 'absolute',
            top: position.top,
          }}
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
            {/* Jump Nav (Mini) */}
            <div className='no-scrollbar bg-gray-50/50 sticky top-0 z-20 flex shrink-0 items-center gap-2 overflow-x-auto border-b border-gray-1 px-3 py-1.5'>
              {[
                { icon: 'lucide:star', id: 'popular', label: 'Basic' },
                {
                  icon: 'lucide:layout-template',
                  id: 'templates',
                  label: 'Templates',
                },
                { icon: 'lucide:zap', id: 'advanced', label: 'Advanced' },
                { icon: 'lucide:type', id: 'display', label: 'Display' },
              ].map((cat) => (
                <button
                  className='flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1 text-[9px] font-bold tracking-tight text-gray-5 uppercase transition-all hover:border-gray-2 hover:bg-white hover:text-accent-primary'
                  key={cat.id}
                  type='button'
                  onClick={() => {
                    const el = document.getElementById(`cat-${cat.id}`)
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  <Icon height={10} name={cat.icon} width={10} />
                  {cat.label}
                </button>
              ))}
            </div>

            <div
              className='custom-scrollbar flex max-h-[400px] flex-col gap-6 overflow-y-auto p-3'
              ref={listRef}
            >
              {[
                { id: 'popular', label: 'Basic Elements' },
                { id: 'templates', label: 'Smart Templates' },
                { id: 'advanced', label: 'Advanced Fields' },
                { id: 'display', label: 'Presentation' },
              ].map((cat) => {
                const catFields = ALL_FIELDS.filter(
                  (f) =>
                    f.category === cat.id &&
                    (f.label.toLowerCase().includes(search.toLowerCase()) ||
                      f.description
                        .toLowerCase()
                        .includes(search.toLowerCase())),
                )
                if (catFields.length === 0) return null

                return (
                  <div className='space-y-3' id={`cat-${cat.id}`} key={cat.id}>
                    <div className='sticky top-[0px] z-10 flex items-center gap-2 bg-white py-1'>
                      <div className='text-[10px] font-extrabold tracking-[0.1em] text-gray-11 uppercase'>
                        {cat.label}
                      </div>
                      <div className='h-px flex-1 bg-gray-1' />
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                      {catFields.map((f) => renderItem(f))}
                    </div>
                  </div>
                )
              })}

              {search &&
                ALL_FIELDS.filter(
                  (f) =>
                    f.label.toLowerCase().includes(search.toLowerCase()) ||
                    f.description.toLowerCase().includes(search.toLowerCase()),
                ).length === 0 && (
                  <div className='mt-2 py-10 text-center text-gray-4'>
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
