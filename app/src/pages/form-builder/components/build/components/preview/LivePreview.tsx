import {
  Button,
  Divider,
  Rating,
  SegmentedControl,
  Select,
  TextInput,
} from '@mantine/core'
import { useEffect, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import {
  type Question,
  useFormStore,
} from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

const LivePreview = () => {
  const { isPreviewOpen, name, panels, setIsPreviewOpen } = useFormStore()
  const [deviceType, setDeviceType] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop',
  )

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPreviewOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setIsPreviewOpen])

  if (!isPreviewOpen) return null

  return (
    <div className='animate-in fade-in fixed inset-0 z-[200] flex flex-col bg-gray-2/80 backdrop-blur-sm font-inter duration-300'>
      {/* Header Control Bar */}
      <div className='z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-3 bg-white px-6 shadow-2xs'>
        <div className='flex items-center gap-3'>
          <div className='flex size-9 items-center justify-center rounded-xl border border-gray-3 bg-primary-3 text-primary-9 shadow-2xs'>
            <Icon height={18} name='tabler:eye' width={18} />
          </div>
          <div className='flex flex-col'>
            <span className='text-sm font-bold text-gray-12'>Form Live Preview</span>
            <span className='text-xs text-gray-10'>{name || 'Untitled Form'}</span>
          </div>
        </div>

        <div className='flex items-center gap-4'>
          <SegmentedControl
            radius='xl'
            size='xs'
            value={deviceType}
            classNames={{
              indicator: 'bg-white shadow-xs',
              root: 'border border-gray-3 bg-gray-2 p-1',
            }}
            data={[
              {
                label: <Icon height={14} name='tabler:device-desktop' width={14} />,
                value: 'desktop',
              },
              {
                label: <Icon height={14} name='tabler:device-tablet' width={14} />,
                value: 'tablet',
              },
              {
                label: <Icon height={14} name='tabler:device-mobile' width={14} />,
                value: 'mobile',
              },
            ]}
            onChange={(v) => setDeviceType(v as any)}
          />

          <div className='h-6 w-px bg-gray-3' />

          <Button
            className='h-9 rounded-xl px-4 hover:bg-gray-2 text-gray-12 cursor-pointer'
            color='gray'
            leftSection={<Icon height={16} name='tabler:x' width={16} />}
            size='sm'
            variant='subtle'
            onClick={() => setIsPreviewOpen(false)}
          >
            Close
          </Button>
        </div>
      </div>

      {/* Single Scrollable Full-Form Preview Container */}
      <div className='relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-6 bg-gray-2/40'>
        <div
          className={cn(
            'relative flex h-full max-h-[880px] w-full flex-col overflow-hidden rounded-2xl border border-gray-3 bg-white shadow-xl transition-all duration-300',
            deviceType === 'desktop' && 'max-w-4xl',
            deviceType === 'tablet' && 'max-w-[768px]',
            deviceType === 'mobile' && 'max-w-[380px]',
          )}
        >
          {/* Scrollable Form Content */}
          <div className='custom-scrollbar flex-1 overflow-y-auto p-6 sm:p-8 space-y-6'>
            {panels.length === 0 || panels.every((p) => p.fields.length === 0) ? (
              <div className='py-24 text-center text-gray-10'>
                <Icon
                  className='mx-auto mb-3 text-gray-8 opacity-60'
                  height={40}
                  name='tabler:clipboard-x'
                  width={40}
                />
                <div className='text-sm font-semibold text-gray-12'>
                  No fields added to this form yet.
                </div>
                <div className='mt-1 text-xs text-gray-9'>
                  Add sections and fields in the Form Builder to preview them here.
                </div>
              </div>
            ) : (
              panels.map((panel, idx) => (
                <div
                  key={panel.id}
                  className='rounded-xl border border-gray-3 bg-white p-5 shadow-2xs space-y-4'
                >
                  {/* Section Title & Description Header */}
                  <div className='border-b border-gray-3 pb-3'>
                    <h3 className='text-base font-bold text-gray-12'>
                      {panel.settings.title || `Section ${idx + 1}`}
                    </h3>
                    {panel.settings.description && (
                      <p className='mt-1 text-xs font-normal text-gray-10'>
                        {panel.settings.description}
                      </p>
                    )}
                  </div>

                  {/* Section Fields Grid */}
                  <div className='grid grid-cols-12 gap-x-4 gap-y-4'>
                    {panel.fields.map((field) => (
                      <div
                        key={field.id}
                        className={cn(
                          'col-span-12',
                          deviceType !== 'mobile' &&
                            field.settings.general.size === 'col-6' &&
                            'md:col-span-6',
                          deviceType !== 'mobile' &&
                            field.settings.general.size === 'col-4' &&
                            'md:col-span-4',
                          deviceType !== 'mobile' &&
                            field.settings.general.size === 'col-3' &&
                            'md:col-span-3',
                        )}
                      >
                        {!field.settings.general.hideLabel && (
                          <div className='mb-1.5 flex items-center justify-between'>
                            <label className='block text-xs font-semibold text-gray-12'>
                              {field.label || 'Untitled Question'}
                              {field.settings.validation.fieldRule ===
                                'REQUIRED' && (
                                <span className='ml-1 font-bold text-red-11'>
                                  *
                                </span>
                              )}
                            </label>
                          </div>
                        )}
                        {field.settings.general.description && (
                          <p className='mb-1.5 text-[11px] font-normal text-gray-10'>
                            {field.settings.general.description}
                          </p>
                        )}
                        {renderPreviewInput(field)}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            {/* Bottom Form Submit Action */}
            {panels.length > 0 && (
              <div className='flex items-center justify-end gap-3 border-t border-gray-3 pt-4'>
                <Button
                  className='rounded-xl font-bold cursor-pointer px-6'
                  color='primary'
                  leftSection={<Icon height={16} name='lucide:send' width={16} />}
                  size='md'
                  variant='solid'
                  onClick={() => setIsPreviewOpen(false)}
                >
                  Submit Form
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const getFieldOptions = (field: Question): string[] => {
  const { customOptions, separateOptionsUsing } = field.settings.specific
  if (!customOptions) return ['Option A', 'Option B', 'Option C']

  const separator = separateOptionsUsing === 'COMMA' ? ',' : '\n'
  const options = customOptions
    .split(separator)
    .map((opt) => opt.trim())
    .filter(Boolean)

  return options.length > 0 ? options : ['Option A', 'Option B', 'Option C']
}

const renderPreviewInput = (field: Question) => {
  switch (field.type) {
    case 'LABEL':
      return (
        <div className='text-sm font-medium text-gray-12'>
          {field.label || 'Label Text'}
        </div>
      )
    case 'DIVIDER':
      return <Divider className='my-2' />
    case 'TEXT_BUILDER':
      return (
        <div className='min-h-[100px] w-full overflow-hidden rounded-lg border border-gray-3 bg-white'>
          <div className='flex gap-2 border-b border-gray-3 bg-gray-2/60 p-2'>
            <Icon className='text-gray-10' height={14} name='tabler:bold' width={14} />
            <Icon className='text-gray-10' height={14} name='tabler:italic' width={14} />
            <Icon className='text-gray-10' height={14} name='tabler:list' width={14} />
          </div>
          <div className='p-3 text-xs italic text-gray-9'>
            Rich text content editor...
          </div>
        </div>
      )
    case 'FILE_UPLOAD':
      return (
        <div className='flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-3 bg-gray-1/40 p-4 transition-colors hover:bg-gray-2'>
          <Icon className='mb-1.5 text-gray-10' height={20} name='tabler:upload' width={20} />
          <div className='text-xs font-medium text-gray-12'>
            Click to upload or drag and drop
          </div>
          <div className='mt-0.5 text-[10px] text-gray-9'>
            Any file up to 10MB
          </div>
        </div>
      )
    case 'TIME':
      return (
        <div className='flex items-center gap-2 rounded-lg border border-gray-3 bg-white p-2 text-xs text-gray-11'>
          <Icon height={15} name='tabler:clock' width={15} />
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
        <div className='overflow-x-auto rounded-lg border border-gray-3 bg-white'>
          <table className='w-full border-collapse text-left text-xs'>
            <thead className='border-b border-gray-3 bg-gray-2/60'>
              <tr>
                {columns.map((col: any) => (
                  <th
                    key={col.id}
                    className='p-2.5 font-bold whitespace-nowrap text-gray-12'
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2].map((i) => (
                <tr className='border-b border-gray-2 last:border-0' key={i}>
                  {columns.map((col: any) => (
                    <td className='p-2' key={col.id}>
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
          size='sm'
          variant='default'
          classNames={{
            input: 'bg-white border-gray-3 text-xs text-gray-12 shadow-2xs focus:border-primary-9',
          }}
          placeholder={
            field.settings.general.placeholder || 'Type your answer here...'
          }
        />
      )
    case 'LONG_TEXT':
      return (
        <textarea
          className='min-h-[80px] w-full rounded-md border border-gray-3 bg-white p-2.5 text-xs text-gray-12 transition-colors outline-none placeholder:text-gray-9 focus:border-primary-9 focus:ring-1 focus:ring-primary-3 shadow-2xs'
          placeholder={
            field.settings.general.placeholder || 'Type your answer here...'
          }
        />
      )
    case 'DATE':
      return (
        <div className='inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-3 bg-white p-2 text-xs text-gray-11 transition-colors hover:border-primary-9'>
          <Icon height={15} name='tabler:calendar' width={15} />
          <span>MM / DD / YYYY</span>
        </div>
      )
    case 'RATING':
      return (
        <Rating
          color='yellow'
          count={field.settings.specific.iconCount || 5}
          defaultValue={0}
          size='md'
        />
      )
    case 'SINGLE_SELECT': {
      const options = getFieldOptions(field)
      return (
        <Select
          data={options}
          placeholder={field.settings.general.placeholder || 'Select an option'}
          size='sm'
          classNames={{
            input: 'bg-white border-gray-3 text-xs text-gray-12 shadow-2xs focus:border-primary-9',
          }}
        />
      )
    }
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
    case 'MULTI_SELECT': {
      const options = getFieldOptions(field)
      const optionsPerLine = field.settings.specific.optionsPerLine || 1
      return (
        <div
          className='grid gap-1.5'
          style={{
            gridTemplateColumns: `repeat(${optionsPerLine}, minmax(0, 1fr))`,
          }}
        >
          {options.map((opt, i) => (
            <div
              key={i}
              className='flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-3 bg-white p-2 text-xs text-gray-12 transition-all hover:bg-gray-2'
            >
              <div
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center border border-gray-4',
                  field.type === 'SINGLE_CHOICE'
                    ? 'rounded-full'
                    : 'rounded-md',
                )}
              />
              <span>{opt}</span>
            </div>
          ))}
        </div>
      )
    }
    default:
      return (
        <TextInput
          size='sm'
          variant='default'
          classNames={{
            input: 'bg-white border-gray-3 text-xs text-gray-12 shadow-2xs focus:border-primary-9',
          }}
          placeholder={
            field.settings.general.placeholder || 'Type your answer here...'
          }
        />
      )
  }
}

export default LivePreview
