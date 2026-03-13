import {
  Button,
  Group,
  Modal,
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
            <Text className='tracking-tight' fw={800} size='xl'>
              Publish Your Form
            </Text>
            <Text className='mt-1 opacity-80' size='sm'>
              Review your settings before going live.
            </Text>
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
                <Text
                  className='mb-1 tracking-wider text-gray-11 uppercase'
                  fw={700}
                  size='xs'
                >
                  Deployment Name
                </Text>
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
                <Text
                  className='mb-1 tracking-wider text-gray-11 uppercase'
                  fw={700}
                  size='xs'
                >
                  Form Description
                </Text>
              }
              onChange={(e) => setDescription(e.target.value)}
            />
          </Stack>

          {/* Layout Selector */}
          <div>
            <Text
              className='mb-3 tracking-wider text-gray-11 uppercase'
              fw={700}
              size='xs'
            >
              Choose Display Layout
            </Text>
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
                      <Text
                        className={isActive ? 'text-gray-13' : 'text-gray-11'}
                        fw={isActive ? 800 : 600}
                        size='sm'
                      >
                        {layout.name}
                      </Text>
                      <Text className='text-gray-5' size='11px'>
                        {layout.description}
                      </Text>
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
            <Text
              className='mt-1 text-center font-black tracking-widest text-gray-4 uppercase'
              size='10px'
            >
              Deployment version 1.0.4
            </Text>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default PublishModal
