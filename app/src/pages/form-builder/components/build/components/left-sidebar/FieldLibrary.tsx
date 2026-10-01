import type React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import { createFieldQuestions } from '@/pages/form-builder/helpers/field-utils'
import {
  type QuestionType,
  useFormStore,
} from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

export interface FieldType {
  description: string
  icon: string
  label: string
  section: SectionTier
  type:
    | QuestionType
    | 'ADDRESS_INFO'
    | 'CONTACT_INFO'
    | 'INVOICE_REPORT'
    | 'FINANCIAL_AUDIT'
}

export interface SectionConfig {
  id: SectionTier
  collapsible?: boolean
  description?: string
  hideHeader?: boolean
  label?: string
}

export type SectionTier =
  | 'tier1'
  | 'tier2'
  | 'tier3'
  | 'tier4'
  | 'tier5'
  | 'tier6'

export const SECTION_CONFIGS: SectionConfig[] = [
  { hideHeader: true, id: 'tier1' },
  { hideHeader: true, id: 'tier2' },
  { id: 'tier3', label: 'Structural & Layout' },
  { id: 'tier4', label: 'Smart Templates' },
  { id: 'tier5', label: 'Specialized' },
  { collapsible: true, id: 'tier6', label: 'Advanced Fields' },
]

export const ALL_FIELDS: FieldType[] = [
  // Tier 1 – Core / Most Used (top of list)
  {
    description: 'Single line text input',
    icon: 'mdi:form-textbox',
    label: 'Short Text',
    section: 'tier1',
    type: 'SHORT_TEXT',
  },
  {
    description: 'Multi-line text area',
    icon: 'mdi:form-textarea',
    label: 'Long Text',
    section: 'tier1',
    type: 'LONG_TEXT',
  },
  {
    description: 'Validated email input',
    icon: 'lucide:mail',
    label: 'Email',
    section: 'tier1',
    type: 'EMAIL',
  },
  {
    description: 'Numeric only entry',
    icon: 'tabler:number-123',
    label: 'Number',
    section: 'tier1',
    type: 'NUMBER',
  },
  {
    description: 'Phone number field',
    icon: 'lucide:phone',
    label: 'Phone',
    section: 'tier1',
    type: 'PHONE_NUMBER',
  },
  {
    description: 'Select from list',
    icon: 'lucide:list-todo',
    label: 'Dropdown',
    section: 'tier1',
    type: 'SINGLE_SELECT',
  },
  {
    description: 'Radio selection',
    icon: 'mdi:radiobox-marked',
    label: 'Single Choice',
    section: 'tier1',
    type: 'SINGLE_CHOICE',
  },
  {
    description: 'Multiple checkboxes selection',
    icon: 'lucide:check-square',
    label: 'Multiple Choice',
    section: 'tier1',
    type: 'MULTIPLE_CHOICE',
  },
  {
    description: 'Binary toggle switch',
    icon: 'lucide:toggle-left',
    label: 'Yes/No',
    section: 'tier1',
    type: 'YES_NO_TOGGLE',
  },
  {
    description: 'Date picker',
    icon: 'lucide:calendar',
    label: 'Date',
    section: 'tier1',
    type: 'DATE',
  },
  {
    description: 'Document & media capture',
    icon: 'lucide:upload-cloud',
    label: 'File Upload',
    section: 'tier1',
    type: 'FILE_UPLOAD',
  },

  // Tier 2 – Common but secondary
  {
    description: 'Searchable dropdown, multiple picks',
    icon: 'lucide:list-checks',
    label: 'Multi Select',
    section: 'tier2',
    type: 'MULTI_SELECT',
  },
  {
    description: 'Combined first & last name',
    icon: 'lucide:user',
    label: 'Full Name',
    section: 'tier2',
    type: 'FULL_NAME',
  },
  {
    description: 'Financial amount with unit',
    icon: 'lucide:banknote',
    label: 'Currency',
    section: 'tier2',
    type: 'CURRENCY_AMOUNT',
  },
  {
    description: 'Star or heart-based feedback',
    icon: 'lucide:star',
    label: 'Rating',
    section: 'tier2',
    type: 'RATING',
  },
  {
    description: 'Numbered 0-10 satisfaction scale',
    icon: 'lucide:bar-chart-3',
    label: 'Opinion Scale',
    section: 'tier2',
    type: 'OPINION_SCALE',
  },
  {
    description: 'Website link input',
    icon: 'lucide:link',
    label: 'URL',
    section: 'tier2',
    type: 'URL',
  },
  {
    description: 'Time picker',
    icon: 'lucide:clock',
    label: 'Time',
    section: 'tier2',
    type: 'TIME',
  },
  {
    description: 'Combined date & time picker',
    icon: 'lucide:calendar-clock',
    label: 'Date & Time',
    section: 'tier2',
    type: 'DATE_TIME',
  },

  // Tier 3 – Structural / layout helpers
  {
    description: 'Visual section separator',
    icon: 'lucide:separator-horizontal',
    label: 'Divider',
    section: 'tier3',
    type: 'DIVIDER',
  },
  {
    description: 'Spreadsheet-style data entry',
    icon: 'lucide:layout-grid',
    label: 'Table',
    section: 'tier3',
    type: 'TABLE',
  },
  {
    description: 'Rich-text & dynamic content',
    icon: 'lucide:type',
    label: 'Text Builder',
    section: 'tier3',
    type: 'TEXT_BUILDER',
  },

  // Tier 4 – Smart Templates
  {
    description: 'Name, Email, Phone block',
    icon: 'lucide:contact',
    label: 'Contact Template',
    section: 'tier4',
    type: 'CONTACT_INFO',
  },
  {
    description: 'Complete address group',
    icon: 'lucide:home',
    label: 'Address Template',
    section: 'tier4',
    type: 'ADDRESS_INFO',
  },
  {
    description: 'Street, City, State, Zip',
    icon: 'lucide:map-pin',
    label: 'Address',
    section: 'tier4',
    type: 'ADDRESS',
  },
  {
    description: 'Agreement checkbox block',
    icon: 'lucide:shield-check',
    label: 'Consent',
    section: 'tier4',
    type: 'CONSENT',
  },

  // Tier 5 – Specialized / low-frequency
  {
    description: 'Intl. dialing prefix',
    icon: 'lucide:globe',
    label: 'Country',
    section: 'tier5',
    type: 'COUNTRY_CODE',
  },
  {
    description: 'Secure text entry',
    icon: 'lucide:lock',
    label: 'Password',
    section: 'tier5',
    type: 'PASSWORD',
  },
  {
    description: 'Hand-drawn signature capture',
    icon: 'lucide:pen-tool',
    label: 'Signature',
    section: 'tier5',
    type: 'SIGNATURE',
  },
  {
    description: 'Increment/Decrement field',
    icon: 'lucide:binary',
    label: 'Counter',
    section: 'tier5',
    type: 'COUNTER',
  },

  // Tier 6 – Advanced / niche (bottom, collapsible)
  {
    description: 'Total score calculation',
    icon: 'lucide:trophy',
    label: 'Score',
    section: 'tier6',
    type: 'SCORE',
  },
  {
    description: 'Dynamic formula-based result',
    icon: 'lucide:calculator',
    label: 'Calculated',
    section: 'tier6',
    type: 'CALCULATED',
  },
  {
    description: 'Invoice & PO matching summary',
    icon: 'lucide:file-text',
    label: 'Invoice Report',
    section: 'tier6',
    type: 'INVOICE_REPORT',
  },
  {
    description: 'GL matching & financial audit report',
    icon: 'lucide:file-chart-column',
    label: 'Financial Audit',
    section: 'tier6',
    type: 'FINANCIAL_AUDIT',
  },
]

