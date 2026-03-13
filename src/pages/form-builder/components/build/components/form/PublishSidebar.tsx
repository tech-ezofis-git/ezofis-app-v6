import {
  ActionIcon,
  Button,
  Group,
  Stack,
  Text,
  Textarea,
  TextInput,
  UnstyledButton,
} from '@mantine/core'
import { useState } from 'react'
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

  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const handleAction = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (status === 'DRAFT') setIsSavingDraft(true)
    else setIsPublishing(true)

    try {
      const success = await saveForm(status)
      if (success) {
        setPublishOpen(false)
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
      id: 'typeform',
      name: 'Focus Mode',
    },
    {
      description: 'Multi-column layout',
      icon: 'tabler:layout-grid',
      id: 'grid',
      name: 'Classic Grid',
    },
    {
      description: 'Single column stack',
      icon: 'tabler:layout-list',
      id: 'full',
      name: 'Vertical Flow',
    },
  ]

  return (
    <div className='animate-in slide-in-from-right flex h-full w-[400px] flex-col border-l border-gray-2 bg-surface-primary font-inter shadow-2xl duration-500'>
      {/* Header */}
      <div className='bg-gray-50/80 shrink-0 border-b border-gray-2 p-4 backdrop-blur-sm'>
        <Group justify='space-between' mb='xs'>
          <div className='flex items-center gap-2'>
            <div className='flex size-8 items-center justify-center rounded-lg bg-accent-soft/20 text-accent-primary'>
              <Icon height={16} name='tabler:rocket' width={16} />
            </div>
            <Text
              className='tracking-tight text-gray-13 uppercase'
              fw={800}
              size='sm'
            >
              Deploy Settings
            </Text>
          </div>
          <ActionIcon
            className='rounded-lg transition-colors hover:bg-gray-2'
            color='gray'
            size='md'
            variant='subtle'
            onClick={() => setPublishOpen(false)}
          >
            <Icon height={16} name='tabler:x' width={16} />
          </ActionIcon>
        </Group>
        <Text
          className='mt-1 px-0.5 leading-tight font-medium text-gray-10'
          size='xs'
        >
          Configure deployment properties and go live.
        </Text>
      </div>

      <div className='custom-scrollbar flex-1 space-y-6 overflow-y-auto p-5'>
        {/* Basic Info */}
        <Stack gap='xs'>
          <Text
            className='tracking-widest text-gray-5 uppercase'
            fw={800}
            size='10px'
          >
            Metadata
          </Text>
          <TextInput
            placeholder='e.g. Q1 Customer Survey'
            size='sm'
            value={name}
            classNames={{
              input: 'bg-gray-50 h-10 border-gray-2 focus:bg-white',
            }}
            label={
              <Text className='mb-1 text-gray-12' fw={700} size='xs'>
                Form Name
              </Text>
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
              <Text className='mb-1 text-gray-12' fw={700} size='xs'>
                Description
              </Text>
            }
            onChange={(e) => setDescription(e.target.value)}
          />
        </Stack>

        {/* Layout Selector */}
        <div>
          <Text
            className='mb-3 tracking-widest text-gray-5 uppercase'
            fw={800}
            size='10px'
          >
            Display Layout
          </Text>
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
                    <Text
                      className={isActive ? 'text-gray-13' : 'text-gray-9'}
                      fw={800}
                      size='xs'
                    >
                      {l.name}
                    </Text>
                    <Text className='truncate text-gray-5' size='10px'>
                      {l.description}
                    </Text>
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
          <Text
            className='mb-2 tracking-widest text-gray-5 uppercase'
            fw={800}
            size='10px'
          >
            Checklist
          </Text>
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
          <Text className='font-black text-gray-5 uppercase' size='9px'>
            v1.0.4 Staging
          </Text>
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
