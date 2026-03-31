import { useState, useRef, useEffect, useMemo } from 'react'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import { ALL_FIELDS, type FieldType } from '../left-sidebar/FieldLibrary'
import { createFieldQuestions } from '@/pages/form-builder/helpers/field-utils'
import cn from '@/utils/cn'

interface SlashCommandProps {
    panelId: string
    index: number
    placeholder?: string
}

const SlashCommand = ({ panelId, index, placeholder = "Type / to add field..." }: SlashCommandProps) => {
    const [inputValue, setInputValue] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const { addQuestion } = useFormStore()

    const filteredFields = useMemo(() => {
        const query = inputValue.startsWith('/') ? inputValue.slice(1).toLowerCase() : ''
        if (!query) return ALL_FIELDS.slice(0, 8) // Show top 8 by default
        return ALL_FIELDS.filter(f => 
            f.label.toLowerCase().includes(query) || 
            f.description.toLowerCase().includes(query)
        ).slice(0, 10)
    }, [inputValue])

    useEffect(() => {
        if (isOpen) {
            setSelectedIndex(0)
        }
    }, [isOpen, filteredFields])

    const handleSelect = (field: FieldType) => {
        const questions = createFieldQuestions(field.type)
        questions.forEach((q, i) => {
            addQuestion(panelId, q, index + i)
        })
        setInputValue('')
        setIsOpen(false)
        inputRef.current?.blur()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => (prev + 1) % filteredFields.length)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => (prev - 1 + filteredFields.length) % filteredFields.length)
        } else if (e.key === 'Enter' && isOpen && filteredFields.length > 0) {
            e.preventDefault()
            handleSelect(filteredFields[selectedIndex])
        } else if (e.key === 'Escape') {
            setIsOpen(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setInputValue(value)
        if (value.startsWith('/')) {
            setIsOpen(true)
        } else {
            setIsOpen(false)
        }
    }

    return (
        <div className="relative w-full group/slash px-1">
            <div className="flex items-center gap-3 py-3 border-b border-transparent hover:border-gray-2 focus-within:border-accent-primary/50 transition-all duration-300">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium text-gray-12 placeholder:text-gray-4"
                />
            </div>

            {/* Floating Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-2 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[100] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-200">
                    <div className="p-2 border-b border-gray-1 bg-gray-50/50">
                        <div className="text-[10px] font-extrabold text-gray-4 uppercase tracking-[0.2em] px-2 italic">Commands</div>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto p-1 custom-scrollbar">
                        {filteredFields.map((field, i) => (
                            <button
                                key={field.type + field.label}
                                onClick={() => handleSelect(field)}
                                onMouseEnter={() => setSelectedIndex(i)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all",
                                    i === selectedIndex ? "bg-accent-soft text-accent-primary" : "hover:bg-gray-1 text-gray-12"
                                )}
                            >
                                <div className={cn(
                                    "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-all",
                                    i === selectedIndex ? "bg-white border-accent-soft text-accent-primary shadow-sm" : "bg-gray-1 border-gray-2 text-gray-5"
                                )}>
                                    <Icon name={field.icon} width={14} height={14} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="text-[12px] font-semibold truncate">{field.label}</div>
                                    <div className={cn(
                                        "text-[10px] truncate",
                                        i === selectedIndex ? "text-accent-primary/70" : "text-gray-5"
                                    )}>{field.description}</div>
                                </div>
                            </button>
                        ))}
                        {filteredFields.length === 0 && (
                            <div className="py-8 text-center">
                                <Icon name="lucide:slash" className="mx-auto mb-1 h-5 w-5 text-gray-3 opacity-50" />
                                <div className="text-[10px] font-bold text-gray-4 uppercase tracking-widest">No matching command</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default SlashCommand
