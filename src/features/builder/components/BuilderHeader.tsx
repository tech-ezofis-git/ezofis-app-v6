import { t } from '@lingui/core/macro'
import {
  ActionIcon,
  Box,
  Group,
  SegmentedControl,
  Text,
  TextInput,
} from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '../store'

const BuilderHeader = () => {
  const { isPreviewMode, redo, title, undo, setIsPreviewMode, setTitle } =
    useFormStore()

  return (
    <Box className='border-slate-200 flex h-full items-center justify-between border-b bg-white px-6'>
      <Group gap='md'>
        <ActionIcon
          color='gray'
          variant='subtle'
          onClick={() => globalThis.history.back()}
        >
          <Icon className='size-[18px]' name='tabler:arrow-left' />
        </ActionIcon>

        <Box className='flex flex-col'>
          <Box className='group flex items-center gap-2'>
            <TextInput
              className='text-slate-950 h-6 leading-tight font-black'
              value={title}
              variant='unstyled'
              classNames={{
                input: 'h-6 min-h-0 p-0 text-base leading-tight font-black',
              }}
              onChange={(e) => setTitle(e.currentTarget.value)}
            />
            <ActionIcon
              className='opacity-0 transition-opacity group-hover:opacity-100'
              color='gray'
              size='sm'
              variant='subtle'
            >
              <Icon className='size-3.5' name='tabler:settings' />
            </ActionIcon>
          </Box>
          <Box className='flex items-center gap-1.5'>
            <div className='relative flex h-1.5 w-1.5'>
              <span className='bg-green-400 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75'></span>
              <span className='bg-green-500 relative inline-flex h-1.5 w-1.5 rounded-full'></span>
            </div>
            <Text
              className='text-slate-500 font-bold tracking-wider uppercase'
              size='10px'
            >
              {t`Draft · Last saved 2m ago`}
            </Text>
          </Box>
        </Box>
      </Group>

      <Group gap='lg'>
        <Group gap='xs'>
          <ActionIcon
            color='gray'
            title={t`Undo`}
            variant='subtle'
            onClick={undo}
          >
            <Icon className='size-4' name='tabler:arrow-back-up' />
          </ActionIcon>
          <ActionIcon
            color='gray'
            title={t`Redo`}
            variant='subtle'
            onClick={redo}
          >
            <Icon className='size-4' name='tabler:arrow-forward-up' />
          </ActionIcon>
        </Group>

        <SegmentedControl
          className='bg-slate-100'
          radius='md'
          size='xs'
          value={isPreviewMode ? 'preview' : 'edit'}
          data={[
            { label: t`Edit`, value: 'edit' },
            { label: t`Preview`, value: 'preview' },
          ]}
          onChange={(v) => setIsPreviewMode(v === 'preview')}
        />

        <Group gap='sm'>
          <ActionIcon
            gradient={{ from: 'indigo', to: 'violet' }}
            radius='md'
            size='md'
            variant='gradient'
            onClick={() => {}}
          >
            <Icon className='size-4' name='lucide:bot' />
          </ActionIcon>

          <ActionIcon color='gray' radius='md' size='md' variant='outline'>
            <Icon className='size-4' name='tabler:device-floppy' />
          </ActionIcon>
        </Group>
      </Group>
    </Box>
  )
}

export default BuilderHeader
