import { useFormStore, type QuestionType } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import { useState, useMemo } from 'react'
import { createFieldQuestions } from '@/pages/form-builder/helpers/field-utils'

export type CategoryType = 'popular' | 'templates' | 'advanced' | 'display' | 'date_time'

export interface FieldType {
  category: CategoryType
  description: string
  icon: string
  label: string
  type: QuestionType | 'ADDRESS_INFO' | 'CONTACT_INFO' | 'INVOICE_REPORT' | 'FINANCIAL_AUDIT'
}

export const ALL_FIELDS: FieldType[] = [
  // Basic
  { type: 'FULL_NAME', label: 'Full Name', icon: 'lucide:user', category: 'popular', description: 'Combined first & last name' },
  { type: 'SHORT_TEXT', label: 'Short Text', icon: 'mdi:form-textbox', category: 'popular', description: 'Single line text input' },
  { type: 'LONG_TEXT', label: 'Long Text', icon: 'mdi:form-textarea', category: 'popular', description: 'Multi-line text area' },
  { type: 'NUMBER', label: 'Number', icon: 'tabler:number-123', category: 'popular', description: 'Numeric only entry' },
  { type: 'COUNTER', label: 'Counter', icon: 'lucide:binary', category: 'popular', description: 'Increment/Decrement field' },
  { type: 'CURRENCY_AMOUNT', label: 'Currency', icon: 'lucide:banknote', category: 'popular', description: 'Financial amount with unit' },
  { type: 'DIVIDER', label: 'Divider', icon: 'lucide:separator-horizontal', category: 'popular', description: 'Visual section separator' },
  { type: 'COUNTRY_CODE', label: 'Country', icon: 'lucide:globe', category: 'popular', description: 'Intl. dialing prefix' },
  { type: 'EMAIL', label: 'Email', icon: 'lucide:mail', category: 'popular', description: 'Validated email input' },
  { type: 'FILE_UPLOAD', label: 'File Upload', icon: 'lucide:upload-cloud', category: 'popular', description: 'Document & media capture' },
  { type: 'PASSWORD', label: 'Password', icon: 'lucide:lock', category: 'popular', description: 'Secure text entry' },
  { type: 'TEXT_BUILDER', label: 'Text Builder', icon: 'lucide:type', category: 'popular', description: 'Rich-text & dynamic content' },
  { type: 'TABLE', label: 'Table', icon: 'lucide:layout-grid', category: 'popular', description: 'Spreadsheet-style data entry' },
  { type: 'PHONE_NUMBER', label: 'Phone', icon: 'lucide:phone', category: 'popular', description: 'Phone number field' },
  { type: 'RATING', label: 'Rating', icon: 'lucide:star', category: 'popular', description: 'Star or heart-based feedback' },
  { type: 'OPINION_SCALE', label: 'Opinion Scale', icon: 'lucide:bar-chart-3', category: 'popular', description: 'Numbered 0-10 satisfaction scale' },
  { type: 'SIGNATURE', label: 'Signature', icon: 'lucide:pen-tool', category: 'popular', description: 'Hand-drawn signature capture' },
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
  { type: 'INVOICE_REPORT', label: 'Invoice Report', icon: 'lucide:file-text', category: 'templates', description: 'Invoice & PO matching summary' },
  { type: 'FINANCIAL_AUDIT', label: 'Financial Audit', icon: 'lucide:file-chart-column', category: 'templates', description: 'GL matching & financial audit report' },

  // Advanced
  { type: 'SCORE', label: 'Score', icon: 'lucide:trophy', category: 'advanced', description: 'Total score calculation' },
  { type: 'CALCULATED', label: 'Calculated', icon: 'lucide:calculator', category: 'advanced', description: 'Dynamic formula-based result' },
]

const FieldLibrary = () => {
    const { addFieldPosition, addQuestion, setSidebarView, setAddFieldPosition } = useFormStore()
    const [search, setSearch] = useState('')

    const filteredFields = useMemo(() => {
        if (!search.trim()) return ALL_FIELDS
        return ALL_FIELDS.filter(f => 
            f.label.toLowerCase().includes(search.toLowerCase()) || 
            f.description.toLowerCase().includes(search.toLowerCase())
        )
    }, [search])

    const handleSelect = (type: string) => {
        if (!addFieldPosition) return

        const { panelId, index } = addFieldPosition
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
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-2 bg-white sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setSidebarView('explorer')}
                        className="p-1 hover:bg-gray-1 rounded-md transition-colors text-gray-5"
                    >
                        <Icon name="lucide:arrow-left" width={16} height={16} />
                    </button>
                    <div className="text-[11px] font-extrabold text-gray-10 tracking-widest uppercase">Fields Library</div>
                </div>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-gray-2 bg-white/50 backdrop-blur-sm sticky top-12 z-10">
                <div className="relative group">
                    <Icon 
                        name="lucide:search" 
                        className={cn(
                            "absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-4 transition-colors",
                            search && "text-accent-primary"
                        )} 
                        width={13} 
                        height={13} 
                    />
                    <input
                        type="text"
                        placeholder="Search fields..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-2 rounded-lg pl-8 pr-8 py-1.5 text-xs outline-none focus:bg-white focus:border-accent-primary focus:ring-2 focus:ring-accent-soft/20 transition-all placeholder:text-gray-4 font-medium"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
                {categories.map((cat) => {
                    const catFields = filteredFields.filter(f => f.category === cat.id)
                    if (catFields.length === 0) return null

                    return (
                        <div key={cat.id} className="space-y-2">
                            <div className="text-[9px] font-extrabold text-gray-4 uppercase tracking-[0.2em] px-1">{cat.label}</div>
                            <div className="grid grid-cols-1 gap-1">
                                {catFields.map((field) => (
                                    <button
                                        key={field.type + field.label}
                                        onClick={() => handleSelect(field.type)}
                                        className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-2 transition-all text-left"
                                    >
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-gray-2 bg-gray-1 text-gray-5 group-hover:bg-accent-soft group-hover:text-accent-primary group-hover:border-accent-soft/30 transition-all">
                                            <Icon name={field.icon} width={14} height={14} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="text-[12px] font-semibold text-gray-12 group-hover:text-accent-primary transition-colors truncate">{field.label}</div>
                                            <div className="text-[10px] text-gray-5 truncate">{field.description}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                })}

                {filteredFields.length === 0 && (
                    <div className="py-20 text-center">
                        <Icon name="lucide:search-x" className="mx-auto mb-2 h-8 w-8 text-gray-3 opacity-50" />
                        <div className="text-xs font-bold text-gray-4 uppercase tracking-widest">No matching fields</div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default FieldLibrary
