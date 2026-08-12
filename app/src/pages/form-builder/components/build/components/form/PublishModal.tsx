import {
  Button,
  Group,
  Modal,
  Stack,
  Textarea,
  TextInput,
  UnstyledButton,
} from '@mantine/core'
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

const PublishModal = () => {
  const {
    description,
    isPublishOpen,
    name,
    previewMode,
    saveForm,
    setDescription,
    setName,
    setPreviewMode,
    setPublishOpen,
  } = useFormStore()

  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const layouts = [
    {
      description: 'One question at a time',
      icon: 'tabler:square-rotated',
      id: 'typeform',
      name: 'Typeform',
    },
    {
      description: 'Classic multi-column layout',
      icon: 'tabler:layout-grid',
      id: 'grid',
      name: 'Grid',
    },
    {
      description: 'Single column vertical flow',
      icon: 'tabler:layout-list',
      id: 'full',
      name: 'Full',
    },
  ]

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

  return (
    <Modal
      opened={isPublishOpen}
      padding={0}
      radius='lg'
      size='md'
      transitionProps={{ duration: 300, transition: 'slide-up' }}
      withCloseButton={false}
      overlayProps={{
        blur: 3,
        opacity: 0.55,
      }}
      onClose={() => setPublishOpen(false)}
    >
      <div className='overflow-hidden border border-surface-secondary font-inter shadow-2xl'>
        {/* Header */}
        <div className='to-indigo-600 relative bg-gradient-to-br from-accent-primary p-6 text-white'>
          <div className='relative z-10'>
            <Group justify='space-between' mb='xs'>
              <div className='flex size-10 items-center justify-center rounded-xl bg-white/20'>
                <Icon height={20} name='tabler:rocket' width={20} />
              </div>
              <UnstyledButton
                className='flex size-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20'
                onClick={() => setPublishOpen(false)}
              >
                <Icon height={16} name='tabler:x' width={16} />
              </UnstyledButton>
            </Group>
            <div className='text-xl font-extrabold tracking-tight'>
              Publish Your Form
            </div>
            <div className='mt-1 text-sm opacity-80'>
              Review your settings before going live.
            </div>
          </div>
        </div>

        <div className='space-y-6 bg-surface-primary p-6'>
          {/* Basic Info */}
          <Stack gap='md'>
            <TextInput
              placeholder='e.g. Q1 Customer Survey'
              size='sm'
              value={name}
              classNames={{
                input:
                  'bg-gray-50 h-11 border-gray-2 transition-colors focus:border-accent-primary',
              }}
              label={
                <div className='mb-1 text-xs font-bold tracking-wider text-gray-11 uppercase'>
                  Deployment Name
                </div>
              }
              onChange={(e) => setName(e.target.value)}
            />
            <Textarea
              minRows={2}
              placeholder='Add a description for your team...'
              size='sm'
              value={description}
              autosize
              classNames={{
                input:
                  'bg-gray-50 border-gray-2 transition-colors focus:border-accent-primary',
              }}
              label={
                <div className='mb-1 text-xs font-bold tracking-wider text-gray-11 uppercase'>
                  Form Description
                </div>
              }
              onChange={(e) => setDescription(e.target.value)}
            />
          </Stack>

          {/* Layout Selector */}
          <div>
            <div className='mb-3 text-xs font-bold tracking-wider text-gray-11 uppercase'>
              Choose Display Layout
            </div>
            <div className='grid grid-cols-1 gap-2'>
              {layouts.map((layout) => {
                const isActive = previewMode === layout.id
                return (
                  <UnstyledButton
                    key={layout.id}
                    className={cn(
                      'flex items-center gap-4 rounded-xl border p-3 transition-all duration-200',
                      isActive
                        ? 'border-accent-primary bg-accent-soft/10 shadow-sm'
                        : 'hover:bg-gray-50 border-gray-2 bg-surface-primary hover:border-gray-3',
                    )}
                    onClick={() => setPreviewMode(layout.id as any)}
                  >
                    <div
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-lg border',
                        isActive
                          ? 'border-accent-primary bg-accent-primary text-white'
                          : 'bg-opacity-50 text-gray-400 border-gray-2 bg-gray-1',
                      )}
                    >
                      <Icon height={18} name={layout.icon} width={18} />
                    </div>
                    <div className='flex-1 text-left'>
                      <div
                        className={cn(
                          'text-sm',
                          isActive
                            ? 'font-extrabold text-gray-13'
                            : 'font-semibold text-gray-11',
                        )}
                      >
                        {layout.name}
                      </div>
                      <div className='text-[11px] text-gray-5'>
                        {layout.description}
                      </div>
                    </div>
                    {isActive && (
                      <Icon
                        className='mr-2 text-accent-primary'
                        height={16}
                        name='tabler:check'
                        width={16}
                      />
                    )}
                  </UnstyledButton>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className='flex flex-col gap-3 pt-2'>
            <Group gap='md' grow>
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
            <div className='mt-1 text-center text-[10px] font-black tracking-widest text-gray-4 uppercase'>
              Deployment version 1.0.4
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default PublishModal
