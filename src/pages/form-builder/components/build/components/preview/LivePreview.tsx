import {
  Button,
  TextInput,
  SegmentedControl,
  Divider,
  Tooltip,
  UnstyledButton,
  Rating,
} from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useEffect, useState } from 'react'
import {
  type Panel as PanelType,
  type Question,
  useFormStore,
  type WelcomePageSettings as WelcomePage,
} from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

type ViewMode = 'typeform' | 'grid' | 'full'

const LivePreview = () => {
  const {
    isPreviewOpen,
    panels,
    showThankYouPage,
    showWelcomePage,
    thankYouPage,
    welcomePage,
    setIsPreviewOpen,
  } = useFormStore()

  const [viewMode, setViewMode] = useState<ViewMode>('typeform')
  const [deviceType, setDeviceType] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop',
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  // Flatten all fields for Typeform mode
  const allFields = panels.flatMap((p) => p.fields)
  const totalFields = allFields.length
  const totalPanels = panels.length

  // Reset state when opening
  useEffect(() => {
    if (isPreviewOpen) {
      setCurrentIndex(0)
      setIsCompleted(false)
      setShowWelcome(showWelcomePage)
    }
  }, [isPreviewOpen, showWelcomePage])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPreviewOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setIsPreviewOpen])

  if (!isPreviewOpen) return null

  // Handlers
  const handleNext = () => {
    if (showWelcome) {
      setShowWelcome(false)
      return
    }

    if (viewMode === 'typeform') {
      if (currentIndex < totalFields - 1) {
        setCurrentIndex((prev) => prev + 1)
      } else if (showThankYouPage) {
        setIsCompleted(true)
      } else {
        setIsPreviewOpen(false)
      }
    } else if (viewMode === 'grid') {
      if (currentIndex < totalPanels - 1) {
        setCurrentIndex((prev) => prev + 1)
      } else if (showThankYouPage) {
        setIsCompleted(true)
      } else {
        setIsPreviewOpen(false)
      }
    } else {
      if (showThankYouPage) {
        setIsCompleted(true)
      } else {
        setIsPreviewOpen(false)
      }
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    } else if (showWelcomePage && !showWelcome) {
      setShowWelcome(true)
    }
  }

  // Progress Calculation
  let progress = 0
  if (viewMode === 'typeform') {
    progress =
      totalFields > 0 ? Math.round(((currentIndex + 1) / totalFields) * 100) : 0
  } else if (viewMode === 'grid') {
    progress =
      totalPanels > 0 ? Math.round(((currentIndex + 1) / totalPanels) * 100) : 0
  } else {
    progress = 100
  }

  return (
    <div className='animate-in fade-in fixed inset-0 z-[200] flex flex-col bg-white font-inter duration-500'>
      {/* Header */}
      <div className='z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-2 bg-white px-6'>
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-3'>
            <div className='flex size-9 items-center justify-center rounded-xl border border-gray-2 bg-gray-1 text-gray-7'>
              <Icon height={18} name='tabler:eye' width={18} />
            </div>
            <span className='text-lg font-bold tracking-tight text-gray-13'>
              Preview
            </span>
          </div>

          <div className='mx-2 h-6 w-px bg-gray-2' />

          <div className='flex gap-1 overflow-hidden rounded-xl border border-gray-2 bg-gray-1 p-1'>
            {[
              {
                icon: 'lucide:layout-list',
                label: 'One at a time',
                value: 'typeform',
              },
              {
                icon: 'lucide:layout-grid',
                label: 'Section by Section',
                value: 'grid',
              },
              {
                icon: 'lucide:file-text',
                label: 'All Questions',
                value: 'full',
              },
            ].map((v) => {
              const active = viewMode === v.value
              return (
                <Tooltip key={v.value} label={v.label} openDelay={500}>
                  <UnstyledButton
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all',
                      active
                        ? 'bg-white text-accent-primary shadow-sm'
                        : 'text-gray-5 hover:bg-gray-2',
                    )}
                    onClick={() => {
                      setViewMode(v.value as ViewMode)
                      setCurrentIndex(0)
                      setIsCompleted(false)
                      setShowWelcome(showWelcomePage)
                    }}
                  >
                    <Icon name={v.icon} width={14} height={14} />
                    <div className="text-[10px] font-extrabold uppercase tracking-wider">{active ? v.label : ''}</div>
                  </UnstyledButton>
                </Tooltip>
              )
            })}
          </div>
        </div>

        <div className='flex items-center gap-4'>
          <SegmentedControl
            radius='xl'
            size='xs'
            value={deviceType}
            classNames={{
              indicator: 'bg-white shadow-sm',
              root: 'border border-gray-2 bg-gray-1 p-1',
            }}
            data={[
              {
                label: (
                  <Icon height={14} name='tabler:device-desktop' width={14} />
                ),
                value: 'desktop',
              },
              {
                label: (
                  <Icon height={14} name='tabler:device-tablet' width={14} />
                ),
                value: 'tablet',
              },
              {
                label: (
                  <Icon height={14} name='tabler:device-mobile' width={14} />
                ),
                value: 'mobile',
              },
            ]}
            onChange={(v) => setDeviceType(v as any)}
          />
          <div className='mx-1 h-6 w-px bg-gray-2' />
          <Button
            className='h-10 rounded-xl px-4 hover:bg-gray-1'
            color='gray'
            leftSection={<Icon height={18} name='tabler:x' width={18} />}
            size='sm'
            variant='subtle'
            onClick={() => setIsPreviewOpen(false)}
          >
            Exit
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className='bg-gray-50 relative flex flex-1 flex-col items-center justify-center overflow-hidden p-4 transition-all duration-500 sm:p-8'>
        <div
          className={cn(
            'relative flex h-full max-h-[850px] flex-col overflow-hidden rounded-[2rem] border border-gray-2 bg-white shadow-2xl transition-all duration-500',
            deviceType === 'desktop' && 'w-full max-w-4xl',
            deviceType === 'tablet' && 'w-[768px] max-w-full',
            deviceType === 'mobile' && 'w-[375px] max-w-full',
          )}
        >
          {/* Progress Bar */}
          {!showWelcome && !isCompleted && viewMode !== 'full' && (
            <div className='absolute top-0 left-0 z-10 h-1.5 w-full bg-gray-1'>
              <div
                className='h-full bg-accent-primary shadow-[0_0_10px_rgba(var(--accent-primary-rgb),0.5)] transition-all duration-700 ease-in-out'
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className='custom-scrollbar relative flex flex-1 flex-col overflow-y-auto'>
            {showWelcome ? (
              <WelcomeScreen page={welcomePage} onStart={handleNext} />
            ) : isCompleted ? (
              <CompletionScreen
                page={thankYouPage}
                onClose={() => setIsPreviewOpen(false)}
              />
            ) : (
              <div className='flex-1 p-10 sm:p-14'>
                {viewMode === 'typeform' && (
                  <TypeformView
                    field={allFields[currentIndex]}
                    index={currentIndex}
                  />
                )}
                {viewMode === 'grid' && (
                  <PanelPreview
                    panel={panels[currentIndex]}
                    panelIndex={currentIndex}
                  />
                )}
                {viewMode === 'full' && <FullFormView panels={panels} />}
              </div>
            )}
          </div>

          {/* Footer / Navigation */}
          <div className='z-20 flex shrink-0 items-center justify-between border-t border-gray-1 bg-white px-8 py-6'>
            <div className='group flex cursor-default items-center gap-2 opacity-80 transition-opacity hover:opacity-100'>
              <div className='flex size-6 items-center justify-center rounded-lg bg-accent-soft/30 transition-colors group-hover:bg-accent-soft/50'>
                <Icon
                  className='text-accent-primary transition-transform group-hover:scale-110'
                  height={14}
                  name='lucide:zap'
                  width={14}
                />
              </div>
              <div className='text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-11'>
                Powered By{' '}
                <span className='border-b border-gray-3 pb-0.5 text-gray-13'>
                  EZOFIS
                </span>
              </div>
            </div>

            {!isCompleted && (
              <div className='flex gap-4'>
                {(showWelcome ||
                  (viewMode !== 'full' && currentIndex > 0) ||
                  (!showWelcome && showWelcomePage)) && (
                    <Button
                      className='h-11 rounded-2xl px-6 font-bold'
                      color='gray'
                      disabled={showWelcome}
                      size='md'
                      variant='subtle'
                      onClick={handlePrev}
                    >
                      {showWelcome ? '' : 'Back'}
                    </Button>
                  )}
                <Button
                  className='h-11 rounded-2xl px-8 font-black text-white shadow-lg shadow-accent-soft/50 transition-all hover:opacity-90 active:scale-95'
                  color='primary'
                  size='md'
                  variant='filled'
                  rightSection={
                    <Icon
                      height={18}
                      width={18}
                      name={
                        isCompleted || viewMode === 'full'
                          ? 'tabler:check'
                          : 'tabler:arrow-right'
                      }
                    />
                  }
                  onClick={handleNext}
                >
                  {showWelcome
                    ? welcomePage.buttonText
                    : viewMode === 'full'
                      ? 'Submit'
                      : currentIndex === totalFields - 1 ||
                        (viewMode === 'grid' &&
                          currentIndex === totalPanels - 1)
                        ? 'Submit'
                        : 'Next'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// interface TableColumn {
//   id: string
//   label: string
//   size: string
//   type: string
// }

// --- Sub-Components ---

const WelcomeScreen = ({
  page,
  onStart,
}: {
  page: WelcomePage
  onStart: () => void
}) => (
  <div className='animate-in fade-in zoom-in-95 flex flex-1 flex-col items-center justify-center p-12 text-center duration-500'>
    <div className='mb-10 flex size-28 rotate-3 items-center justify-center rounded-[2.5rem] border border-accent-soft/60 bg-accent-soft/30 text-accent-primary shadow-sm'>
      <Icon className='size-12' name='lucide:megaphone' />
    </div>
    <h1 className='mb-6 text-5xl leading-tight font-black tracking-tight text-gray-13'>
      {page.title}
    </h1>
    <p className='mx-auto mb-12 max-w-lg text-xl leading-relaxed font-medium text-gray-11'>
      {page.description}
    </p>
    <Button
      className='h-16 rounded-2xl px-12 text-xl font-black text-white shadow-xl shadow-accent-soft/60 transition-all hover:scale-[1.02] active:scale-95'
      color='primary'
      size='xl'
      variant='filled'
      onClick={onStart}
    >
      {page.buttonText}
    </Button>
  </div>
)

const CompletionScreen = ({
  page,
  onClose,
}: {
  page: WelcomePage
  onClose: () => void
}) => (
  <div className='animate-in fade-in zoom-in-95 flex flex-1 flex-col items-center justify-center p-12 text-center duration-500'>
    <div className='border-green-200 animate-bounce-slow mb-10 flex size-28 items-center justify-center rounded-full border bg-green-10/5 text-green-6 shadow-sm'>
      <Icon className='size-12' name='tabler:circle-check' />
    </div>
    <h2 className='mb-6 text-5xl font-black tracking-tight text-gray-13'>
      {page.title}
    </h2>
    <p className='mx-auto mb-12 max-w-md text-xl leading-relaxed font-medium text-gray-11'>
      {page.description}
    </p>
    <div className='flex flex-col gap-4'>
      <Button
        className='h-14 rounded-2xl border-2 border-gray-3 px-10 font-bold transition-all hover:bg-gray-1'
        color='gray'
        size='lg'
        variant='outline'
        onClick={onClose}
      >
        Close Preview
      </Button>
    </div>
  </div>
)

const TypeformView = ({ field, index }: { field: Question; index: number }) => {
  if (!field) return <EmptyState />

  return (
    <div
      className='animate-in fade-in slide-in-from-bottom-4 flex min-h-[300px] flex-col justify-center duration-500'
      key={field.id}
    >
      <div className='mb-6'>
        <h2 className='mb-2 text-2xl leading-tight font-bold text-gray-9'>
          <span className='mr-2 text-xl text-accent-primary'>{index + 1}.</span>
          {field.label || 'Untitled Question'}
        </h2>
        {field.settings.general.description && (
          <p className='text-lg text-gray-5'>
            {field.settings.general.description}
          </p>
        )}
      </div>

      <div className='mb-6'>{renderPreviewInput(field)}</div>

      {field.settings.validation.fieldRule === 'REQUIRED' && (
        <div className='text-red-500 flex items-center gap-1 text-xs font-bold tracking-wider uppercase'>
          <Icon height={10} name='tabler:asterisk' width={10} />
          Required
        </div>
      )}
    </div>
  )
}

const PanelPreview = ({
  panel,
  panelIndex,
}: {
  panel: PanelType
  panelIndex: number
}) => {
  if (!panel || panel.fields.length === 0) return <EmptyState />

  return (
    <div
      className='animate-in fade-in slide-in-from-right-4 space-y-8 duration-500'
      key={panel.id}
    >
      <div className='mb-4 border-b border-gray-1 pb-4'>
        <div className='text-sm font-bold tracking-wider text-gray-4 uppercase'>
          Section {panelIndex + 1}
        </div>
      </div>

      <div className='grid grid-cols-12 gap-6'>
        {panel.fields.map((f) => (
          <div
            key={f.id}
            className={cn(
              'col-span-12',
              f.settings.general.size === 'col-6' && 'md:col-span-6',
              f.settings.general.size === 'col-4' && 'md:col-span-4',
            )}
          >
            <div className='mb-2'>
              <label className='mb-1 block text-sm font-bold text-gray-9'>
                {f.label || 'Untitled Question'}
                {f.settings.validation.fieldRule === 'REQUIRED' && (
                  <span className='text-red-500 ml-1'>*</span>
                )}
              </label>
              {f.settings.general.description && (
                <p className='mb-2 text-xs text-gray-5'>
                  {f.settings.general.description}
                </p>
              )}
            </div>
            {renderPreviewInput(f, 'sm')}
          </div>
        ))}
      </div>
    </div>
  )
}

const FullFormView = ({ panels }: { panels: PanelType[] }) => {
  const allFields = panels.flatMap((p) => p.fields)
  if (allFields.length === 0) return <EmptyState />

  return (
    <div className='animate-in fade-in space-y-12 duration-500'>
      {panels.map((panel, i) => (
        <div className='space-y-6' key={panel.id}>
          {panels.length > 1 && (
            <div className='border-b border-gray-1 pb-2'>
              <div className='text-sm font-bold tracking-wider text-gray-4 uppercase'>
                Section {i + 1}
              </div>
            </div>
          )}
          <div className='grid grid-cols-12 gap-6'>
            {panel.fields.map((f) => (
              <div
                key={f.id}
                className={cn(
                  'col-span-12',
                  f.settings.general.size === 'col-6' && 'md:col-span-6',
                  f.settings.general.size === 'col-4' && 'md:col-span-4',
                )}
              >
                <div className='mb-2'>
                  <label className='mb-1 block text-sm font-bold text-gray-9'>
                    {f.label || 'Untitled Question'}
                    {f.settings.validation.fieldRule === 'REQUIRED' && (
                      <span className='text-red-500 ml-1'>*</span>
                    )}
                  </label>
                  {f.settings.general.description && (
                    <p className='mb-2 text-xs text-gray-5'>
                      {f.settings.general.description}
                    </p>
                  )}
                </div>
                {renderPreviewInput(f, 'sm')}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const EmptyState = () => (
  <div className='py-20 text-center text-gray-5'>
    <Icon
      className='mx-auto mb-4 opacity-50'
      height={48}
      name='tabler:clipboard-x'
      width={48}
    />
    <div>No questions to display.</div>
  </div>
)

const renderPreviewInput = (field: Question, size: 'lg' | 'sm' = 'lg') => {
  const isSmall = size === 'sm'
  switch (field.type) {
    case 'LABEL':
      return (
        <div
          className={cn(
            'font-medium text-gray-9',
            isSmall ? 'text-sm' : 'text-xl',
          )}
        >
          {field.label || 'Label Text'}
        </div>
      )
    case 'DIVIDER':
      return <Divider className='my-4' />
    case 'TEXT_BUILDER':
      return (
        <div
          className={cn(
            'w-full overflow-hidden rounded-lg border border-gray-2 bg-white',
            isSmall ? 'min-h-[100px]' : 'min-h-[200px]',
          )}
        >
          <div className='bg-gray-50 flex gap-2 border-b border-gray-2 p-2'>
            <Icon
              className='text-gray-4'
              height={16}
              name='tabler:bold'
              width={16}
            />
            <Icon
              className='text-gray-4'
              height={16}
              name='tabler:italic'
              width={16}
            />
            <Icon
              className='text-gray-4'
              height={16}
              name='tabler:list'
              width={16}
            />
          </div>
          <div className='p-4 text-gray-4 italic'>
            Rich text editor placeholder...
          </div>
        </div>
      )
    case 'FILE_UPLOAD':
      return (
        <div className={cn(
          "w-full border-2 border-dashed border-gray-2 rounded-xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer",
          isSmall ? "p-4" : "p-10"
        )}>
          <Icon name="tabler:upload" width={isSmall ? 24 : 40} height={isSmall ? 24 : 40} className="text-gray-4 mb-2" />
          <div className={cn("font-medium text-gray-6", isSmall ? "text-xs" : "text-sm")}>Click to upload or drag and drop</div>
          <div className="text-xs text-gray-4 mt-1 text-center">Any file up to 10MB</div>
        </div>
      )
    case 'TIME':
      return (
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg border border-gray-2 bg-white text-gray-5',
            isSmall ? 'p-2 text-sm' : 'p-3 text-lg',
          )}
        >
          <Icon
            height={isSmall ? 16 : 20}
            name='tabler:clock'
            width={isSmall ? 16 : 20}
          />
          <span>HH : MM AM/PM</span>
        </div>
      )
    case 'TABLE':
      const columns = field.settings.specific.columns || [
        { id: '1', label: 'Column 1', size: 'col-4', type: 'SHORT_TEXT' },
        { id: '2', label: 'Column 2', size: 'col-4', type: 'SHORT_TEXT' },
        { id: '3', label: 'Column 3', size: 'col-4', type: 'SHORT_TEXT' },
      ]
      return (
        <div className='overflow-x-auto rounded-lg border border-gray-2 bg-white'>
          <table className='w-full border-collapse text-left text-sm'>
            <thead className='bg-gray-50 border-b border-gray-2'>
              <tr>
                {columns.map((col: any) => (
                  <th
                    key={col.id}
                    className={cn(
                      'p-3 font-bold whitespace-nowrap text-gray-7',
                      col.size === 'col-3' && 'w-[100px]',
                      col.size === 'col-6' && 'w-[200px]',
                      col.size === 'col-12' && 'w-[300px]',
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2].map((i) => (
                <tr className='border-b border-gray-1 last:border-0' key={i}>
                  {columns.map((col: any) => (
                    <td className='p-3' key={col.id}>
                      <TextInput
                        placeholder='...'
                        size='xs'
                        variant='unstyled'
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'SHORT_TEXT':
    case 'EMAIL':
    case 'PHONE_NUMBER':
    case 'NUMBER':
    case 'CURRENCY_AMOUNT':
    case 'ADDRESS':
    case 'FULL_NAME':
      return (
        <TextInput
          size={isSmall ? 'sm' : 'xl'}
          variant={isSmall ? 'default' : 'unstyled'}
          classNames={{
            input: isSmall
              ? 'bg-white'
              : 'rounded-none border-b-2 border-gray-2 px-0 py-2 text-2xl font-light transition-colors focus:border-accent-primary',
          }}
          placeholder={
            field.settings.general.placeholder || 'Type your answer here...'
          }
        />
      )
    case 'LONG_TEXT':
      return (
        <textarea
          className={cn(
            'w-full resize-none transition-colors outline-none',
            isSmall
              ? 'min-h-[80px] rounded-md border border-gray-3 bg-white p-2 text-sm focus:border-accent-primary focus:ring-1 focus:ring-accent-primary'
              : 'min-h-[100px] border-b-2 border-gray-2 bg-transparent py-2 text-xl font-light focus:border-accent-primary',
          )}
          placeholder={
            field.settings.general.placeholder || 'Type your answer here...'
          }
        />
      )
    case 'DATE':
      return (
        <div
          className={cn(
            'inline-flex cursor-pointer items-center gap-3 rounded-lg border border-gray-2 bg-white text-gray-5 transition-colors hover:border-accent-primary/50',
            isSmall ? 'p-2 text-sm' : 'p-3 text-lg',
          )}
        >
          <Icon
            height={isSmall ? 16 : 20}
            name='tabler:calendar'
            width={isSmall ? 16 : 20}
          />
          <span>MM / DD / YYYY</span>
        </div>
      )
    case 'RATING':
      return (
        <Rating
          count={field.settings.specific.iconCount || 5}
          size={isSmall ? "md" : "xl"}
          color="yellow"
          defaultValue={0}
        />
      )
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
    case 'SINGLE_SELECT':
    case 'MULTI_SELECT':
      return (
        <div className='space-y-2'>
          {['Option A', 'Option B', 'Option C'].map((opt, i) => (
            <div
              key={i}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border border-gray-2 bg-white transition-all hover:border-accent-primary/30 hover:bg-accent-soft/5',
                isSmall ? 'p-2 text-sm' : 'p-3',
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center border border-gray-3',
                  field.type === 'SINGLE_CHOICE'
                    ? 'rounded-full'
                    : 'rounded-md',
                  isSmall ? 'size-4' : 'size-5',
                )}
              ></div>
              <span
                className={cn('text-gray-7', isSmall ? 'text-sm' : 'text-lg')}
              >
                {opt}
              </span>
            </div>
          ))}
        </div>
      )
    default:
      return (
        <TextInput
          size={isSmall ? 'sm' : 'xl'}
          variant={isSmall ? 'default' : 'unstyled'}
          classNames={{
            input: isSmall
              ? 'bg-white'
              : 'rounded-none border-b-2 border-gray-2 px-0 py-2 text-2xl font-light transition-colors focus:border-accent-primary',
          }}
          placeholder={
            field.settings.general.placeholder || 'Type your answer here...'
          }
        />
      )
  }
}

export default LivePreview
