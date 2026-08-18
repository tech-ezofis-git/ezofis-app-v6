import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import { createFieldQuestions } from '@/pages/form-builder/helpers/field-utils'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'
import { ALL_FIELDS, type FieldType } from '../left-sidebar/FieldLibrary'

interface SlashCommandProps {
  index: number
  panelId: string
  placeholder?: string
}

const SlashCommand = ({
  index,
  panelId,
  placeholder = 'Type / to add field...',
}: SlashCommandProps) => {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { addQuestion } = useFormStore()

  const filteredFields = useMemo(() => {
    const query = inputValue.startsWith('/')
      ? inputValue.slice(1).toLowerCase()
      : ''
    if (!query) return ALL_FIELDS.slice(0, 8) // Show top 8 by default
    return ALL_FIELDS.filter(
      (f) =>
        f.label.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query),
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
      setSelectedIndex((prev) => (prev + 1) % filteredFields.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(
        (prev) => (prev - 1 + filteredFields.length) % filteredFields.length,
      )
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
    <div className={cn('group/slash relative w-full', isOpen && 'z-50')}>
      <div className='flex items-center gap-2.5 rounded-lg border border-dashed border-gray-2 bg-white px-3 py-2.5 transition-all duration-300 focus-within:border-primary-9/60 focus-within:bg-primary-3/20 hover:border-gray-3'>
        <div className='flex size-5 shrink-0 items-center justify-center rounded-md bg-gray-1 text-gray-5 transition-colors group-focus-within/slash:bg-primary-3 group-focus-within/slash:text-primary-9'>
          <Icon height={11} name='lucide:slash' width={11} />
        </div>
        <input
          className='flex-1 border-none bg-transparent text-xs font-medium text-gray-12 outline-none placeholder:text-gray-6'
          placeholder={placeholder}
          ref={inputRef}
          type='text'
          value={inputValue}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Floating Menu */}
      {isOpen && (
        <div className='animate-in fade-in zoom-in-95 slide-in-from-top-4 absolute top-full left-0 z-[999] mt-2 w-72 overflow-hidden rounded-xl border border-gray-3 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.18)] duration-200'>
          <div className='border-b border-gray-2 bg-gray-1/60 p-2'>
            <div className='px-2 text-xs font-bold text-gray-11'>
              Commands
            </div>
          </div>
          <div className='custom-scrollbar max-h-[320px] overflow-y-auto p-1'>
            {filteredFields.map((field, i) => (
              <button
                key={field.type + field.label}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-all',
                  i === selectedIndex
                    ? 'bg-accent-soft text-accent-primary'
                    : 'text-gray-12 hover:bg-gray-1',
                )}
                onClick={() => handleSelect(field)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg border transition-all',
                    i === selectedIndex
                      ? 'border-accent-soft bg-white text-accent-primary shadow-sm'
                      : 'border-gray-2 bg-gray-1 text-gray-5',
                  )}
                >
                  <Icon height={14} name={field.icon} width={14} />
                </div>
                <div className='flex min-w-0 flex-col'>
                  <div className='truncate text-[12px] font-semibold'>
                    {field.label}
                  </div>
                  <div
                    className={cn(
                      'truncate text-[10px]',
                      i === selectedIndex
                        ? 'text-accent-primary/70'
                        : 'text-gray-5',
                    )}
                  >
                    {field.description}
                  </div>
                </div>
              </button>
            ))}
            {filteredFields.length === 0 && (
              <div className='py-8 text-center'>
                <Icon
                  className='mx-auto mb-1 h-5 w-5 text-gray-3 opacity-50'
                  name='lucide:slash'
                />
                <div className='text-[10px] font-bold tracking-widest text-gray-4 uppercase'>
                  No matching command
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SlashCommand