const FieldLibrary = () => {
  const {
    activePanelId,
    activeQuestionId,
    addFieldPosition,
    addQuestion,
    panels,
    setAddFieldPosition,
    setSidebarView,
  } = useFormStore()
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const filteredFields = useMemo(() => {
    if (!search.trim()) return ALL_FIELDS
    const query = search.toLowerCase()
    return ALL_FIELDS.filter(
      (f) =>
        f.label.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query),
    )
  }, [search])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const handleSelect = (type: string) => {
    const questions = createFieldQuestions(type)

    if (addFieldPosition) {
      const { index, panelId } = addFieldPosition
      questions.forEach((q, i) => {
        addQuestion(panelId, q, index + i)
      })
      setAddFieldPosition(null)
      return
    }

    // No explicit insertion point was set (e.g. the library is already open
    // and the user just picked a field type). Prefer the section that owns
    // the currently selected field over the scroll-tracked activePanelId, so
    // the new field lands next to what the user is actually working on.
    const panelWithActiveQuestion = panels.find((p) =>
      p.fields.some((f) => f.id === activeQuestionId),
    )
    const targetPanel =
      panelWithActiveQuestion ??
      panels.find((p) => p.id === activePanelId) ??
      panels[0]

    if (!targetPanel) return

    const activeQuestionIndex = targetPanel.fields.findIndex(
      (f) => f.id === activeQuestionId,
    )
    const index =
      activeQuestionIndex !== -1
        ? activeQuestionIndex + 1
        : targetPanel.fields.length

    questions.forEach((q, i) => {
      addQuestion(targetPanel.id, q, index + i)
    })
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

  const isSearching = !!search.trim()

  return (
    <div className='animate-in fade-in slide-in-from-bottom-4 flex h-full flex-col duration-500'>
      {/* Header */}
      <div className='sticky top-0 z-20 flex items-center justify-between border-b border-gray-2 bg-white px-4 py-3'>
        <div className='flex items-center gap-2'>
          <button
            className='cursor-pointer rounded-md p-1 text-gray-11 transition-colors hover:bg-gray-2 hover:text-gray-13'
            onClick={() => setSidebarView('explorer')}
          >
            <Icon height={16} name='lucide:arrow-left' width={16} />
          </button>
          <div className='text-xs font-bold text-gray-13'>Fields Library</div>
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
            className='w-full rounded-lg border border-gray-3 bg-white py-1.5 pr-8 pl-8 text-xs font-semibold text-gray-12 opacity-100 shadow-2xs transition-all outline-none placeholder:text-gray-9 focus:border-primary-9 focus:ring-2 focus:ring-primary-3'
            placeholder='Search fields...'
            ref={searchRef}
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          {search && (
            <button
              className='absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-gray-9 transition-colors hover:bg-gray-2 hover:text-gray-12'
              onClick={() => setSearch('')}
            >
              <Icon height={12} name='lucide:x' width={12} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className='custom-scrollbar flex-1 space-y-6 overflow-y-auto p-3 pb-10'>
        {SECTION_CONFIGS.map((section, sectionIdx) => {
          const sectionFields = filteredFields.filter(
            (f) => f.section === section.id,
          )
          if (sectionFields.length === 0) return null

          const isCollapsible = section.collapsible && !isSearching
          const isExpanded = !isCollapsible || isAdvancedOpen

          return (
            <div className='space-y-2.5' key={section.id}>
              {/* Section Header */}
              {!section.hideHeader &&
                (isCollapsible ? (
                  <button
                    className='group/hdr flex w-full cursor-pointer items-center justify-between rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-gray-2'
                    type='button'
                    onClick={() => setIsAdvancedOpen((prev) => !prev)}
                  >
                    <div className='flex items-center gap-2'>
                      <div className='size-2 rounded-full bg-primary-9' />
                      <div className='text-xs font-bold text-gray-12 transition-colors group-hover/hdr:text-primary-9'>
                        {section.label}
                      </div>
                      <span className='py-0.2 rounded-full bg-gray-2 px-1.5 text-[10px] font-semibold text-gray-10'>
                        {sectionFields.length}
                      </span>
                    </div>
                    <div className='flex items-center gap-1 text-gray-9 transition-colors group-hover/hdr:text-gray-12'>
                      <span className='text-[10px] font-medium'>
                        {isExpanded ? 'Hide' : 'Show'}
                      </span>
                      <Icon
                        height={14}
                        width={14}
                        name={
                          isExpanded
                            ? 'lucide:chevron-down'
                            : 'lucide:chevron-right'
                        }
                      />
                    </div>
                  </button>
                ) : (
                  <div className='flex items-center gap-2 px-1 py-0.5'>
                    <div className='size-2 rounded-full bg-primary-9' />
                    <div className='text-xs font-bold text-gray-12'>
                      {section.label}
                    </div>
                  </div>
                ))}

              {/* Field Cards */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    animate={{ height: 'auto', opacity: 1 }}
                    className='grid grid-cols-1 gap-2 overflow-hidden'
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    initial={{
                      height: isCollapsible ? 0 : 'auto',
                      opacity: isCollapsible ? 0 : 1,
                    }}
                  >
                    {sectionFields.map((field, idx) => {
                      const flatIndex = filteredFields.indexOf(field)
                      const isSelected = flatIndex === selectedIndex
                      return (
                        <motion.button
                          animate={{ opacity: 1, x: 0 }}
                          initial={{ opacity: 0, x: -10 }}
                          key={field.type + field.label}
                          transition={{ delay: sectionIdx * 0.04 + idx * 0.02 }}
                          className={cn(
                            'group relative flex cursor-pointer items-center gap-2.5 rounded-xl border p-2 text-left transition-all duration-200 active:scale-[0.98]',
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
                  </motion.div>
                )}
              </AnimatePresence>
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
