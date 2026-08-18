import type React from 'react'
import { Card, Rating, Tooltip } from '@mantine/core'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
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
  isLocked?: boolean
  onDelete: () => void
  onSelect: () => void
  onUpdate: (updates: Partial<Question>) => void
}

const QuestionCard = ({
  dragListeners,
  isActive,
  isLocked,
  question,
  onDelete,
  onSelect,
  onUpdate,
}: Props) => {
  const { panels } = useFormStore()
  const allQuestions = panels.flatMap((p) => p.fields)

  // Logic Evaluation
  const checkLogic = () => {
    const rules = question.settings.logic || []
    if (rules.length === 0) return true

    // Simple evaluator: returns true if ALL rules pass (AND logic)
    // Note: For builder, we assume default values or empty
    return rules.every((rule) => {
      const target = allQuestions.find((q) => q.id === rule.fieldId)
      const val = target?.settings.specific.defaultValue || ''

      switch (rule.condition) {
        case 'IS':
          return val === rule.value
        case 'IS_NOT':
          return val !== rule.value
        case 'CONTAINS':
          return String(val).includes(rule.value)
        case 'EMPTY':
          return !val
        case 'NOT_EMPTY':
          return !!val
        default:
          return true
      }
    })
  }

  const isVisible = checkLogic()
  const hasLogic = (question.settings.logic || []).length > 0
  const isRequired = question.settings.validation.fieldRule === 'REQUIRED'

  return (
    <Card
      className={cn(
        'group relative overflow-visible rounded-xl border font-inter transition-all duration-200',
        isLocked
          ? 'bg-gray-2/40 cursor-not-allowed border-gray-3 opacity-90'
          : 'hover:bg-gray-1/60 cursor-pointer',
        isActive
          ? 'border-primary-9 bg-primary-3/30 shadow-xs ring-1 ring-primary-9'
          : 'border-gray-3 bg-white hover:border-gray-4 hover:shadow-2xs',
      )}
      style={{
        padding: '0',
      }}
      onClick={onSelect}
    >
      <div className='flex flex-col gap-2 p-3'>
        {/* Top Header: Icon box, Label, Required asterisk, Quick Actions, Drag Handle */}
        <div className='flex items-center justify-between gap-3'>
          <div className='flex min-w-0 flex-1 items-center gap-2.5'>
            {/* Field Icon Badge */}
            <div className='flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-3 text-primary-9 shadow-2xs'>
              <Icon
                height={15}
                name={
                  question.type === 'FULL_NAME'
                    ? 'lucide:user'
                    : question.type === 'EMAIL'
                      ? 'lucide:mail'
                      : question.type === 'PHONE_NUMBER'
                        ? 'lucide:phone'
                        : question.type === 'CURRENCY_AMOUNT'
                          ? 'lucide:banknote'
                          : question.type === 'DIVIDER'
                            ? 'lucide:separator-horizontal'
                            : question.type === 'FILE_UPLOAD'
                              ? 'lucide:upload-cloud'
                              : question.type === 'SINGLE_SELECT' ||
                                  question.type === 'MULTI_SELECT'
                                ? 'lucide:list-todo'
                                : question.type === 'SINGLE_CHOICE' ||
                                    question.type === 'MULTIPLE_CHOICE'
                                  ? 'lucide:radio'
                                  : question.type === 'DATE' ||
                                      question.type === 'TIME' ||
                                      question.type === 'DATE_TIME'
                                    ? 'lucide:calendar'
                                    : 'mdi:form-textbox'
                }
                width={15}
              />
            </div>

            <div className='truncate text-sm font-semibold text-gray-12'>
              {question.label || 'Untitled Field'}
              {isRequired && <span className='ml-1 font-bold text-red-11'>*</span>}
            </div>

            {hasLogic && (
              <span className='flex items-center gap-1 rounded-md bg-purple-3 px-1.5 py-0.5 text-[10px] font-bold text-purple-11'>
                <Icon height={10} name='lucide:split' width={10} />
                Logic Active
              </span>
            )}
          </div>

          {/* Quick Actions & Drag Handle */}
          <div className='flex items-center gap-1 pl-2'>
            {!isLocked ? (
              <>
                <div
                  className={cn(
                    'flex items-center gap-0.5 opacity-0 transition-all duration-300 group-hover:opacity-100',
                    isActive && 'opacity-100',
                  )}
                >
                  <Tooltip label='Duplicate' position='top' withArrow>
                    <IconButton
                      className='size-6 cursor-pointer'
                      color='primary'
                      icon='lucide:copy'
                      iconClass='size-[13px]'
                      size='sm'
                      variant='ghost'
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        const { duplicateQuestion, setCopiedQuestion } =
                          useFormStore.getState()
                        setCopiedQuestion(question)
                        duplicateQuestion(question.id)
                      }}
                    />
                  </Tooltip>

                  <Tooltip label='Delete' position='top' withArrow>
                    <IconButton
                      className='hover:bg-red-50 size-6 cursor-pointer'
                      color='red'
                      icon='lucide:trash-2'
                      iconClass='size-[13px]'
                      size='sm'
                      variant='ghost'
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        onDelete()
                      }}
                    />
                  </Tooltip>
                </div>

                <div
                  className='ml-1 flex h-6 w-4 cursor-grab items-center justify-center rounded text-gray-3 transition-colors hover:bg-gray-2 hover:text-gray-6 active:cursor-grabbing'
                  {...dragListeners}
                >
                  <Icon height={14} name='lucide:grip-vertical' width={14} />
                </div>
              </>
            ) : (
              <div className='flex h-6 w-6 items-center justify-center rounded-lg text-gray-3 opacity-50'>
                <Icon height={14} name='lucide:lock' width={14} />
              </div>
            )}
          </div>
        </div>

        {/* Simulated Input Area */}
        <div className='mt-1.5 w-full'>
          {question.type === 'TEXT_BUILDER' ? (
            <div
              className={cn(
                'w-full overflow-hidden rounded-xl border bg-white transition-all duration-300',
                isActive
                  ? 'border-accent-primary/60 shadow-sm'
                  : 'border-gray-2 group-hover:border-gray-3',
              )}
            >
              {/* Toolbar Simulation */}
              <div className='bg-gray-50/50 flex items-center gap-1 border-b border-gray-1 p-1.5'>
                <div className='mr-1 flex items-center gap-0.5 border-r border-gray-2 pr-1'>
                  <Icon
                    className='rounded p-0.5 text-gray-4 transition-colors hover:bg-white'
                    height={14}
                    name='lucide:bold'
                    width={14}
                  />
                  <Icon
                    className='rounded p-0.5 text-gray-4 transition-colors hover:bg-white'
                    height={14}
                    name='lucide:italic'
                    width={14}
                  />
                  <Icon
                    className='rounded p-0.5 text-gray-4 transition-colors hover:bg-white'
                    height={14}
                    name='lucide:underline'
                    width={14}
                  />
                </div>
                <div className='mr-1 flex items-center gap-0.5 border-r border-gray-2 pr-1'>
                  <Icon
                    className='rounded bg-white p-0.5 text-gray-8 shadow-xs'
                    height={14}
                    name='lucide:align-left'
                    width={14}
                  />
                  <Icon
                    className='rounded p-0.5 text-gray-4 transition-colors hover:bg-white'
                    height={14}
                    name='lucide:align-center'
                    width={14}
                  />
                  <Icon
                    className='rounded p-0.5 text-gray-4 transition-colors hover:bg-white'
                    height={14}
                    name='lucide:list'
                    width={14}
                  />
                </div>
                <div className='ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg border border-accent-soft/20 bg-accent-soft/10 px-2 py-0.5 text-accent-primary transition-all hover:bg-accent-soft/20'>
                  <Icon height={12} name='lucide:plus' width={12} />
                  <span className='text-[10px] font-bold tracking-tight uppercase'>
                    Insert Field
                  </span>
                </div>
              </div>

              {/* Content Area Simulation */}
              <div className='flex min-h-[80px] flex-col gap-1.5 p-2.5'>
                <div className='flex items-center gap-1.5 text-[13px] text-gray-12'>
                  <span>Hello</span>
                  <div className='border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-bold shadow-xs'>
                    <Icon height={10} name='lucide:user' width={10} />
                    FULL_NAME
                  </div>
                  <span>, your request is ready for review.</span>
                </div>
                <span className='text-[13px] text-gray-4 italic'>
                  Start typing your rich-text content here...
                </span>
              </div>
            </div>
          ) : question.type === 'LONG_TEXT' ? (
            <textarea
              rows={3}
              readOnly
              className={cn(
                'w-full resize-none rounded-lg border p-3 text-[13px] font-medium text-gray-12 transition-colors outline-none placeholder:font-normal placeholder:text-gray-8',
                isActive
                  ? 'border-accent-primary/50 bg-white'
                  : 'border-gray-2 bg-white group-hover:border-gray-3',
              )}
              placeholder={
                question.settings.general.placeholder ||
                `Enter ${question.label || 'value'}...`
              }
            />
          ) : (question.type as string) === 'RATING' ? (
            <div className='flex flex-col gap-3 py-2'>
              <div className='flex items-center gap-1.5'>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Icon
                    height={28}
                    key={i}
                    width={28}
                    className={cn(
                      'cursor-pointer transition-all duration-300',
                      i <= 3
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-2',
                    )}
                    name={
                      question.settings.specific.iconType === 'HEART'
                        ? 'lucide:heart'
                        : 'lucide:star'
                    }
                  />
                ))}
              </div>
              <span className='pl-1 text-[10px] font-bold tracking-widest text-gray-4 uppercase'>
                3.0 / 5.0 Average
              </span>
            </div>
          ) : question.type === 'OPINION_SCALE' ? (
            <div className='flex flex-col gap-4 py-2'>
              <div className='flex w-full max-w-lg items-center gap-1'>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex aspect-square max-w-[40px] flex-1 cursor-pointer items-center justify-center rounded-lg border text-[12px] font-bold shadow-xs transition-all duration-300',
                      i === 8
                        ? 'z-10 scale-110 border-accent-primary bg-accent-primary text-white shadow-lg'
                        : 'border-gray-2 bg-white text-gray-6 hover:border-gray-3',
                    )}
                  >
                    {i}
                  </div>
                ))}
              </div>
              <div className='flex w-full max-w-lg items-center justify-between px-0.5'>
                <span className='text-[10px] font-bold text-gray-5 uppercase tabular-nums'>
                  Not Likely
                </span>
                <span className='text-right text-[10px] font-bold text-gray-5 uppercase tabular-nums'>
                  Extremely Likely
                </span>
              </div>
            </div>
          ) : (question.type as string) === 'SIGNATURE' ? (
            <div className='bg-gray-50/30 group/sig flex w-full max-w-md flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-gray-2 p-6 transition-all hover:border-accent-soft hover:bg-white'>
              <div className='relative flex w-full flex-col items-center'>
                <span className='font-cursive pointer-events-none -rotate-2 transform text-[32px] text-gray-8 opacity-60 select-none'>
                  Johnathon Doe
                </span>
                <div className='mt-2 h-px w-full bg-gray-2' />
              </div>
              <div className='flex items-center gap-2 opacity-40 transition-opacity group-hover/sig:opacity-100'>
                <div className='hover:bg-gray-50 flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-1 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-6 shadow-xs'>
                  <Icon height={14} name='lucide:rotate-ccw' width={14} />
                  Clear
                </div>
              </div>
            </div>
          ) : question.type === 'TABLE' ? (
            <div
              className={cn(
                'w-full overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-300',
                isActive
                  ? 'border-accent-primary/60'
                  : 'border-gray-2 group-hover:border-gray-3',
              )}
            >
              {/* Table Toolbar */}
              <div className='bg-gray-50/50 flex items-center justify-between border-b border-gray-1 px-3 py-2'>
                <div className='flex items-center gap-2'>
                  <div className='hover:bg-gray-50 flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-1 bg-white px-2 py-1 shadow-xs transition-colors'>
                    <Icon
                      className='text-gray-6'
                      height={14}
                      name='lucide:qr-code'
                      width={14}
                    />
                    <span className='text-[11px] font-bold text-gray-8'>
                      Scan Row
                    </span>
                  </div>
                </div>
                <div className='flex items-center gap-1.5'>
                  <IconButton
                    color='gray'
                    icon='lucide:download'
                    size='xs'
                    variant='ghost'
                  />
                  <IconButton
                    color='gray'
                    icon='lucide:upload'
                    size='xs'
                    variant='ghost'
                  />
                </div>
              </div>

              {/* Grid Header */}
              <div className='bg-gray-50/80 grid grid-cols-[30px_1fr_80px_100px_100px] border-b border-gray-1 px-3 py-2'>
                <div className='flex items-center justify-center'>
                  <div className='h-3 w-3 rounded border border-gray-3' />
                </div>
                <div className='text-[10px] font-bold tracking-wider text-gray-5 uppercase'>
                  Item Description
                </div>
                <div className='text-center text-[10px] font-bold tracking-wider text-gray-5 uppercase'>
                  Qty
                </div>
                <div className='text-right text-[10px] font-bold tracking-wider text-gray-5 uppercase'>
                  Unit Price
                </div>
                <div className='pr-2 text-right text-[10px] font-bold tracking-wider text-gray-5 uppercase'>
                  Total
                </div>
              </div>

              {/* Grid Rows */}
              <div className='divide-y divide-gray-1'>
                {[
                  {
                    item: 'Professional Services',
                    price: '150.00',
                    qty: '12',
                    total: '1,800.00',
                  },
                  {
                    item: 'Software Licensing',
                    price: '450.00',
                    qty: '1',
                    total: '450.00',
                  },
                ].map((row, i) => (
                  <div
                    className='hover:bg-gray-50/30 grid grid-cols-[30px_1fr_80px_100px_100px] items-center px-3 py-2.5 transition-colors'
                    key={i}
                  >
                    <div className='flex items-center justify-center'>
                      <div className='h-3 w-3 rounded border border-gray-2' />
                    </div>
                    <div className='text-[12px] font-medium text-gray-12'>
                      {row.item}
                    </div>
                    <div className='text-center text-[12px] font-bold text-gray-8'>
                      {row.qty}
                    </div>
                    <div className='text-right text-[12px] font-medium text-gray-12'>
                      {row.price}
                    </div>
                    <div className='pr-2 text-right text-[12px] font-bold text-accent-primary'>
                      {row.total}
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid Summary */}
              <div className='grid grid-cols-[30px_1fr_80px_100px_100px] border-t border-gray-1 bg-accent-soft/5 px-3 py-2.5'>
                <div />
                <div className='text-[11px] font-bold text-gray-8 uppercase'>
                  Grand Total
                </div>
                <div className='text-center text-[11px] font-bold text-gray-10'>
                  13
                </div>
                <div />
                <div className='pr-2 text-right text-[12px] font-bold text-accent-primary underline decoration-accent-soft underline-offset-4'>
                  2,250.00
                </div>
              </div>

              {/* Grid Footer */}
              <div className='bg-gray-50/50 flex items-center justify-between border-t border-gray-1 px-3 py-2'>
                <div className='flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-accent-primary/50 bg-white px-3 py-1.5 text-accent-primary shadow-xs transition-all hover:bg-accent-soft/10'>
                  <Icon height={14} name='lucide:plus' width={14} />
                  <span className='text-[11px] font-bold tracking-tight uppercase'>
                    Add New Row
                  </span>
                </div>
                <span className='text-[10px] text-gray-4 italic'>
                  Auto-save enabled for table rows
                </span>
              </div>
            </div>
          ) : question.type === 'FILE_UPLOAD' ||
            question.type === 'IMAGE_UPLOAD' ? (
            <div className='space-y-3'>
              <div
                className={cn(
                  'group-hover:bg-gray-50/30 flex h-[80px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-white transition-all duration-300',
                  isActive
                    ? 'border-accent-primary/60 bg-accent-soft/5'
                    : 'bg-gray-50/50 border-dashed border-gray-2 group-hover:border-gray-3',
                )}
              >
                <div className='flex items-center gap-3'>
                  <div className='bg-gray-50 flex items-center gap-2 rounded-lg border border-gray-1 px-3 py-1.5 shadow-sm transition-colors group-hover:bg-white'>
                    <Icon
                      className='text-accent-primary'
                      height={16}
                      name='lucide:file-plus'
                      width={16}
                    />
                    <span className='text-[12px] font-bold text-gray-8'>
                      Browse Files
                    </span>
                  </div>
                  {question.settings.specific.qrCodeEnabled !== false && (
                    <div className='bg-gray-50 cursor-pointer rounded-lg border border-gray-1 p-2 transition-colors hover:bg-white'>
                      <Icon
                        className='text-gray-6'
                        height={16}
                        name='lucide:qr-code'
                        width={16}
                      />
                    </div>
                  )}
                </div>
                <span className='text-[10px] text-gray-4'>
                  Drag and drop or scan to upload
                </span>
              </div>

              <div className='space-y-1.5 px-1'>
                <div className='bg-gray-50/50 group/file flex items-center justify-between rounded-lg border border-gray-1/50 p-2'>
                  <div className='flex items-center gap-2.5 overflow-hidden'>
                    <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-gray-1 bg-white'>
                      <Icon
                        className='text-blue-500'
                        height={14}
                        name='lucide:file-text'
                        width={14}
                      />
                    </div>
                    <div className='flex min-w-0 flex-col'>
                      <span className='truncate text-[11px] font-bold tracking-tight text-gray-12 uppercase'>
                        Invoice_March_2024.pdf
                      </span>
                      <span className='text-[9px] text-gray-5'>
                        2.4 MB • Uploaded
                      </span>
                    </div>
                  </div>
                  <Icon
                    className='cursor-pointer text-gray-3 opacity-0 transition-opacity group-hover/file:opacity-100 hover:text-error-main'
                    height={14}
                    name='lucide:x'
                    width={14}
                  />
                </div>
              </div>
            </div>
          ) : question.type === 'RATING' ? (
            <div
              className={cn(
                'flex h-11 w-full items-center rounded-lg border px-4 transition-colors',
                isActive
                  ? 'border-accent-primary/50 bg-white'
                  : 'border-gray-2 bg-white group-hover:border-gray-3',
              )}
            >
              <Rating
                color='yellow'
                count={question.settings.specific.iconCount || 5}
                defaultValue={0}
                size='sm'
                readOnly
              />
            </div>
          ) : question.type === 'DATE' ||
            question.type === 'TIME' ||
            question.type === 'DATE_TIME' ? (
            <div
              className={cn(
                'flex h-11 w-full items-center justify-between rounded-lg border px-4 transition-colors',
                isActive
                  ? 'border-accent-primary/50 bg-white'
                  : 'border-gray-2 bg-white group-hover:border-gray-3',
              )}
            >
              <span className='text-[13px] font-medium text-gray-8'>
                {question.type === 'DATE'
                  ? 'Select Date'
                  : question.type === 'TIME'
                    ? 'Select Time'
                    : 'Select Date & Time'}
              </span>
              <Icon
                className='text-gray-4'
                height={16}
                width={16}
                name={
                  question.type === 'TIME' ? 'lucide:clock' : 'lucide:calendar'
                }
              />
            </div>
          ) : question.type === 'DIVIDER' ? (
            <div className='py-2'>
              <div
                className={cn(
                  'w-full transition-all duration-300',
                  question.settings.specific.dividerType === 'DASHED' ||
                    !question.settings.specific.dividerType
                    ? 'border-t border-dashed border-gray-3'
                    : question.settings.specific.dividerType === 'DOTTED'
                      ? 'border-t border-dotted border-gray-4'
                      : question.settings.specific.dividerType === 'DOUBLE'
                        ? 'h-1 border-t-4 border-double border-gray-3'
                        : 'border-t border-solid border-gray-3',
                )}
              />
            </div>
          ) : question.type === 'CURRENCY_AMOUNT' ? (
            <div
              className={cn(
                'flex h-[46px] w-full overflow-hidden rounded-lg border font-inter transition-colors',
                isActive
                  ? 'border-accent-primary/50 bg-white'
                  : 'border-gray-2 bg-white group-hover:border-gray-3',
              )}
            >
              <div className='flex w-[80px] cursor-pointer items-center justify-between border-r border-gray-1 bg-primary-3/30 px-3 transition-colors hover:bg-primary-3/50'>
                <span className='text-[13px] font-bold text-gray-12 uppercase'>
                  {(question.settings.specific.defaultValue as any)?.currency ||
                    'USD'}
                </span>
                <Icon
                  className='text-gray-4'
                  height={12}
                  name='lucide:chevron-down'
                  width={12}
                />
              </div>
              <div className='flex flex-1 items-center px-4 text-[13px] font-medium text-gray-12'>
                {(question.settings.specific.defaultValue as any)?.amount ||
                  '0.00'}
              </div>
            </div>
          ) : question.type === 'COUNTRY_CODE' ? (
            <div
              className={cn(
                'flex h-11 w-full items-center overflow-hidden rounded-lg border bg-white font-inter transition-colors',
                isActive
                  ? 'border-accent-primary/50'
                  : 'border-gray-2 group-hover:border-gray-3',
              )}
            >
              <div className='bg-gray-50/50 flex items-center gap-2 border-r border-gray-1 px-3 py-2'>
                <div className='h-3.5 w-5 flex-shrink-0 rounded-sm border border-gray-3 bg-gray-2' />
                <span className='text-[13px] font-bold text-gray-8'>+1</span>
                <Icon
                  className='ml-1 text-gray-4'
                  height={12}
                  name='lucide:chevron-down'
                  width={12}
                />
              </div>
              <span className='px-3 text-[13px] text-gray-4 italic'>
                Search country...
              </span>
            </div>
          ) : question.type === 'CALCULATED' ? (
            <div
              className={cn(
                'bg-gray-50/50 flex h-11 w-full items-center justify-between rounded-lg border px-4 font-inter transition-colors',
                isActive
                  ? 'border-accent-primary/50'
                  : 'border-gray-2 group-hover:border-gray-3',
              )}
            >
              <span className='text-[13px] font-medium text-gray-8 italic'>
                Auto-calculated result
              </span>
              <div className='bg-amber-50 border-amber-200/50 flex items-center gap-1.5 rounded border px-2 py-0.5'>
                <Icon
                  className='text-amber-600'
                  height={12}
                  name='lucide:calculator'
                  width={12}
                />
                <span className='text-amber-700 text-[10px] font-bold tracking-tight uppercase'>
                  fx
                </span>
              </div>
            </div>
          ) : question.type === 'COUNTER' ? (
            <div
              className={cn(
                'flex h-11 w-full overflow-hidden rounded-lg border transition-colors',
                isActive
                  ? 'border-accent-primary/50 bg-white'
                  : 'border-gray-2 bg-white group-hover:border-gray-3',
              )}
            >
              <div className='flex flex-1 items-center px-4 text-[13px] font-medium text-gray-12'>
                {question.settings.specific.defaultValue || '0'}
              </div>
              <div className='bg-gray-50/30 flex w-10 flex-col border-l border-gray-1'>
                <div className='flex flex-1 cursor-pointer items-center justify-center transition-colors hover:bg-gray-1'>
                  <Icon
                    className='text-gray-5'
                    height={14}
                    name='lucide:chevron-up'
                    width={14}
                  />
                </div>
                <div className='h-px w-full bg-gray-1' />
                <div className='flex flex-1 cursor-pointer items-center justify-center transition-colors hover:bg-gray-1'>
                  <Icon
                    className='text-gray-5'
                    height={14}
                    name='lucide:chevron-down'
                    width={14}
                  />
                </div>
              </div>
            </div>
          ) : question.type === 'SINGLE_CHOICE' ||
            question.type === 'MULTIPLE_CHOICE' ? (
            <div className='space-y-2'>
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'flex h-9 w-full items-center gap-3 rounded-lg border px-3 transition-colors',
                    isActive
                      ? 'border-accent-primary/50 bg-white'
                      : 'border-gray-2 bg-white group-hover:border-gray-3',
                  )}
                >
                  <div
                    className={cn(
                      'size-4 border border-gray-3',
                      question.type === 'SINGLE_CHOICE'
                        ? 'rounded-full'
                        : 'rounded-md',
                    )}
                  />
                  <span className='text-[12px] text-gray-8'>Option {i}</span>
                </div>
              ))}
            </div>
          ) : (question.type as string) === 'MATRIX' ? (
            <div className='w-full overflow-x-auto rounded-xl border border-gray-1 bg-white/50 shadow-sm backdrop-blur-sm'>
              <table className='w-full min-w-[400px] border-collapse text-left'>
                <thead>
                  <tr className='bg-gray-50/50 border-b border-gray-1'>
                    <th className='w-[30%] p-3 text-[10px] font-bold tracking-wider text-gray-4 uppercase'>
                      Rows
                    </th>
                    {['Option A', 'Option B', 'Option C'].map((col) => (
                      <th
                        className='p-3 text-center text-[10px] font-bold tracking-wider text-gray-11 uppercase'
                        key={col}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-1'>
                  {['Row 1', 'Row 2', 'Row 3'].map((row) => (
                    <tr
                      className='group/row transition-colors hover:bg-accent-soft/5'
                      key={row}
                    >
                      <td className='p-3 text-[12px] font-semibold text-gray-13'>
                        {row}
                      </td>
                      {[1, 2, 3].map((col) => (
                        <td className='p-3 text-center' key={col}>
                          <div
                            className={cn(
                              'mx-auto flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all duration-300',
                              col === 2
                                ? 'scale-110 border-accent-primary bg-accent-primary shadow-sm'
                                : 'border-gray-2 bg-white group-hover/row:border-gray-3',
                            )}
                          >
                            {col === 2 && (
                              <div className='animate-in zoom-in-50 h-1.5 w-1.5 rounded-full bg-white' />
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (question.type as string) === 'YES_NO_TOGGLE' ? (
            <div className='bg-gray-50 flex w-full max-w-[280px] gap-1 rounded-xl border border-gray-1 p-1 shadow-inner'>
              <div className='group/yes flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-2 bg-white px-3 py-1.5 shadow-sm transition-all hover:border-accent-soft/50 active:scale-[0.98]'>
                <div className='flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-accent-primary'>
                  <div className='h-1.5 w-1.5 animate-pulse rounded-full bg-accent-primary' />
                </div>
                <span className='text-[12px] font-bold text-accent-primary'>
                  Yes
                </span>
              </div>
              <div className='hover:bg-gray-100 flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-bold text-gray-4 transition-all'>
                <div className='h-3.5 w-3.5 rounded-full border-2 border-gray-3' />
                <span>No</span>
              </div>
            </div>
          ) : (question.type as string) === 'FULL_NAME' ? (
            <div className='grid w-full grid-cols-2 gap-3.5'>
              <div className='flex flex-col gap-1.5'>
                <span className='text-[10px] font-bold tracking-wider text-gray-10 uppercase'>
                  FIRST NAME
                </span>
                <div className='flex h-11 items-center rounded-xl border border-gray-3 bg-gray-1/50 px-3.5 text-sm text-gray-10 italic shadow-2xs'>
                  e.g. John
                </div>
              </div>
              <div className='flex flex-col gap-1.5'>
                <span className='text-[10px] font-bold tracking-wider text-gray-10 uppercase'>
                  LAST NAME
                </span>
                <div className='flex h-11 items-center rounded-xl border border-gray-3 bg-gray-1/50 px-3.5 text-sm text-gray-10 italic shadow-2xs'>
                  e.g. Doe
                </div>
              </div>
            </div>
          ) : (question.type as string) === 'EMAIL' ? (
            <div className='flex h-11 w-full items-center gap-2.5 rounded-xl border border-gray-3 bg-gray-1/50 px-3.5 text-sm text-gray-10 italic shadow-2xs'>
              <Icon
                className='text-gray-10'
                height={16}
                name='lucide:mail'
                width={16}
              />
              <span>john.doe@example.com</span>
            </div>
          ) : (question.type as string) === 'PHONE_NUMBER' ? (
            <div className='flex h-11 w-full items-center gap-2.5 rounded-xl border border-gray-3 bg-gray-1/50 px-3.5 text-sm text-gray-10 italic shadow-2xs'>
              <Icon
                className='text-gray-10'
                height={16}
                name='lucide:phone'
                width={16}
              />
              <span>+1 (555) 000-0000</span>
            </div>
          ) : (question.type as string) === 'URL' ? (
            <div
              className={cn(
                'flex h-11 w-full items-center gap-3 rounded-lg border px-4 transition-colors',
                isActive
                  ? 'border-accent-primary/50 bg-white'
                  : 'border-gray-2 bg-white group-hover:border-gray-3',
              )}
            >
              <Icon
                className='text-gray-4'
                height={16}
                name='lucide:link'
                width={16}
              />
              <span className='text-[13px] text-gray-4 italic'>
                https://example.com
              </span>
            </div>
          ) : (question.type as string) === 'SCORE' ? (
            <div className='relative flex h-16 w-full items-center justify-between overflow-hidden rounded-2xl border border-dashed border-accent-soft/30 bg-accent-soft/5 px-6'>
              <div className='flex flex-col'>
                <span className='text-[10px] font-bold tracking-wider text-accent-primary uppercase'>
                  Current Score
                </span>
                <span className='text-2xl font-black tracking-tight text-accent-primary'>
                  85
                  <span className='ml-0.5 text-sm font-medium opacity-50'>
                    /100
                  </span>
                </span>
              </div>
              <div className='h-12 w-12 animate-spin rounded-full border-4 border-accent-primary/20 border-t-accent-primary' />
            </div>
          ) : (question.type as string) === 'FILL_IN_THE_BLANKS' ? (
            <div className='bg-gray-50/50 w-full rounded-xl border border-gray-1 p-4 text-[13px] leading-relaxed font-medium text-gray-12'>
              The quick brown{' '}
              <span className='mx-1 inline-block rounded-md border border-gray-2 bg-white px-3 py-1 font-bold text-accent-primary shadow-sm'>
                fox
              </span>{' '}
              jumps over the{' '}
              <span className='mx-1 inline-block rounded-md border border-gray-2 bg-white px-3 py-1 font-normal text-gray-4 italic shadow-sm'>
                lazy dog
              </span>
              .
            </div>
          ) : (question.type as string) === 'HEADING' ? (
            <div className='w-full pt-2 pb-1'>
              <h2 className='inline-block border-b-2 border-gray-1 pr-4 pb-1 text-xl font-black tracking-tight text-gray-12'>
                Section Heading
              </h2>
            </div>
          ) : (question.type as string) === 'LABEL' ? (
            <div className='w-full py-1'>
              <div className='bg-blue-50/30 border-blue-50 flex items-start gap-2 rounded-lg border p-3 text-[12px] leading-relaxed text-gray-11'>
                <Icon
                  className='text-blue-500 mt-0.5 shrink-0'
                  height={14}
                  name='lucide:info'
                  width={14}
                />
                <p>
                  This is an informational label or instruction block that
                  provides guidance without requiring input.
                </p>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'flex h-11 w-full items-center rounded-lg border px-4 transition-colors',
                isActive
                  ? 'border-accent-primary/50 bg-white'
                  : 'border-gray-2 bg-white group-hover:border-gray-3',
              )}
            >
              <span className='truncate text-[13px] font-medium text-gray-8'>
                {question.settings.general.placeholder ||
                  `Enter ${question.label || 'value'}...`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Width Toolbar (Hover Only) */}
      <div className='pointer-events-none absolute -bottom-[18px] left-1/2 z-50 -translate-x-1/2 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:opacity-100'>
        <div className='animate-in slide-in-from-top-4 flex items-center gap-1 rounded-full border border-gray-2 bg-white p-1 shadow-sm'>
          {[
            { label: '1/3', value: 'col-4' },
            { label: '1/2', value: 'col-6' },
            { label: 'Full', value: 'col-12' },
          ].map((w) => (
            <button
              key={w.value}
              className={cn(
                'rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide transition-all',
                question.settings.general.size === w.value
                  ? 'bg-accent-soft/20 text-accent-primary'
                  : 'text-gray-5 hover:bg-gray-1',
              )}
              onClick={(e) => {
                e.stopPropagation()
                onUpdate({
                  settings: {
                    ...question.settings,
                    general: {
                      ...question.settings.general,
                      size: w.value as any,
                    },
                  },
                })
              }}
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
