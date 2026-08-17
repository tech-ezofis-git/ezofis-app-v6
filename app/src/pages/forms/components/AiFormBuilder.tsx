import { useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import { motion } from 'motion/react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import {
  buildFormPayloadFromAiSuggestion,
  generateFormConfigViaQwen,
  type AiFormConfigSuggestion,
  type AiGeneratedField,
  type FormTypeOption,
} from '@/services/ai/formConfig'
import cn from '@/utils/cn'

interface AiFormBuilderProps {
  onBack: () => void
  onApply: (payload: any) => void
  onStartFromScratch: () => void
}

interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  text: string
  chips?: Array<{ label: string; value: string; icon?: string }>
  component?: 'TYPE_SELECTOR' | 'DETAILS_FORM' | 'GENERATED_CARD'
}

const FIELD_TYPE_OPTIONS = [
  { label: 'Short Text', value: 'SHORT_TEXT' },
  { label: 'Long Text', value: 'LONG_TEXT' },
  { label: 'Number', value: 'NUMBER' },
  { label: 'Date', value: 'DATE' },
  { label: 'Time', value: 'TIME' },
  { label: 'Date & Time', value: 'DATE_TIME' },
  { label: 'Single Select', value: 'SINGLE_SELECT' },
  { label: 'Multi Select', value: 'MULTI_SELECT' },
  { label: 'Single Choice', value: 'SINGLE_CHOICE' },
  { label: 'Multiple Choice', value: 'MULTIPLE_CHOICE' },
  { label: 'Email', value: 'EMAIL' },
  { label: 'Phone Number', value: 'PHONE_NUMBER' },
  { label: 'Address', value: 'ADDRESS' },
  { label: 'Currency', value: 'CURRENCY_AMOUNT' },
  { label: 'File Upload', value: 'FILE_UPLOAD' },
  { label: 'Signature', value: 'SIGNATURE' },
  { label: 'Star Rating', value: 'RATING' },
  { label: 'Yes/No Toggle', value: 'YES_NO_TOGGLE' },
  { label: 'Counter', value: 'COUNTER' },
  { label: 'Table', value: 'TABLE' },
  { label: 'Password', value: 'PASSWORD' },
  { label: 'Heading', value: 'HEADING' },
  { label: 'Paragraph', value: 'TEXT_BUILDER' },
  { label: 'Divider', value: 'DIVIDER' },
]

