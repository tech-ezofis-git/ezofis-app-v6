import { Portal } from '@mantine/core'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { QuestionType } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import cn from '@/utils/cn'
import { Text } from '@mantine/core'

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
  { type: 'FULL_NAME', label: 'Full Name', icon: 'lucide:user', category: 'popular', description: 'Combined first & last name' },
  { type: 'SHORT_TEXT', label: 'Short Text', icon: 'mdi:form-textbox', category: 'popular', description: 'Single line text input' },
  { type: 'LONG_TEXT', label: 'Long Text', icon: 'mdi:form-textarea', category: 'popular', description: 'Multi-line text area' },
  { type: 'NUMBER', label: 'Number', icon: 'tabler:number-123', category: 'popular', description: 'Numeric only entry' },
  { type: 'EMAIL', label: 'Email', icon: 'lucide:mail', category: 'popular', description: 'Validated email input' },
  { type: 'PHONE_NUMBER', label: 'Phone', icon: 'lucide:phone', category: 'popular', description: 'Phone number field' },
  { type: 'PASSWORD', label: 'Password', icon: 'lucide:lock', category: 'popular', description: 'Secure text entry' },
  { type: 'URL', label: 'URL', icon: 'lucide:link', category: 'popular', description: 'Website link input' },

  // Selections
  { type: 'SINGLE_CHOICE', label: 'Choice', icon: 'mdi:radiobox-marked', category: 'popular', description: 'Radio selection' },
  { type: 'SINGLE_SELECT', label: 'Dropdown', icon: 'lucide:list-todo', category: 'popular', description: 'Select from list' },
  { type: 'MULTI_SELECT', label: 'Checkbox', icon: 'lucide:square-check', category: 'popular', description: 'Multi-select options' },
  { type: 'YES_NO_TOGGLE', label: 'Yes/No', icon: 'lucide:toggle-left', category: 'popular', description: 'Binary toggle switch' },

  // Date/Time
  { type: 'DATE', label: 'Date', icon: 'lucide:calendar', category: 'date_time', description: 'Date picker' },
  { type: 'TIME', label: 'Time', icon: 'lucide:clock', category: 'date_time', description: 'Time picker' },

  // Templates
  { type: 'CONTACT_INFO', label: 'Contact Template', icon: 'lucide:contact', category: 'templates', description: 'Name, Email, Phone block' },
  { type: 'ADDRESS_INFO', label: 'Address Template', icon: 'lucide:home', category: 'templates', description: 'Complete address group' },
  { type: 'ADDRESS', label: 'Address', icon: 'lucide:map-pin', category: 'templates', description: 'Street, City, State, Zip' },
  { type: 'CONSENT', label: 'Consent', icon: 'lucide:shield-check', category: 'templates', description: 'Agreement checkbox block' },

  // Advanced
  { type: 'TABLE', label: 'Table Grid', icon: 'lucide:table', category: 'advanced', description: 'Structured data table' },
  { type: 'FILE_UPLOAD', label: 'File Upload', icon: 'lucide:file-up', category: 'advanced', description: 'Upload documents/images' },
  { type: 'IMAGE_UPLOAD', label: 'Image Upload', icon: 'lucide:image', category: 'advanced', description: 'Photos only upload' },
  { type: 'RATING', label: 'Rating', icon: 'lucide:star', category: 'advanced', description: 'Star or scale rating' },
  { type: 'SCORE', label: 'Score', icon: 'lucide:hash', category: 'advanced', description: '1-10 numeric scale' },
  { type: 'SIGNATURE', label: 'Signature', icon: 'lucide:pen-tool', category: 'advanced', description: 'Digital signature pad' },
  { type: 'OPINION_SCALE', label: 'Opinion Scale', icon: 'lucide:bar-chart', category: 'advanced', description: '1-10 rating scale' },
  { type: 'COUNTRY_CODE', label: 'Country', icon: 'lucide:globe', category: 'advanced', description: 'Location selector' },

  // Display
  { type: 'TEXT_BUILDER', label: 'Paragraph', icon: 'lucide:text', category: 'display', description: 'Static text or instructions' },
  { type: 'HEADING', label: 'Heading', icon: 'lucide:heading', category: 'display', description: 'Section title' },
  { type: 'DIVIDER', label: 'Divider', icon: 'lucide:minus', category: 'display', description: 'Visual separator' },
]

interface Props {
  onSelect: (type: QuestionType | 'ADDRESS_INFO' | 'CONTACT_INFO') => void
  onClose: () => void
  anchorRect: DOMRect | null
}

