import {
  ActionIcon,
  Button,
  Group,
  Stack,
  Textarea,
  TextInput,
  UnstyledButton,
} from '@mantine/core'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

const PublishSidebar = () => {
  const {
    description,
    layout,
    name,
    panels,
    saveForm,
    setDescription,
    setLayout,
    setName,
    setPublishOpen,
  } = useFormStore()

  const { formId } = useParams({ strict: false }) as { formId?: string }
  const navigate = useNavigate()
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const handleAction = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (status === 'DRAFT') setIsSavingDraft(true)
    else setIsPublishing(true)

    try {
      const { createdFormId, success } = await saveForm(status, formId)
      if (success) {
        setPublishOpen(false)
        if (createdFormId) {
          navigate({
            params: { formId: createdFormId },
            to: '/form-builder/$formId',
          })
        }
      }
    } finally {
      setIsSavingDraft(false)
      setIsPublishing(false)
    }
  }

  const layouts = [
    {
      description: 'One question at a time',
      icon: 'tabler:square-rotated',
      id: 'SINGLE',
      name: 'Single Page',
    },
    {
      description: 'Multi-column layout',
      icon: 'tabler:layout-grid',
      id: 'CLASSIC',
      name: 'Classic Grid',
    },
    {
      description: 'Expandable section stack',
      icon: 'tabler:layout-list',
      id: 'ACCORDION',
      name: 'Accordion',
    },
  ]

  return (
    <div className='animate-in slide-in-from-right flex h-full w-[400px] flex-col border-l border-gray-2 bg-surface-primary font-inter shadow-2xl duration-500'>
      {/* Header */}
      <div className='flex items-center justify-between border-b border-gray-2 bg-white px-4 py-3'>
        <div className='flex items-center gap-2.5'>
          <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-1 text-primary-9'>
            <Icon height={16} name='tabler:rocket' width={16} />
          </div>
          <h2 className='text-15/5 font-semibold text-gray-13'>
            Deploy Settings
          </h2>
        </div>
        <IconButton
          color='gray'
          icon='lucide:x'
          variant='ghost'
          onClick={() => setPublishOpen(false)}
        />
      </div>

      <div className='custom-scrollbar flex-1 space-y-6 overflow-y-auto p-5'>
        {/* Basic Info */}
        <Stack gap='xs'>
          <div className='text-[10px] font-extrabold tracking-widest text-gray-5 uppercase'>
            Metadata
          </div>
          <TextInput
            placeholder='e.g. Q1 Customer Survey'
            size='sm'
            value={name}
            classNames={{
              input: 'bg-gray-50 h-10 border-gray-2 focus:bg-white',
            }}
            label={
              <div className='mb-1 text-xs font-bold text-gray-12'>
                Form Name
              </div>
            }
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            classNames={{ input: 'bg-gray-50 border-gray-2 focus:bg-white' }}
            minRows={2}
            placeholder='Internal notes for this form...'
            size='sm'
            value={description}
            autosize
            label={
              <div className='mb-1 text-xs font-bold text-gray-12'>
                Description
              </div>
            }
            onChange={(e) => setDescription(e.target.value)}
          />
        </Stack>

        {/* Layout Selector */}
        <div>
          <div className='mb-3 text-[10px] font-extrabold tracking-widest text-gray-5 uppercase'>
            Display Layout
          </div>
          <div className='flex flex-col gap-2'>
            {layouts.map((l) => {
              const isActive = layout === l.id
              return (
                <UnstyledButton
                  key={l.id}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 transition-all duration-200',
                    isActive
                      ? 'border-accent-primary bg-accent-soft/5 shadow-sm'
                      : 'hover:bg-gray-50 border-gray-2 bg-surface-primary hover:border-gray-3',
                  )}
                  onClick={() => setLayout(l.id as any)}
                >
                  <div
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg border',
                      isActive
                        ? 'border-accent-primary bg-accent-primary text-white'
                        : 'bg-gray-50 text-gray-400 border-gray-2',
                    )}
                  >
                    <Icon height={16} name={l.icon} width={16} />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div
                      className={cn(
                        'text-xs font-extrabold',
                        isActive ? 'text-gray-13' : 'text-gray-9',
                      )}
                    >
                      {l.name}
                    </div>
                    <div className='truncate text-[10px] text-gray-5'>
                      {l.description}
                    </div>
                  </div>
                  {isActive && (
                    <Icon
                      className='shrink-0 text-accent-primary'
                      height={16}
                      name='tabler:circle-check-filled'
                      width={16}
                    />
                  )}
                </UnstyledButton>
              )
            })}
          </div>
        </div>

        {/* Status List */}
        <div className='space-y-2 border-t border-gray-2 pt-4'>
          <div className='mb-2 text-[10px] font-extrabold tracking-widest text-gray-5 uppercase'>
            Checklist
          </div>
          <div className='flex items-center gap-2 text-[11px] font-medium text-gray-7'>
            <Icon
              className='text-green-500'
              height={12}
              name='lucide:check-circle'
              width={12}
            />
            <span>
              All {panels.reduce((acc, p) => acc + p.fields.length, 0)}{' '}
              questions validated
            </span>
          </div>
          <div className='flex items-center gap-2 text-[11px] font-medium text-gray-7'>
            <Icon
              className='text-green-500'
              height={12}
              name='lucide:check-circle'
              width={12}
            />
            <span>Responsive layouts optimized</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='bg-gray-50 shrink-0 space-y-3 border-t border-gray-2 p-5'>
        <Group gap='sm' grow>
          <Button
            className='h-11 text-[11px] font-bold tracking-wider uppercase'
            color='gray'
            disabled={isPublishing}
            loading={isSavingDraft}
            radius='xl'
            size='md'
            variant='light'
            onClick={() => handleAction('DRAFT')}
          >
            Save Draft
          </Button>
          <Button
            bg='accent-primary'
            className='h-11 text-[11px] font-bold tracking-wider uppercase shadow-lg shadow-accent-soft/30 transition-all hover:scale-[1.02] active:scale-95'
            disabled={isSavingDraft}
            loading={isPublishing}
            radius='xl'
            size='md'
            onClick={() => handleAction('PUBLISHED')}
          >
            Publish
          </Button>
        </Group>
        <div className='flex items-center justify-center gap-2 opacity-50'>
          <div className='bg-gray-400 size-1 rounded-full' />
          <div className='text-[9px] font-black text-gray-5 uppercase'>
            v1.0.4 Staging
          </div>
          <div className='bg-gray-400 size-1 rounded-full' />
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
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
            `,
        }}
      />
    </div>
  )
}

export default PublishSidebar
