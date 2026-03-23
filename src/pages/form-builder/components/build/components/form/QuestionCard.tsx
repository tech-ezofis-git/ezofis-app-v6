import { Card, Tooltip, Rating } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import IconButton from '@/components/base/button/IconButton'
import Button from '@/components/base/button/Button'
import type React from 'react'
import {
  type Question,
  useFormStore,
} from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

interface Props {
  isActive: boolean
  question: Question
  dragListeners?: any
  isBuilderMode?: boolean
  onDelete: () => void
  onSelect: () => void
  onUpdate: (updates: Partial<Question>) => void
}

const QuestionCard = ({ question, isActive, onSelect, onUpdate, onDelete, dragListeners }: Props) => {
  const { panels } = useFormStore()
  const allQuestions = panels.flatMap(p => p.fields)

  // Logic Evaluation
  const checkLogic = () => {
    const rules = question.settings.logic || []
    if (rules.length === 0) return true

    // Simple evaluator: returns true if ALL rules pass (AND logic)
    // Note: For builder, we assume default values or empty
    return rules.every(rule => {
      const target = allQuestions.find(q => q.id === rule.fieldId)
      const val = target?.settings.specific.defaultValue || ''

      switch (rule.condition) {
        case 'IS': return val === rule.value
        case 'IS_NOT': return val !== rule.value
        case 'CONTAINS': return String(val).includes(rule.value)
        case 'EMPTY': return !val
        case 'NOT_EMPTY': return !!val
        default: return true
      }
    })
  }

  const isVisible = checkLogic()
  const hasLogic = (question.settings.logic || []).length > 0
  const isRequired = question.settings.validation.fieldRule === 'REQUIRED'

  return (
    <Card
      onClick={onSelect}
      className={cn(
        "group relative border transition-all duration-300 cursor-pointer overflow-visible rounded-xl font-inter",
        isActive
          ? "border-accent-primary bg-accent-soft/5 ring-1 ring-accent-primary shadow-sm"
          : "border-gray-2 bg-transparent hover:border-gray-3 hover:bg-gray-50/50"
      )}
      style={{
        padding: '0'
      }}
    >
      <div className="flex flex-col p-4 gap-3">
        {/* Top Header: Label, Badges, Quick Actions, Drag Handle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="text-13 font-medium text-gray-12 truncate">
              {question.label || 'Untitled Field'}
            </div>

            {isRequired && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-2 text-gray-7 tracking-wider uppercase">
                Required
              </span>
            )}

            {hasLogic && (
              <span className="px-1.5 py-0.5 rounded flex items-center gap-1 text-[9px] font-bold bg-accent-primary text-white tracking-wider uppercase">
                <Icon name="lucide:split" width={10} height={10} />
                Logic Active
              </span>
            )}

            {/* Visibility Warning */}
            {!isVisible && (
              <Tooltip label="Visible when Vendor Entity Type is International Entity" position="top" withArrow>
                <div className="cursor-help flex items-center justify-center size-5 rounded-md bg-accent-soft/10 text-accent-primary border border-accent-soft/20 ml-1">
                  <Icon name="lucide:info" width={12} height={12} />
                </div>
              </Tooltip>
            )}
          </div>

          {/* Quick Actions & Drag Handle */}
          <div className="flex items-center gap-1 pl-2">
             <div className={cn(
                "flex items-center gap-0.5 transition-all duration-300 opacity-0 group-hover:opacity-100",
                isActive && "opacity-100"
             )}>
                <Tooltip label="Duplicate" position="top" withArrow>
                  <IconButton
                    className="cursor-pointer size-6"
                    color="primary"
                    icon="lucide:copy"
                    iconClass="size-[13px]"
                    size="sm"
                    variant="ghost"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      const { setCopiedQuestion, duplicateQuestion } = useFormStore.getState()
                      setCopiedQuestion(question)
                      duplicateQuestion(question.id)
                    }}
                  />
                </Tooltip>

                <Tooltip label="Delete" position="top" withArrow>
                  <IconButton
                    className="cursor-pointer size-6 hover:bg-red-50"
                    color="red"
                    icon="lucide:trash-2"
                    iconClass="size-[13px]"
                    size="sm"
                    variant="ghost"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      onDelete()
                    }}
                  />
                </Tooltip>
             </div>

             <div
              className="flex items-center justify-center h-6 w-4 rounded hover:bg-gray-2 cursor-grab active:cursor-grabbing text-gray-3 hover:text-gray-6 transition-colors ml-1"
              {...dragListeners}
            >
              <Icon name="lucide:grip-vertical" width={14} height={14} />
            </div>
          </div>
        </div>

        {/* Simulated Input Area */}
        <div className="w-full mt-2">
          {question.type === 'LONG_TEXT' ? (
            <textarea
              readOnly
              rows={3}
              placeholder={question.settings.general.placeholder || `Enter ${question.label || 'value'}...`}
              className={cn(
                "w-full resize-none outline-none border rounded-lg p-3 text-[13px] font-medium text-gray-12 placeholder:font-normal placeholder:text-gray-8 transition-colors",
                isActive ? "border-accent-primary/50 bg-white" : "border-gray-2 bg-white group-hover:border-gray-3"
              )}
            />
          ) : question.type === 'FILE_UPLOAD' || question.type === 'IMAGE_UPLOAD' ? (
            <div className={cn(
              "w-full border-2 rounded-xl flex flex-col items-center justify-center p-6 transition-colors group/upload gap-3",
              isActive ? "border-accent-primary bg-accent-soft/5 border-dashed" : "border-gray-2 bg-gray-50/50 border-dashed group-hover:border-gray-3"
            )}>
              <div className="flex items-center gap-2 pointer-events-none">
                <Button
                  color='gray'
                  icon='lucide:upload'
                  variant='outline'
                  size='sm'
                  label="Upload"
                  className="bg-white"
                />
                <Button
                  color='red'
                  icon='lucide:trash-2'
                  variant='outline'
                  size='sm'
                  label="Remove"
                  className="bg-white"
                />
              </div>
              <span className="text-[13px] font-normal text-gray-8 group-hover/upload:text-gray-10 transition-colors">We support PNGs and JPEGs under 5MB</span>
            </div>
          ) : question.type === 'RATING' ? (
            <div className={cn(
              "h-11 w-full border rounded-lg flex items-center px-4 transition-colors",
              isActive ? "border-accent-primary/50 bg-white" : "border-gray-2 bg-white group-hover:border-gray-3"
            )}>
              <Rating
                defaultValue={0}
                count={question.settings.specific.iconCount || 5}
                readOnly
                size="sm"
                color="yellow"
              />
            </div>
          ) : question.type === 'DATE' || question.type === 'TIME' || question.type === 'DATE_TIME' ? (
            <div className={cn(
              "h-11 w-full border rounded-lg flex items-center justify-between px-4 transition-colors",
              isActive ? "border-accent-primary/50 bg-white" : "border-gray-2 bg-white group-hover:border-gray-3"
            )}>
              <span className="text-[13px] text-gray-8 font-medium">
                {question.type === 'DATE' ? 'Select Date' : question.type === 'TIME' ? 'Select Time' : 'Select Date & Time'}
              </span>
              <Icon name={question.type === 'TIME' ? 'lucide:clock' : 'lucide:calendar'} width={16} height={16} className="text-gray-4" />
            </div>
           ) : question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE' ? (
            <div className="space-y-2">
               {[1, 2].map(i => (
                 <div key={i} className={cn(
                   "h-9 w-full border rounded-lg flex items-center px-3 gap-3 transition-colors",
                   isActive ? "border-accent-primary/50 bg-white" : "border-gray-2 bg-white group-hover:border-gray-3"
                 )}>
                   <div className={cn("size-4 border border-gray-3", question.type === 'SINGLE_CHOICE' ? 'rounded-full' : 'rounded-md')} />
                   <span className="text-[12px] text-gray-8">Option {i}</span>
                 </div>
               ))}
            </div>
          ) : (
            <div className={cn(
              "h-11 w-full border rounded-lg flex items-center px-4 transition-colors",
              isActive ? "border-accent-primary/50 bg-white" : "border-gray-2 bg-white group-hover:border-gray-3"
            )}>
              <span className="text-[13px] text-gray-8 font-medium truncate">
                {question.settings.general.placeholder || `Enter ${question.label || 'value'}...`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Width Toolbar (Hover Only) */}
      <div className="absolute -bottom-[18px] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-50 pointer-events-none group-hover:pointer-events-auto">
        <div className="flex items-center gap-1 bg-white border border-gray-2 shadow-sm rounded-full p-1 animate-in slide-in-from-top-4">
          {[
             { label: '1/3', value: 'col-4' },
             { label: '1/2', value: 'col-6' },
             { label: 'Full', value: 'col-12' },
          ].map((w) => (
             <button
                key={w.value}
                onClick={(e) => {
                   e.stopPropagation()
                   onUpdate({ settings: { ...question.settings, general: { ...question.settings.general, size: w.value as any } } })
                }}
                className={cn(
                   "px-2 py-0.5 rounded-full text-[9px] font-bold transition-all tracking-wide",
                   question.settings.general.size === w.value
                      ? "bg-accent-soft/20 text-accent-primary"
                      : "text-gray-5 hover:bg-gray-1"
                )}
             >
                {w.label}
             </button>
          ))}
        </div>
      </div>
    </Card>
  )
}

export default QuestionCard