export default function AiFormBuilder({
  onBack,
  onApply,
  onStartFromScratch,
}: AiFormBuilderProps) {
  const { t } = useLingui()

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      chips: [
        { icon: 'lucide:git-pull-request', label: t`Workflow Form`, value: 'WORKFLOW' },
        { icon: 'lucide:database', label: t`Master Form`, value: 'MASTER' },
      ],
      component: 'TYPE_SELECTOR',
      id: 'msg-1',
      role: 'assistant',
      text: t`Hello! I am your Form Assistant. What type of form would you like to create today?`,
    },
  ])

  const [selectedType, setSelectedType] = useState<FormTypeOption>('WORKFLOW')
  const [isTypeSelected, setIsTypeSelected] = useState(false)
  const [formName, setFormName] = useState('')
  const [description, setDescription] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestion, setSuggestion] = useState<AiFormConfigSuggestion | null>(
    null,
  )

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isGenerating])

  const handleSelectType = (typeValue: string) => {
    const typeLabel =
      typeValue === 'WORKFLOW' ? t`Workflow Form` : t`Master Form`

    setSelectedType(typeValue as FormTypeOption)
    setIsTypeSelected(true)

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: typeLabel,
      },
      {
        component: 'DETAILS_FORM',
        id: `ast-${Date.now()}`,
        role: 'assistant',
        text: t`Great! Please enter the form name and describe what purpose this form serves.`,
      },
    ])
  }

  const handleGenerate = async (
    overrideName?: string,
    overrideDesc?: string,
    extraPrompt?: string,
  ) => {
    const finalName = (overrideName || formName).trim()
    const finalDesc = (overrideDesc || description).trim()

    if (!finalName) {
      showToast({
        message: t`Please enter a form name`,
        variant: 'error',
      })
      return
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: `${finalName}${finalDesc ? ` — ${finalDesc}` : ''}${extraPrompt ? ` (${extraPrompt})` : ''}`,
      },
    ])

    setIsGenerating(true)

    try {
      const result = await generateFormConfigViaQwen({
        description: finalDesc,
        formType: selectedType,
        name: finalName,
        prompt: extraPrompt || '',
      })

      setSuggestion(result)

      setMessages((prev) => [
        ...prev,
        {
          component: 'GENERATED_CARD',
          id: `ast-result-${Date.now()}`,
          role: 'assistant',
          text: t`I've created a customized layout for "${result.name}" with ${result.panels.length} sections and ${result.panels.reduce((acc, p) => acc + p.fields.length, 0)} fields.`,
        },
      ])
    } catch (error) {
      console.error('Form generation error:', error)
      showToast({
        message: t`Unable to generate form layout. Using default template.`,
        variant: 'error',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendPrompt = () => {
    if (!chatInput.trim()) return
    const text = chatInput.trim()
    setChatInput('')

    if (suggestion) {
      handleGenerate(suggestion.name, suggestion.description, text)
    } else if (formName) {
      handleGenerate(formName, description, text)
    } else {
      setFormName(text)
      handleGenerate(text, '', '')
    }
  }

  const handleAddField = (panelIdx: number) => {
    if (!suggestion) return
    const updated = { ...suggestion }
    const newField: AiGeneratedField = {
      isMandatory: false,
      label: `New Field ${updated.panels[panelIdx].fields.length + 1}`,
      placeholder: '',
      size: 'col-6',
      type: 'SHORT_TEXT',
    }
    updated.panels[panelIdx].fields.push(newField)
    setSuggestion({ ...updated })
  }

  const handleRemoveField = (panelIdx: number, fieldIdx: number) => {
    if (!suggestion) return
    const updated = { ...suggestion }
    updated.panels[panelIdx].fields.splice(fieldIdx, 1)
    setSuggestion({ ...updated })
  }

  const handleUpdateField = (
    panelIdx: number,
    fieldIdx: number,
    updates: Partial<AiGeneratedField>,
  ) => {
    if (!suggestion) return
    const updated = { ...suggestion }
    updated.panels[panelIdx].fields[fieldIdx] = {
      ...updated.panels[panelIdx].fields[fieldIdx],
      ...updates,
    }
    setSuggestion({ ...updated })
  }

  const handleApply = () => {
    if (!suggestion) return
    const payload = buildFormPayloadFromAiSuggestion(suggestion)
    showToast({
      message: t`Opening Form Builder...`,
      variant: 'success',
    })
    onApply(payload)
  }

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className='bg-surface-primary flex h-full min-h-0 w-full flex-col overflow-hidden text-gray-12'
      initial={{ opacity: 0, scale: 0.98, y: 12 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Top Bar */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className='flex items-center justify-between border-b border-gray-4 bg-surface-primary px-6 py-3.5 shadow-xs'
        initial={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className='flex items-center gap-3'>
          <IconButton
            ariaLabel='Back'
            color='gray'
            icon='lucide:arrow-left'
            size='sm'
            variant='ghost'
            onClick={onBack}
          />
          <div className='flex items-center gap-2.5'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400'>
              <AiBrandIcon className='size-4' variant='outline-purple' />
            </div>
            <div>
              <h2 className='text-sm font-semibold text-gray-12'>
                {t`Form Assistant`}
              </h2>
              <p className='text-[11px] text-gray-10'>
                {t`Chat to build your form`}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Chat Messages Timeline */}
      <div className='flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-gray-1/30'>
        <div className='mx-auto max-w-3xl space-y-5'>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex gap-3',
                msg.role === 'user' ? 'justify-end' : 'justify-start',
              )}
              initial={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {msg.role === 'assistant' && (
                <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400'>
                  <AiBrandIcon className='size-4' variant='outline-purple' />
                </div>
              )}

              <div
                className={cn(
                  'max-w-[85%] space-y-3',
                  msg.role === 'user' ? 'items-end' : 'items-start',
                )}
              >
                {/* Bubble Text */}
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs',
                    msg.role === 'user'
                      ? 'bg-primary-9 text-white font-medium rounded-tr-xs'
                      : 'border border-gray-4 bg-surface-primary text-gray-12 rounded-tl-xs',
                  )}
                >
                  {msg.text}
                </div>

                {/* Chips Component */}
                {msg.component === 'TYPE_SELECTOR' && msg.chips && (
                  <div className='flex flex-wrap gap-2 pt-1'>
                    {msg.chips.map((chip) => (
                      <motion.button
                        key={chip.value}
                        whileHover={{ scale: 1.04, y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        className='inline-flex items-center gap-2 rounded-full border border-primary-4 bg-surface-primary px-3.5 py-2 text-xs font-semibold text-primary-9 transition-all hover:border-primary-9 hover:bg-primary-3 focus:outline-none focus:ring-2 focus:ring-primary-5 shadow-xs'
                        onClick={() => handleSelectType(chip.value)}
                      >
                        {chip.icon && (
                          <Icon className='h-3.5 w-3.5' name={chip.icon} />
                        )}
                        <span>{chip.label}</span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Form Details Component */}
                {msg.component === 'DETAILS_FORM' && !suggestion && (
                  <motion.div
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className='w-full space-y-3.5 rounded-2xl border border-gray-4 bg-surface-primary p-4 shadow-sm'
                    initial={{ opacity: 0, scale: 0.97, y: 10 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div>
                      <label className='block text-xs font-semibold text-gray-11 uppercase tracking-wider'>
                        {t`Form Name`} <span className='text-red-500'>*</span>
                      </label>
                      <input
                        className='mt-1 w-full rounded-xl border border-gray-4 bg-gray-1/40 px-3.5 py-2 text-xs text-gray-12 outline-none focus:border-primary-9 focus:ring-2 focus:ring-primary-3'
                        placeholder={t`e.g. Vendor Onboarding, Leave Request...`}
                        type='text'
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className='block text-xs font-semibold text-gray-11 uppercase tracking-wider'>
                        {t`Purpose / Description`}
                      </label>
                      <textarea
                        className='mt-1 min-h-[70px] w-full rounded-xl border border-gray-4 bg-gray-1/40 px-3.5 py-2 text-xs text-gray-12 outline-none focus:border-primary-9 focus:ring-2 focus:ring-primary-3'
                        placeholder={t`Describe what this form collects...`}
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    <div className='flex justify-end pt-1'>
                      <Button
                        color='primary'
                        size='sm'
                        onClick={() => handleGenerate()}
                      >
                        <div className='flex items-center gap-1.5'>
                          <AiBrandIcon className='size-4' variant='outline-white' />
                          <span>{t`Generate Form`}</span>
                        </div>
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Generated Form Card Component */}
                {msg.component === 'GENERATED_CARD' && suggestion && (
                  <motion.div
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className='w-full space-y-4 rounded-2xl border border-primary-4 bg-surface-primary p-5 shadow-sm'
                    initial={{ opacity: 0, scale: 0.97, y: 12 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className='flex items-center justify-between border-b border-gray-3 pb-3'>
                      <div>
                        <h4 className='text-sm font-bold text-gray-12'>
                          {suggestion.name}
                        </h4>
                        <span className='mt-0.5 inline-block rounded-md bg-primary-3 px-2 py-0.5 text-[10px] font-semibold text-primary-9 uppercase'>
                          {suggestion.formType} FORM
                        </span>
                      </div>
                      <Button
                        color='primary'
                        icon='lucide:arrow-right'
                        size='sm'
                        variant='solid'
                        onClick={handleApply}
                      >
                        {t`Open in Form Builder`}
                      </Button>
                    </div>

                    {/* Panels */}
                    <div className='space-y-4'>
                      {suggestion.panels.map((panel, pIdx) => (
                        <div
                          key={pIdx}
                          className='rounded-xl border border-gray-3 bg-gray-1/30 p-3.5'
                        >
                          <div className='flex items-center justify-between border-b border-gray-3 pb-2'>
                            <h5 className='text-xs font-semibold text-gray-12'>
                              {panel.title}
                            </h5>
                            <Button
                              color='gray'
                              icon='lucide:plus'
                              size='xs'
                              variant='subtle'
                              onClick={() => handleAddField(pIdx)}
                            >
                              {t`Add Field`}
                            </Button>
                          </div>

                          <div className='mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2'>
                            {panel.fields.map((f, fIdx) => (
                              <div
                                key={fIdx}
                                className='rounded-lg border border-gray-4 bg-surface-primary p-2.5 text-xs'
                              >
                                <div className='flex items-center justify-between gap-1'>
                                  <input
                                    className='flex-1 border-b border-transparent bg-transparent text-xs font-medium text-gray-12 outline-none focus:border-primary-9'
                                    value={f.label}
                                    onChange={(e) =>
                                      handleUpdateField(pIdx, fIdx, {
                                        label: e.target.value,
                                      })
                                    }
                                  />
                                  <IconButton
                                    ariaLabel='Delete'
                                    color='red'
                                    icon='lucide:trash-2'
                                    size='xs'
                                    variant='subtle'
                                    onClick={() => handleRemoveField(pIdx, fIdx)}
                                  />
                                </div>
                                <div className='mt-2 flex items-center justify-between gap-2 text-[10px] text-gray-10'>
                                  <select
                                    className='min-w-0 flex-1 truncate rounded-md border border-gray-4 bg-gray-2/60 px-2 py-1 text-xs font-medium text-gray-12 outline-none focus:border-primary-9 focus:ring-1 focus:ring-primary-3 cursor-pointer'
                                    value={f.type}
                                    onChange={(e) =>
                                      handleUpdateField(pIdx, fIdx, {
                                        type: e.target.value,
                                      })
                                    }
                                  >
                                    {FIELD_TYPE_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                  <label className='flex shrink-0 items-center gap-1.5 cursor-pointer select-none text-xs font-medium text-gray-11 hover:text-gray-12'>
                                    <input
                                      checked={f.isMandatory || false}
                                      className='rounded border-gray-4 text-primary-9 focus:ring-primary-3 cursor-pointer'
                                      type='checkbox'
                                      onChange={(e) =>
                                        handleUpdateField(pIdx, fIdx, {
                                          isMandatory: e.target.checked,
                                        })
                                      }
                                    />
                                    <span>{t`Required`}</span>
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Action Button */}
                    <div className='flex items-center justify-end border-t border-gray-3 pt-3 mt-4'>
                      <Button
                        color='primary'
                        icon='lucide:arrow-right'
                        size='sm'
                        variant='solid'
                        onClick={handleApply}
                      >
                        {t`Open in Form Builder`}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}

          {isGenerating && (
            <motion.div
              animate={{ opacity: 1 }}
              className='flex items-center gap-3 text-xs text-primary-9'
            >
              <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400'>
                <AiBrandIcon className='size-4 animate-spin' variant='outline-purple' />
              </div>
              <span>{t`Designing your form layout...`}</span>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Chat Prompt Bar */}
      {isTypeSelected && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className='border-t border-gray-4 bg-surface-primary p-3 md:p-4'
          initial={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.25 }}
        >
          <div className='mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-gray-4 bg-gray-1/40 px-4 py-2 focus-within:border-primary-9 focus-within:ring-2 focus-within:ring-primary-3'>
            <input
              className='flex-1 bg-transparent text-xs text-gray-12 outline-none placeholder:text-gray-10'
              placeholder={
                suggestion
                  ? t`Type instructions to tweak layout (e.g. Add a file upload field)...`
                  : t`Type form name or requirements...`
              }
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSendPrompt()
                }
              }}
            />
            <IconButton
              ariaLabel='Send'
              color='primary'
              disabled={!chatInput.trim() || isGenerating}
              icon='lucide:send'
              size='sm'
              variant='solid'
              onClick={handleSendPrompt}
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