const AddFieldInline = ({ onSelect, onClose, anchorRect }: Props) => {
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 })
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

      let left = anchorRect.left + (anchorRect.width / 2) - (menuWidth / 2)
      let top = anchorRect.bottom + 12

      // Keep within horizontal bounds
      if (left < 20) left = 20
      if (left + menuWidth > windowWidth - 20) left = windowWidth - menuWidth - 20

      // If would go off bottom, show above instead
      if (top + menuHeight > windowHeight - 20) {
        top = anchorRect.top - menuHeight - 12
      }

      // Ensure top is not negative
      if (top < 20) top = 20

      setPosition({ top, left })
    }
  }, [anchorRect])


  const renderItem = (field: FieldType) => (
    <button
      key={field.type}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onSelect(field.type)
      }}
      className="w-full" // Make the button take full width of its grid cell
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3 p-2 group hover:bg-gray-1 rounded-lg cursor-pointer transition-all active:scale-[0.98]">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center size-8 rounded-lg shadow-sm border",
              "bg-white text-gray-11 border-gray-2 group-hover:bg-accent-soft group-hover:text-accent-primary group-hover:border-accent-soft transition-all"
            )}>
              <Icon name={field.icon} width={16} height={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-13 font-medium text-gray-12 group-hover:text-accent-primary transition-colors">{field.label}</span>
              <span className="text-11 text-gray-9 truncate max-w-[200px]">{field.description}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )

  if (!anchorRect) return null

  return (
    <Portal>
      <div className="fixed inset-0 pointer-events-none z-[10001] flex items-start justify-start">
        {/* Click outside overlay - capture events */}
        <div className="absolute inset-0 z-0 pointer-events-auto bg-gray-900/5 backdrop-blur-[1px] animate-in fade-in duration-300" onClick={onClose} />

        <motion.div
          ref={containerRef}
          style={{
            top: position.top,
            left: position.left,
            position: 'absolute'
          }}
          className='w-full max-w-[500px] pointer-events-auto flex flex-col overflow-hidden rounded-xl bg-white border border-gray-2 shadow-[0_20px_50px_rgba(0,0,0,0.15)] font-inter z-10'
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >


          {/* Search */}
          <div className='p-3 shrink-0 border-b border-gray-1 bg-white'>
            <div className='relative'>
              <Input
                placeholder='Search fields...'
                value={search}
                onChange={(val: string) => setSearch(val)}
                className='w-full'
                classNames={{
                  input: 'bg-gray-1 border-gray-2 focus:bg-white text-xs py-1.5'
                }}
                leftSection={<Icon name='lucide:search' width={14} height={14} className='text-gray-4' />}

              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col flex-1 min-h-0">
            {/* Jump Nav (Mini) */}
            <div className='px-3 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 border-b border-gray-1 bg-gray-50/50 sticky top-0 z-20'>
              {[
                { id: 'popular', label: 'Basic', icon: 'lucide:star' },
                { id: 'templates', label: 'Templates', icon: 'lucide:layout-template' },
                { id: 'advanced', label: 'Advanced', icon: 'lucide:zap' },
                { id: 'display', label: 'Display', icon: 'lucide:type' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`cat-${cat.id}`)
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold text-gray-5 hover:bg-white hover:text-accent-primary transition-all border border-transparent hover:border-gray-2 uppercase tracking-tight"
                >
                  <Icon name={cat.icon} width={10} height={10} />
                  {cat.label}
                </button>
              ))}
            </div>

            <div
              ref={listRef}
              className='p-3 overflow-y-auto max-h-[400px] custom-scrollbar flex flex-col gap-6'
            >
              {[
                { id: 'popular', label: 'Basic Elements' },
                { id: 'templates', label: 'Smart Templates' },
                { id: 'advanced', label: 'Advanced Fields' },
                { id: 'display', label: 'Presentation' },
              ].map((cat) => {
                const catFields = ALL_FIELDS.filter(f =>
                  f.category === cat.id &&
                  (f.label.toLowerCase().includes(search.toLowerCase()) ||
                    f.description.toLowerCase().includes(search.toLowerCase()))
                )
                if (catFields.length === 0) return null

                return (
                  <div key={cat.id} id={`cat-${cat.id}`} className="space-y-3">
                    <div className="flex items-center gap-2 sticky top-[0px] bg-white z-10 py-1">
                      <Text size="10px" fw={800} className="text-gray-11 uppercase tracking-[0.1em]">{cat.label}</Text>
                      <div className="flex-1 h-px bg-gray-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {catFields.map(f => renderItem(f))}
                    </div>
                  </div>
                )
              })}

              {search && ALL_FIELDS.filter(f =>
                f.label.toLowerCase().includes(search.toLowerCase()) ||
                f.description.toLowerCase().includes(search.toLowerCase())
              ).length === 0 && (
                  <div className='py-10 text-center text-gray-4 mt-2'>
                    <Icon name='lucide:search-x' className='mx-auto mb-2 h-8 w-8 opacity-20' />
                    <span className='text-xs font-medium'>No elements found matching "{search}"</span>
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
