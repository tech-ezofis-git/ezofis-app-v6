import { Card, Tooltip, Rating } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import IconButton from '@/components/base/button/IconButton'
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
          {question.type === 'TEXT_BUILDER' ? (
            <div className={cn(
              "w-full border rounded-xl overflow-hidden transition-all duration-300 bg-white",
              isActive ? "border-accent-primary/60 shadow-sm" : "border-gray-2 group-hover:border-gray-3"
            )}>
              {/* Toolbar Simulation */}
              <div className="flex items-center gap-1 p-1.5 border-b border-gray-1 bg-gray-50/50">
                <div className="flex items-center gap-0.5 pr-1 border-r border-gray-2 mr-1">
                  <Icon name="lucide:bold" width={14} height={14} className="text-gray-4 p-0.5 rounded hover:bg-white transition-colors" />
                  <Icon name="lucide:italic" width={14} height={14} className="text-gray-4 p-0.5 rounded hover:bg-white transition-colors" />
                  <Icon name="lucide:underline" width={14} height={14} className="text-gray-4 p-0.5 rounded hover:bg-white transition-colors" />
                </div>
                <div className="flex items-center gap-0.5 pr-1 border-r border-gray-2 mr-1">
                  <Icon name="lucide:align-left" width={14} height={14} className="text-gray-8 p-0.5 rounded bg-white shadow-xs" />
                  <Icon name="lucide:align-center" width={14} height={14} className="text-gray-4 p-0.5 rounded hover:bg-white transition-colors" />
                  <Icon name="lucide:list" width={14} height={14} className="text-gray-4 p-0.5 rounded hover:bg-white transition-colors" />
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-accent-soft/10 text-accent-primary border border-accent-soft/20 ml-auto cursor-pointer hover:bg-accent-soft/20 transition-all">
                  <Icon name="lucide:plus" width={12} height={12} />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Insert Field</span>
                </div>
              </div>

              {/* Content Area Simulation */}
              <div className="p-3 min-h-[100px] flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[13px] text-gray-12">
                  <span>Hello</span>
                  <div className="px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-[11px] font-bold text-blue-700 flex items-center gap-1 shadow-xs">
                    <Icon name="lucide:user" width={10} height={10} />
                    FULL_NAME
                  </div>
                  <span>, your request is ready for review.</span>
                </div>
                <span className="text-[13px] text-gray-4 italic">Start typing your rich-text content here...</span>
              </div>
            </div>
          ) : question.type === 'LONG_TEXT' ? (
            <textarea
              readOnly
              rows={3}
              placeholder={question.settings.general.placeholder || `Enter ${question.label || 'value'}...`}
              className={cn(
                "w-full resize-none outline-none border rounded-lg p-3 text-[13px] font-medium text-gray-12 placeholder:font-normal placeholder:text-gray-8 transition-colors",
                isActive ? "border-accent-primary/50 bg-white" : "border-gray-2 bg-white group-hover:border-gray-3"
              )}
            />
          ) : (question.type as string) === 'RATING' ? (
            <div className="flex flex-col gap-3 py-2">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Icon
                    key={i}
                    name={question.settings.specific.iconType === 'HEART' ? "lucide:heart" : "lucide:star"}
                    width={28}
                    height={28}
                    className={cn(
                      "transition-all duration-300 cursor-pointer",
                      i <= 3 ? "text-yellow-400 fill-yellow-400" : "text-gray-2"
                    )}
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold text-gray-4 uppercase tracking-widest pl-1">3.0 / 5.0 Average</span>
            </div>
          ) : question.type === 'OPINION_SCALE' ? (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex items-center gap-1 w-full max-w-lg">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 aspect-square max-w-[40px] flex items-center justify-center rounded-lg border text-[12px] font-bold transition-all duration-300 cursor-pointer shadow-xs",
                      i === 8 ? "bg-accent-primary border-accent-primary text-white scale-110 shadow-lg z-10" : "bg-white border-gray-2 text-gray-6 hover:border-gray-3"
                    )}
                  >
                    {i}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between w-full max-w-lg px-0.5">
                <span className="text-[10px] font-bold text-gray-5 uppercase tabular-nums">Not Likely</span>
                <span className="text-[10px] font-bold text-gray-5 uppercase tabular-nums text-right">Extremely Likely</span>
              </div>
            </div>
          ) : (question.type as string) === 'SIGNATURE' ? (
            <div className="w-full max-w-md border-2 border-dashed border-gray-2 rounded-xl p-6 bg-gray-50/30 flex flex-col items-center justify-center gap-4 group/sig transition-all hover:bg-white hover:border-accent-soft">
              <div className="relative w-full flex flex-col items-center">
                <span className="text-[32px] font-cursive text-gray-8 opacity-60 select-none pointer-events-none transform -rotate-2">
                  Johnathon Doe
                </span>
                <div className="w-full h-px bg-gray-2 mt-2" />
              </div>
              <div className="flex items-center gap-2 group-hover/sig:opacity-100 opacity-40 transition-opacity">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-1 shadow-xs cursor-pointer hover:bg-gray-50 text-[11px] font-bold text-gray-6">
                  <Icon name="lucide:rotate-ccw" width={14} height={14} />
                  Clear
                </div>
              </div>
            </div>
          ) : question.type === 'TABLE' ? (
            <div className={cn(
              "w-full border rounded-xl overflow-hidden transition-all duration-300 bg-white shadow-sm",
              isActive ? "border-accent-primary/60" : "border-gray-2 group-hover:border-gray-3"
            )}>
              {/* Table Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-1 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-gray-1 shadow-xs cursor-pointer hover:bg-gray-50 transition-colors">
                    <Icon name="lucide:qr-code" width={14} height={14} className="text-gray-6" />
                    <span className="text-[11px] font-bold text-gray-8">Scan Row</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <IconButton icon="lucide:download" size="xs" variant="ghost" color="gray" />
                  <IconButton icon="lucide:upload" size="xs" variant="ghost" color="gray" />
                </div>
              </div>

              {/* Grid Header */}
              <div className="grid grid-cols-[30px_1fr_80px_100px_100px] bg-gray-50/80 border-b border-gray-1 px-3 py-2">
                <div className="flex items-center justify-center"><div className="w-3 h-3 rounded border border-gray-3" /></div>
                <div className="text-[10px] font-bold text-gray-5 uppercase tracking-wider">Item Description</div>
                <div className="text-[10px] font-bold text-gray-5 uppercase tracking-wider text-center">Qty</div>
                <div className="text-[10px] font-bold text-gray-5 uppercase tracking-wider text-right">Unit Price</div>
                <div className="text-[10px] font-bold text-gray-5 uppercase tracking-wider text-right pr-2">Total</div>
              </div>

              {/* Grid Rows */}
              <div className="divide-y divide-gray-1">
                {[
                  { item: 'Professional Services', qty: '12', price: '150.00', total: '1,800.00' },
                  { item: 'Software Licensing', qty: '1', price: '450.00', total: '450.00' }
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-[30px_1fr_80px_100px_100px] px-3 py-2.5 items-center hover:bg-gray-50/30 transition-colors">
                    <div className="flex items-center justify-center"><div className="w-3 h-3 rounded border border-gray-2" /></div>
                    <div className="text-[12px] font-medium text-gray-12">{row.item}</div>
                    <div className="text-[12px] font-bold text-gray-8 text-center">{row.qty}</div>
                    <div className="text-[12px] font-medium text-gray-12 text-right">{row.price}</div>
                    <div className="text-[12px] font-bold text-accent-primary text-right pr-2">{row.total}</div>
                  </div>
                ))}
              </div>

              {/* Grid Summary */}
              <div className="grid grid-cols-[30px_1fr_80px_100px_100px] bg-accent-soft/5 border-t border-gray-1 px-3 py-2.5">
                <div />
                <div className="text-[11px] font-bold text-gray-8 uppercase">Grand Total</div>
                <div className="text-[11px] font-bold text-gray-10 text-center">13</div>
                <div />
                <div className="text-[12px] font-bold text-accent-primary text-right pr-2 underline decoration-accent-soft underline-offset-4">2,250.00</div>
              </div>

              {/* Grid Footer */}
              <div className="px-3 py-2 bg-gray-50/50 border-t border-gray-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-accent-primary/50 text-accent-primary bg-white cursor-pointer hover:bg-accent-soft/10 transition-all shadow-xs">
                  <Icon name="lucide:plus" width={14} height={14} />
                  <span className="text-[11px] font-bold uppercase tracking-tight">Add New Row</span>
                </div>
                <span className="text-[10px] text-gray-4 italic">Auto-save enabled for table rows</span>
              </div>
            </div>
          ) : question.type === 'FILE_UPLOAD' || question.type === 'IMAGE_UPLOAD' ? (
            <div className="space-y-3">
              <div className={cn(
                "h-[80px] w-full border border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300 bg-white group-hover:bg-gray-50/30",
                isActive ? "border-accent-primary/60 bg-accent-soft/5" : "border-gray-2 bg-gray-50/50 border-dashed group-hover:border-gray-3"
              )}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-1 shadow-sm group-hover:bg-white transition-colors">
                    <Icon name="lucide:file-plus" width={16} height={16} className="text-accent-primary" />
                    <span className="text-[12px] font-bold text-gray-8">Browse Files</span>
                  </div>
                  {question.settings.specific.qrCodeEnabled !== false && (
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-1 hover:bg-white transition-colors cursor-pointer">
                      <Icon name="lucide:qr-code" width={16} height={16} className="text-gray-6" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-4">Drag and drop or scan to upload</span>
              </div>
              
              <div className="space-y-1.5 px-1">
                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 border border-gray-1/50 group/file">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded bg-white border border-gray-1 flex items-center justify-center flex-shrink-0">
                      <Icon name="lucide:file-text" width={14} height={14} className="text-blue-500" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-gray-12 truncate uppercase tracking-tight">Invoice_March_2024.pdf</span>
                      <span className="text-[9px] text-gray-5">2.4 MB • Uploaded</span>
                    </div>
                  </div>
                  <Icon name="lucide:x" width={14} height={14} className="text-gray-3 hover:text-error-main cursor-pointer opacity-0 group-hover/file:opacity-100 transition-opacity" />
                </div>
              </div>
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
          ) : question.type === 'DIVIDER' ? (
            <div className="py-2">
              <div className={cn(
                "w-full transition-all duration-300",
                (question.settings.specific.dividerType === 'DASHED' || !question.settings.specific.dividerType) ? "border-t border-dashed border-gray-3" :
                question.settings.specific.dividerType === 'DOTTED' ? "border-t border-dotted border-gray-4" :
                question.settings.specific.dividerType === 'DOUBLE' ? "border-t-4 border-double border-gray-3 h-1" :
                "border-t border-solid border-gray-3"
              )} />
            </div>
          ) : question.type === 'CURRENCY_AMOUNT' ? (
            <div className={cn(
              "h-[46px] w-full border rounded-lg flex overflow-hidden transition-colors font-inter",
              isActive ? "border-accent-primary/50 bg-white" : "border-gray-2 bg-white group-hover:border-gray-3"
            )}>
              <div className="w-[80px] bg-[#f0f8ff] border-r border-gray-1 flex items-center justify-between px-3 cursor-pointer hover:bg-blue-50/50 transition-colors">
                <span className="text-[13px] font-bold text-gray-12 uppercase">{(question.settings.specific.defaultValue as any)?.currency || 'USD'}</span>
                <Icon name="lucide:chevron-down" width={12} height={12} className="text-gray-4" />
              </div>
              <div className="flex-1 px-4 flex items-center text-[13px] text-gray-12 font-medium">
                {(question.settings.specific.defaultValue as any)?.amount || '0.00'}
              </div>
            </div>
          ) : question.type === 'COUNTRY_CODE' ? (
            <div className={cn(
              "h-11 w-full border rounded-lg flex items-center transition-colors font-inter overflow-hidden bg-white",
              isActive ? "border-accent-primary/50" : "border-gray-2 group-hover:border-gray-3"
            )}>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/50 border-r border-gray-1">
                <div className="w-5 h-3.5 rounded-sm bg-gray-2 border border-gray-3 flex-shrink-0" />
                <span className="text-[13px] font-bold text-gray-8">+1</span>
                <Icon name="lucide:chevron-down" width={12} height={12} className="text-gray-4 ml-1" />
              </div>
              <span className="px-3 text-[13px] text-gray-4 italic">Search country...</span>
            </div>
          ) : question.type === 'CALCULATED' ? (
            <div className={cn(
              "h-11 w-full border rounded-lg flex items-center justify-between px-4 transition-colors font-inter bg-gray-50/50",
              isActive ? "border-accent-primary/50" : "border-gray-2 group-hover:border-gray-3"
            )}>
              <span className="text-[13px] text-gray-8 font-medium italic">Auto-calculated result</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 border border-amber-200/50">
                <Icon name="lucide:calculator" width={12} height={12} className="text-amber-600" />
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">fx</span>
              </div>
            </div>
          ) : question.type === 'COUNTER' ? (
            <div className={cn(
              "h-11 w-full border rounded-lg flex overflow-hidden transition-colors",
              isActive ? "border-accent-primary/50 bg-white" : "border-gray-2 bg-white group-hover:border-gray-3"
            )}>
              <div className="flex-1 px-4 flex items-center text-[13px] text-gray-12 font-medium">
                {question.settings.specific.defaultValue || '0'}
              </div>
              <div className="w-10 border-l border-gray-1 flex flex-col bg-gray-50/30">
                <div className="flex-1 flex items-center justify-center hover:bg-gray-1 transition-colors cursor-pointer">
                  <Icon name="lucide:chevron-up" width={14} height={14} className="text-gray-5" />
                </div>
                <div className="h-px w-full bg-gray-1" />
                <div className="flex-1 flex items-center justify-center hover:bg-gray-1 transition-colors cursor-pointer">
                  <Icon name="lucide:chevron-down" width={14} height={14} className="text-gray-5" />
                </div>
              </div>
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
          ) : (question.type as string) === 'MATRIX' ? (
            <div className="w-full overflow-x-auto rounded-xl border border-gray-1 bg-white/50 backdrop-blur-sm shadow-sm">
              <table className="w-full text-left border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-1">
                    <th className="p-3 text-[10px] font-bold text-gray-4 uppercase tracking-wider w-[30%]">Rows</th>
                    {['Option A', 'Option B', 'Option C'].map((col) => (
                      <th key={col} className="p-3 text-[10px] font-bold text-gray-11 uppercase text-center tracking-wider">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-1">
                  {['Row 1', 'Row 2', 'Row 3'].map((row) => (
                    <tr key={row} className="hover:bg-accent-soft/5 transition-colors group/row">
                      <td className="p-3 text-[12px] font-semibold text-gray-13">{row}</td>
                      {[1, 2, 3].map((col) => (
                        <td key={col} className="p-3 text-center">
                          <div className={cn(
                            "mx-auto w-4 h-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center",
                            col === 2 ? "bg-accent-primary border-accent-primary scale-110 shadow-sm" : "border-gray-2 group-hover/row:border-gray-3 bg-white"
                          )}>
                            {col === 2 && <div className="w-1.5 h-1.5 rounded-full bg-white animate-in zoom-in-50" />}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (question.type as string) === 'YES_NO_TOGGLE' ? (
            <div className="w-full max-w-[280px] p-1 bg-gray-50 rounded-xl border border-gray-1 flex gap-1 shadow-inner">
               <div className="flex-1 py-1.5 px-3 bg-white rounded-lg shadow-sm border border-gray-2 flex items-center justify-center gap-2 group/yes cursor-pointer transition-all hover:border-accent-soft/50 active:scale-[0.98]">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-accent-primary flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
                  </div>
                  <span className="text-[12px] font-bold text-accent-primary">Yes</span>
               </div>
               <div className="flex-1 py-1.5 px-3 text-gray-4 font-bold text-[12px] rounded-lg flex items-center justify-center gap-2 hover:bg-gray-100 transition-all cursor-pointer">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-3" />
                  <span>No</span>
               </div>
            </div>
          ) : (question.type as string) === 'FULL_NAME' ? (
             <div className="grid grid-cols-2 gap-3 w-full">
                <div className="flex flex-col gap-1.5">
                   <span className="text-[10px] font-bold text-gray-4 uppercase px-1">First Name</span>
                   <div className="h-10 px-3 bg-white border border-gray-2 rounded-lg flex items-center text-[13px] text-gray-4">e.g. John</div>
                </div>
                <div className="flex flex-col gap-1.5">
                   <span className="text-[10px] font-bold text-gray-4 uppercase px-1">Last Name</span>
                   <div className="h-10 px-3 bg-white border border-gray-2 rounded-lg flex items-center text-[13px] text-gray-4">e.g. Doe</div>
                </div>
             </div>
          ) : (question.type as string) === 'EMAIL' ? (
             <div className={cn(
               "h-11 w-full border rounded-lg flex items-center px-4 gap-3 transition-colors",
               isActive ? "border-accent-primary/50 bg-white" : "border-gray-2 bg-white group-hover:border-gray-3"
             )}>
                <Icon name="lucide:mail" width={16} height={16} className="text-gray-4" />
                <span className="text-[13px] text-gray-4 italic">john.doe@example.com</span>
             </div>
          ) : (question.type as string) === 'PHONE_NUMBER' ? (
             <div className={cn(
               "h-11 w-full border rounded-lg flex items-center px-4 gap-3 transition-colors",
               isActive ? "border-accent-primary/50 bg-white" : "border-gray-2 bg-white group-hover:border-gray-3"
             )}>
                <Icon name="lucide:phone" width={16} height={16} className="text-gray-4" />
                <span className="text-[13px] text-gray-4 italic">+1 (555) 000-0000</span>
             </div>
          ) : (question.type as string) === 'URL' ? (
             <div className={cn(
               "h-11 w-full border rounded-lg flex items-center px-4 gap-3 transition-colors",
               isActive ? "border-accent-primary/50 bg-white" : "border-gray-2 bg-white group-hover:border-gray-3"
             )}>
                <Icon name="lucide:link" width={16} height={16} className="text-gray-4" />
                <span className="text-[13px] text-gray-4 italic">https://example.com</span>
             </div>
          ) : (question.type as string) === 'SCORE' ? (
             <div className="w-full h-16 bg-accent-soft/5 rounded-2xl border border-dashed border-accent-soft/30 flex items-center px-6 justify-between overflow-hidden relative">
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-accent-primary uppercase tracking-wider">Current Score</span>
                   <span className="text-2xl font-black text-accent-primary tracking-tight">85<span className="text-sm font-medium opacity-50 ml-0.5">/100</span></span>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-accent-primary/20 border-t-accent-primary animate-spin" />
             </div>
          ) : (question.type as string) === 'FILL_IN_THE_BLANKS' ? (
             <div className="w-full p-4 bg-gray-50/50 rounded-xl border border-gray-1 text-[13px] leading-relaxed text-gray-12 font-medium">
                The quick brown <span className="inline-block px-3 py-1 bg-white border border-gray-2 rounded-md mx-1 shadow-sm text-accent-primary font-bold">fox</span> jumps over the <span className="inline-block px-3 py-1 bg-white border border-gray-2 rounded-md mx-1 shadow-sm text-gray-4 italic font-normal">lazy dog</span>.
             </div>
          ) : (question.type as string) === 'HEADING' ? (
             <div className="w-full pt-2 pb-1">
                <h2 className="text-xl font-black text-gray-12 tracking-tight border-b-2 border-gray-1 pb-1 inline-block pr-4">Section Heading</h2>
             </div>
          ) : (question.type as string) === 'LABEL' ? (
             <div className="w-full py-1">
                <div className="flex items-start gap-2 text-gray-11 text-[12px] leading-relaxed bg-blue-50/30 p-3 rounded-lg border border-blue-50">
                   <Icon name="lucide:info" width={14} height={14} className="mt-0.5 text-blue-500 shrink-0" />
                   <p>This is an informational label or instruction block that provides guidance without requiring input.</p>
                </div>
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
