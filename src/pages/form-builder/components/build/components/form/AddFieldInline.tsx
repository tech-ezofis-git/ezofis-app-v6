import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import type { QuestionType } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'
import { Portal } from '@mantine/core'

type TabType = 'explore' | 'popular' | 'advanced' | 'templates' | 'all' | 'display' | 'date_time'

interface FieldType {
    type: QuestionType | 'ADDRESS_INFO' | 'CONTACT_INFO'
    label: string
    icon: string
    description: string
    category: TabType
    iconColor?: string
    bgColor?: string
}

const ALL_FIELDS: FieldType[] = [
    // Basic
    { type: 'SHORT_TEXT', label: 'Short Text', icon: 'mdi:form-textbox', category: 'popular', description: 'Single line text input', iconColor: '#3b82f6', bgColor: 'bg-blue-50' },
    { type: 'LONG_TEXT', label: 'Long Text', icon: 'mdi:form-textarea', category: 'popular', description: 'Multi-line text area', iconColor: '#10b981', bgColor: 'bg-emerald-50' },
    { type: 'NUMBER', label: 'Number', icon: 'tabler:number-123', category: 'popular', description: 'Numeric only entry', iconColor: '#f59e0b', bgColor: 'bg-amber-50' },
    { type: 'EMAIL', label: 'Email', icon: 'lucide:mail', category: 'popular', description: 'Validated email input', iconColor: '#ef4444', bgColor: 'bg-red-50' },
    { type: 'PHONE_NUMBER', label: 'Phone', icon: 'lucide:phone', category: 'popular', description: 'Phone number field', iconColor: '#8b5cf6', bgColor: 'bg-violet-50' },
    { type: 'PASSWORD', label: 'Password', icon: 'lucide:lock', category: 'popular', description: 'Secure text entry', iconColor: '#6366f1', bgColor: 'bg-indigo-50' },

    // Selections
    { type: 'SINGLE_CHOICE', label: 'Choice', icon: 'mdi:radiobox-marked', category: 'popular', description: 'Radio selection', iconColor: '#ec4899', bgColor: 'bg-pink-50' },
    { type: 'SINGLE_SELECT', label: 'Dropdown', icon: 'lucide:list-todo', category: 'popular', description: 'Select from list', iconColor: '#f97316', bgColor: 'bg-orange-50' },
    { type: 'MULTI_SELECT', label: 'Checkbox', icon: 'lucide:square-check', category: 'popular', description: 'Multi-select options', iconColor: '#14b8a6', bgColor: 'bg-teal-50' },

    // Date/Time
    { type: 'DATE', label: 'Date', icon: 'lucide:calendar', category: 'date_time', description: 'Date picker', iconColor: '#3b82f6', bgColor: 'bg-blue-50' },
    { type: 'TIME', label: 'Time', icon: 'lucide:clock', category: 'date_time', description: 'Time picker', iconColor: '#10b981', bgColor: 'bg-emerald-50' },

    // Templates
    { type: 'CONTACT_INFO', label: 'Contact Template', icon: 'lucide:contact', category: 'templates', description: 'Name, Email, Phone block', iconColor: '#ec4899', bgColor: 'bg-pink-50' },
    { type: 'ADDRESS_INFO', label: 'Address Template', icon: 'lucide:home', category: 'templates', description: 'Complete address group', iconColor: '#f97316', bgColor: 'bg-orange-50' },

    // Advanced
    { type: 'TABLE', label: 'Table Grid', icon: 'lucide:table', category: 'advanced', description: 'Structured data table', iconColor: '#4f46e5', bgColor: 'bg-indigo-100' },
    { type: 'FILE_UPLOAD', label: 'File Upload', icon: 'lucide:file-up', category: 'advanced', description: 'Upload documents/images', iconColor: '#6366f1', bgColor: 'bg-indigo-50' },
    { type: 'RATING', label: 'Rating', icon: 'lucide:star', category: 'advanced', description: 'Star or scale rating', iconColor: '#f59e0b', bgColor: 'bg-amber-50' },
    { type: 'COUNTRY_CODE', label: 'Country', icon: 'lucide:globe', category: 'advanced', description: 'Location selector', iconColor: '#3b82f6', bgColor: 'bg-blue-100' },

    // Display
    { type: 'TEXT_BUILDER', label: 'Paragraph', icon: 'lucide:text', category: 'display', description: 'Static text or instructions', iconColor: '#94a3b8', bgColor: 'bg-slate-50' },
    { type: 'HEADING', label: 'Heading', icon: 'lucide:heading', category: 'display', description: 'Section title', iconColor: '#94a3b8', bgColor: 'bg-slate-50' },
    { type: 'DIVIDER', label: 'Divider', icon: 'lucide:minus', category: 'display', description: 'Visual separator', iconColor: '#94a3b8', bgColor: 'bg-slate-50' },
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
    const [activeTab, setActiveTab] = useState<TabType>('all')
    const listRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = 0
        }
    }, [activeTab, search])

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

    const filteredFields = ALL_FIELDS.filter(field => {
        const matchesSearch = field.label.toLowerCase().includes(search.toLowerCase()) ||
            field.description.toLowerCase().includes(search.toLowerCase())
        const matchesTab = activeTab === 'all' || field.category === activeTab
        return matchesSearch && matchesTab
    })

    const renderItem = (field: FieldType) => (
        <button
            key={field.type}
            className='flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all duration-200 text-left group border border-transparent hover:border-gray-200'
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onSelect(field.type)
            }}
        >
            <div className={cn(
                'flex shrink-0 items-center justify-center rounded-lg transition-colors h-9 w-9 shadow-sm',
                field.bgColor || 'bg-gray-50'
            )}>
                <Icon
                    name={field.icon}
                    className='h-5 w-5 text-accent-primary'
                />
            </div>
            <div className='flex flex-col min-w-0'>
                <span className='text-xs font-bold text-gray-13 group-hover:text-accent-primary truncate leading-tight'>
                    {field.label}
                </span>
                <span className='text-[10px] text-gray-5 truncate mt-0.5 leading-none'>{field.description}</span>
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
                        {/* Tabs */}
                        <div className='px-3 py-2 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 border-b border-gray-1 bg-gray-50/30'>
                            {[
                                { id: 'all', label: 'All', icon: 'lucide:layout-grid' },
                                { id: 'popular', label: 'Basic', icon: 'lucide:star' },
                                { id: 'templates', label: 'Templates', icon: 'lucide:layout-template' },
                                { id: 'advanced', label: 'Advanced', icon: 'lucide:zap' },
                                { id: 'display', label: 'Display', icon: 'lucide:type' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all duration-200 whitespace-nowrap uppercase tracking-wider',
                                        activeTab === tab.id
                                            ? 'bg-accent-soft text-accent-primary'
                                            : 'text-gray-11 hover:bg-gray-100'
                                    )}
                                >
                                    <Icon name={tab.icon} width={12} height={12} />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div
                            ref={listRef}
                            className='p-3 overflow-y-auto max-h-[360px] custom-scrollbar grid grid-cols-2 gap-1.5'
                        >
                            {filteredFields.map(f => renderItem(f))}
                            {filteredFields.length === 0 && (
                                <div className='col-span-2 py-10 text-center text-gray-4 mt-2'>
                                    <Icon name='lucide:search-x' className='mx-auto mb-2 h-8 w-8 opacity-20' />
                                    <span className='text-xs font-medium'>No elements found matching "{search}"</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <style dangerouslySetInnerHTML={{
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
            `}} />
                </motion.div>
            </div >
        </Portal >
    )
}

export default AddFieldInline
