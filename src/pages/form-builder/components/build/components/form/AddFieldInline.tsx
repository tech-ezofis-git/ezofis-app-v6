import { useState, useRef, useEffect } from 'react'
import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import type { QuestionType } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'
import { motion } from 'motion/react'

type TabType = 'explore' | 'popular' | 'advanced' | 'templates'

interface FieldType {
    type: QuestionType | 'address_info' | 'contact_info'
    label: string
    icon: string
    description: string
    category: TabType | 'display' | 'date_time'
    iconColor?: string
    bgColor?: string
}

const ALL_FIELDS: FieldType[] = [
    // Popular
    { type: 'short_text', label: 'Short Text', icon: 'lucide:type', category: 'popular', description: 'Single line entry', iconColor: '#3b82f6', bgColor: 'bg-blue-50' },
    { type: 'long_text', label: 'Long Text', icon: 'lucide:align-left', category: 'popular', description: 'Multi-line text area', iconColor: '#10b981', bgColor: 'bg-emerald-50' },
    { type: 'email', label: 'Email', icon: 'lucide:mail', category: 'popular', description: 'Email validated input', iconColor: '#f59e0b', bgColor: 'bg-amber-50' },
    { type: 'phone', label: 'Phone', icon: 'lucide:phone', category: 'popular', description: 'Phone number input', iconColor: '#ef4444', bgColor: 'bg-red-50' },
    { type: 'choices', label: 'Multiple Choice', icon: 'lucide:circle', category: 'popular', description: 'Radio buttons', iconColor: '#8b5cf6', bgColor: 'bg-violet-50' },
    { type: 'password', label: 'Password', icon: 'lucide:lock', category: 'popular', description: 'Obscured text field', iconColor: '#6b7280', bgColor: 'bg-gray-100' },

    // Templates
    { type: 'contact_info', label: 'Contact Info', icon: 'lucide:contact', category: 'templates', description: 'Name, Email, Phone, Company', iconColor: '#ec4899', bgColor: 'bg-pink-50' },
    { type: 'address_info', label: 'Address Info', icon: 'lucide:home', category: 'templates', description: 'Full address block', iconColor: '#f97316', bgColor: 'bg-orange-50' },

    // Advanced
    { type: 'counter', label: 'Counter', icon: 'lucide:plus-circle', category: 'advanced', description: 'Increment/decrement', iconColor: '#14b8a6', bgColor: 'bg-teal-50' },
    { type: 'calculated', label: 'Calculated', icon: 'lucide:calculator', category: 'advanced', description: 'Logic-based field', iconColor: '#6366f1', bgColor: 'bg-indigo-50' },
    { type: 'table', label: 'Table', icon: 'lucide:table', category: 'advanced', description: 'Data grid with columns', iconColor: '#4f46e5', bgColor: 'bg-indigo-100' },
    { type: 'country_code', label: 'Country', icon: 'lucide:globe', category: 'advanced', description: 'Country selector', iconColor: '#3b82f6', bgColor: 'bg-blue-100' },

    // Display
    { type: 'label', label: 'Label', icon: 'lucide:heading', category: 'display', description: 'Plain text indicator', iconColor: '#94a3b8', bgColor: 'bg-slate-50' },
    { type: 'divider', label: 'Divider', icon: 'lucide:minus', category: 'display', description: 'Horizontal separator', iconColor: '#94a3b8', bgColor: 'bg-slate-50' },
]

interface Props {
    onSelect: (type: QuestionType | 'address_info' | 'contact_info') => void
}

