import {
  Box,
  Group,
  Select,
  Stack,
  Textarea,
  TextInput,
  UnstyledButton,
} from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import {
  type FormLayout,
  type FormType,
  useFormStore,
} from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

const FORM_TYPES: {
  description: string
  icon: string
  label: string
  value: FormType
}[] = [
  {
    description: 'For business processes & automation',
    icon: 'tabler:git-branch',
    label: 'Workflow',
    value: 'WORKFLOW',
  },
  {
    description: 'For managing datas',
    icon: 'tabler:message-star',
    label: 'Master',
    value: 'MASTER',
  },
]

const LAYOUTS: { description: string; id: FormLayout; label: string }[] = [
  {
    description: 'Show one question per screen',
    id: 'typeform',
    label: 'One at a time',
  },
  {
    description: 'Group questions into pages',
    id: 'grid',
    label: 'Page by Page',
  },
  {
    description: 'Display all questions on a single page',
    id: 'full',
    label: 'All Questions',
  },
]

const LayoutSkeleton = ({ type }: { type: FormLayout }) => {
  return (
    <div className='flex h-full w-full flex-col gap-2 bg-gray-1 p-3'>
      {type === 'typeform' && (
        <div className='flex flex-1 flex-col items-center justify-center gap-3'>
          <div className='h-4 w-2/3 rounded bg-gray-4 opacity-80 shadow-sm' />
          <div className='h-3 w-1/2 rounded bg-gray-3' />
          <div className='mt-2 flex h-9 w-1/3 items-center justify-center rounded-xl border border-accent-soft/60 bg-accent-soft/40'>
            <div className='h-1 w-1/3 rounded-full bg-accent-primary/40' />
          </div>
        </div>
      )}
      {type === 'grid' && (
        <div className='flex-1 space-y-3'>
          <div className='flex justify-between border-b border-gray-3 pb-2'>
            <div className='h-3 w-1/4 rounded bg-gray-4' />
            <div className='h-3 w-1/6 rounded bg-gray-3' />
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <div className='h-7 rounded-lg border border-gray-3 bg-white shadow-xs' />
            <div className='h-7 rounded-lg border border-gray-3 bg-white shadow-xs' />
          </div>
          <div className='h-12 rounded-xl border border-gray-3 bg-white shadow-xs' />
        </div>
      )}
      {type === 'full' && (
        <div className='flex-1 space-y-2 overflow-hidden px-1'>
          {[1, 2, 3, 4, 5].map((i) => (
            <div className='flex flex-col gap-1.5 pt-1' key={i}>
              <div className='h-2 w-1/3 rounded-full bg-gray-4 opacity-60' />
              <div className='h-6 w-full rounded-lg border border-gray-2 bg-white shadow-sm' />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const GeneralSettings = () => {
  const {
    coordinator,
    description,
    formType,
    layout,
    name,
    setCoordinator,

    setDescription,
    setFormType,
    setLayout,
    setName,
  } = useFormStore()

  return (
    <Box className='animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-[1000px] px-6 py-6 font-inter duration-500'>
      <Stack gap={24}>
        {/* Header Section */}
        <Group align='flex-start' gap='xl' wrap='nowrap'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft/30'>
            <Icon
              className='text-accent-primary'
              height={20}
              name='lucide:settings-2'
              width={20}
            />
          </div>
          <Box>
            <h2 className='text-xl font-bold text-gray-13'>General</h2>
            <p className='mt-1 max-w-[300px] text-sm text-gray-9'>
              Define your form's core identity and administrative properties
            </p>
          </Box>

          <Stack className='ml-auto flex-1' gap='lg'>
            <TextInput
              className='w-full'
              label='Form Name'
              placeholder='e.g. Q1 Performance Review'
              value={name}
              required
              classNames={{
                input:
                  'bg-gray-50 h-10 rounded-xl border-gray-2 font-medium transition-all focus:border-accent-primary',
                label:
                  'mb-2 text-xs font-bold tracking-wider text-gray-9 uppercase',
              }}
              onChange={(e) => setName(e.target.value)}
            />

            <Textarea
              className='w-full'
              label='Description'
              minRows={3}
              placeholder='Internal notes or context for this form...'
              value={description}
              classNames={{
                input:
                  'bg-gray-50 rounded-xl border-gray-2 font-medium transition-all focus:border-accent-primary',
                label:
                  'mb-2 text-xs font-bold tracking-wider text-gray-9 uppercase',
              }}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Stack>
        </Group>

        <div className='h-px bg-gray-1' />

        {/* Form Type Section */}
        <Group align='flex-start' gap='xl' wrap='nowrap'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft/30'>
            <Icon
              className='text-accent-primary'
              height={20}
              name='lucide:layers'
              width={20}
            />
          </div>
          <Box className='w-[200px] shrink-0'>
            <h3 className='text-sm font-bold text-gray-13'>Form Type</h3>
            <p className='mt-1 text-xs font-medium text-gray-5'>
              Choose how this form will be utilized in the system
            </p>
          </Box>

          <div className='flex max-w-[500px] flex-1 flex-col gap-4'>
            <div className='grid w-full grid-cols-1 gap-5 sm:grid-cols-2'>
              {FORM_TYPES.map((type) => {
                const isActive = formType === type.value
                return (
                  <UnstyledButton
                    key={type.value}
                    className={cn(
                      'group flex aspect-[4/3] flex-col items-center justify-center rounded-2xl border-2 p-6 text-center transition-all',
                      isActive
                        ? 'border-accent-primary bg-accent-soft/5 shadow-md ring-4 ring-accent-soft/10'
                        : 'bg-gray-50 hover:bg-gray-100/80 border-transparent',
                    )}
                    onClick={() => setFormType(type.value)}
                  >
                    <div
                      className={cn(
                        'mb-4 flex size-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
                        isActive
                          ? 'bg-accent-primary text-white shadow-lg shadow-accent-soft/50'
                          : 'border border-gray-2 bg-white text-gray-4',
                      )}
                    >
                      <Icon height={24} name={type.icon} width={24} />
                    </div>
                    <div>
                      <div
                        className={cn(
                          'text-sm font-extrabold tracking-tight uppercase',
                          isActive ? 'text-gray-13' : 'text-gray-9',
                        )}
                      >
                        {type.label}
                      </div>
                      <div className='mt-1 text-[10px] font-bold tracking-wide text-gray-5 italic opacity-70'>
                        {type.description}
                      </div>
                    </div>
                  </UnstyledButton>
                )
              })}
            </div>
          </div>
        </Group>

        <div className='h-px bg-gray-1' />

        {/* Coordinator Section */}
        <Group align='flex-start' gap='xl' wrap='nowrap'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft/30'>
            <Icon
              className='text-accent-primary'
              height={20}
              name='lucide:user-cog'
              width={20}
            />
          </div>
          <Box className='w-[200px] shrink-0'>
            <h3 className='text-gray-900 text-sm font-bold'>Coordinator</h3>
            <p className='text-gray-500 mt-1 text-xs'>Assign primary contact</p>
          </Box>

          <div className='flex-1'>
            <Select
              data={['Admin', 'Project Manager', 'HR Department', 'IT Support']}
              placeholder='Select Coordinator'
              value={coordinator}
              classNames={{
                input:
                  'focus:border-primary-500 rounded-lg border-gray-2 bg-white shadow-none transition-all',
              }}
              onChange={(val) => setCoordinator(val || '')}
            />
          </div>
        </Group>

        <div className='h-px bg-gray-1' />

        {/* Layout Section */}
        <div className='flex flex-col gap-6'>
          <Group align='center' gap='xl' wrap='nowrap'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft/30'>
              <Icon
                className='text-accent-primary'
                height={20}
                name='lucide:layout-template'
                width={20}
              />
            </div>
            <Box>
              <h2 className='text-xl font-bold text-gray-13'>Form Layout</h2>
              <p className='mt-1 text-sm text-gray-9'>
                Choose how your form will be presented to respondents
              </p>
            </Box>
          </Group>

          <div className='ml-14 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3'>
            {LAYOUTS.map((l) => (
              <UnstyledButton
                className='group flex w-full flex-col gap-3'
                key={l.id}
                onClick={() => setLayout(l.id)}
              >
                <Box
                  className={cn(
                    'relative flex h-[140px] w-full flex-col overflow-hidden rounded-2xl border-2 bg-white transition-all',
                    layout === l.id
                      ? 'border-accent-primary shadow-sm ring-4 shadow-accent-soft/20 ring-accent-soft/10'
                      : 'group-hover:bg-gray-50/10 border-gray-2 group-hover:border-gray-3',
                  )}
                >
                  {layout === l.id && (
                    <div className='absolute top-2 right-2 z-20 flex size-6 scale-110 transform items-center justify-center rounded-full bg-accent-primary shadow-lg'>
                      <Icon
                        className='text-white'
                        height={14}
                        name='lucide:check'
                        width={14}
                      />
                    </div>
                  )}
                  <LayoutSkeleton type={l.id} />
                </Box>
                <Box className='px-1 text-center'>
                  <div
                    className={cn(
                      'text-sm font-bold transition-colors',
                      layout === l.id ? 'text-accent-primary' : 'text-gray-900',
                    )}
                  >
                    {l.label}
                  </div>
                  <div className='text-gray-500 mt-1 text-[10px] font-bold tracking-wider uppercase opacity-70'>
                    {l.description}
                  </div>
                </Box>
              </UnstyledButton>
            ))}
          </div>
        </div>
      </Stack>
    </Box>
  )
}

GeneralSettings.displayName = 'GeneralSettings'
export default GeneralSettings