const AddFieldInline = ({ onSelect }: Props) => {
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState<TabType>('explore')
    const listRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = 0
        }
    }, [activeTab, search])

    const filteredFields = ALL_FIELDS.filter(field => {
        const matchesSearch = field.label.toLowerCase().includes(search.toLowerCase()) ||
            field.description.toLowerCase().includes(search.toLowerCase())
        const matchesTab = activeTab === 'explore' || field.category === activeTab
        return matchesSearch && matchesTab
    })

    const renderItem = (field: FieldType, isSmall: boolean = false) => (
        <button
            key={field.type}
            className={cn(
                'flex items-center gap-3 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-left group',
                isSmall ? 'p-2' : 'p-2.5'
            )}
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onSelect(field.type)
            }}
        >
            <div className={cn(
                'flex shrink-0 items-center justify-center rounded-lg transition-colors',
                isSmall ? 'h-6 w-6' : 'h-7 w-7',
                field.bgColor || 'bg-gray-50'
            )}>
                <Icon
                    name={field.icon}
                    className={isSmall ? 'h-4 w-4' : 'h-4.5 w-4.5'}
                    style={{ color: field.iconColor || 'var(--gray-12)' }}
                />
            </div>
            <div className='flex flex-col min-w-0'>
                <span className='text-sm font-medium text-gray-700 group-hover:text-gray-900 truncate leading-tight'>
                    {field.label}
                </span>
                {!isSmall && field.description && (
                    <span className='text-xs text-gray-500 truncate mt-0.5'>{field.description}</span>
                )}
            </div>
        </button>
    )

    return (
        <motion.div
            drag
            dragMomentum={false}
            className='w-[420px] flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200 font-sans cursor-default'
        >
            {/* Search Header (Drag Handle) */}
            <div className='p-4 pb-2 shrink-0 cursor-move active:cursor-grabbing border-b border-gray-1 bg-gray-50/30'>
                <div className='relative' onPointerDown={e => e.stopPropagation()}>
                    <Input
                        placeholder='Search apps, tools, or logic...'
                        value={search}
                        onChange={(val) => setSearch(val)}
                        className='w-full text-sm bg-gray-50 border-transparent focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100 rounded-xl py-2.5 transition-all'
                        leftSection={<Icon name='lucide:search' className='h-4.5 w-4.5 text-gray-400' />}
                    />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className='px-4 py-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 border-b border-gray-1'>
                {[
                    { id: 'explore', label: 'All', icon: 'lucide:layout-grid' },
                    { id: 'popular', label: 'Popular', icon: 'lucide:star' },
                    { id: 'advanced', label: 'Advanced', icon: 'lucide:zap' },
                    { id: 'templates', label: 'Templates', icon: 'lucide:layout-template' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 group whitespace-nowrap',
                            activeTab === tab.id
                                ? 'bg-[var(--primary-3)] text-[var(--primary-9)] shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100'
                        )}
                    >
                        <Icon
                            name={tab.icon}
                            className={cn(
                                'h-3.5 w-3.5 transition-colors',
                                activeTab === tab.id ? 'text-[var(--primary-9)]' : 'text-gray-500 group-hover:text-gray-900'
                            )}
                        />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content View */}
            <div
                ref={listRef}
                className='p-4 pt-2 overflow-y-auto min-h-0 flex-1 custom-scrollbar'
                style={{ maxHeight: '400px', minHeight: '300px' }}
            >
                {activeTab === 'explore' && !search ? (
                    <div className='grid grid-cols-2 gap-8'>
                        {/* Popular Column */}
                        <div className='flex flex-col gap-2'>
                            <h3 className='text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 pl-2'>Popular</h3>
                            {ALL_FIELDS.filter(f => f.category === 'popular').slice(0, 6).map(f => renderItem(f, true))}
                        </div>

                        {/* Templates Column */}
                        <div className='flex flex-col gap-2'>
                            <h3 className='text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 pl-2'>Templates</h3>
                            {ALL_FIELDS.filter(f => f.category === 'templates').map(f => renderItem(f, true))}

                            <h3 className='text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 pl-2 mt-4'>Display</h3>
                            {ALL_FIELDS.filter(f => f.category === 'display').map(f => renderItem(f, true))}
                        </div>
                    </div>
                ) : (
                    <div className='flex flex-col gap-1'>
                        {filteredFields.map(f => renderItem(f))}
                        {filteredFields.length === 0 && (
                            <div className='py-12 text-center text-gray-400'>
                                <Icon name='lucide:search-x' className='mx-auto mb-4 h-10 w-10 opacity-20' />
                                <span className='text-sm'>No fields found matching "{search}"</span>
                            </div>
                        )}
                    </div>
                )}
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
    )
}

export default AddFieldInline
