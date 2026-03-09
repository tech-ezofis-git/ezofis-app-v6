import { TextInput, Textarea, Stack, Box, Group, Select, Text, UnstyledButton } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useFormStore, type FormType, type FormLayout } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'


const FORM_TYPES: { value: FormType, label: string, description: string, icon: string }[] = [
  { value: 'WORKFLOW', label: 'Workflow', description: 'For business processes & automation', icon: 'tabler:git-branch' },
  { value: 'MASTER', label: 'Master', description: 'For managing datas', icon: 'tabler:message-star' },
]



const LAYOUTS: { id: FormLayout, label: string, description: string }[] = [
  { id: 'typeform', label: 'One at a time', description: 'Show one question per screen' },
  { id: 'grid', label: 'Page by Page', description: 'Group questions into pages' },
  { id: 'full', label: 'All Questions', description: 'Display all questions on a single page' },
]

const LayoutSkeleton = ({ type }: { type: FormLayout }) => {
  return (
    <div className="w-full h-full flex flex-col gap-2 p-3 bg-gray-1">
      {type === 'typeform' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-2/3 h-4 bg-gray-4 rounded shadow-sm opacity-80" />
          <div className="w-1/2 h-3 bg-gray-3 rounded" />
          <div className="w-1/3 h-9 bg-accent-soft/40 border border-accent-soft/60 rounded-xl mt-2 flex items-center justify-center">
            <div className="w-1/3 h-1 bg-accent-primary/40 rounded-full" />
          </div>
        </div>
      )}
      {type === 'grid' && (
        <div className="flex-1 space-y-3">
          <div className="flex justify-between border-b border-gray-3 pb-2">
            <div className="w-1/4 h-3 bg-gray-4 rounded" />
            <div className="w-1/6 h-3 bg-gray-3 rounded" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-7 bg-white rounded-lg border border-gray-3 shadow-xs" />
            <div className="h-7 bg-white rounded-lg border border-gray-3 shadow-xs" />
          </div>
          <div className="h-12 bg-white rounded-xl border border-gray-3 shadow-xs" />
        </div>
      )}
      {type === 'full' && (
        <div className="flex-1 space-y-2 overflow-hidden px-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex flex-col gap-1.5 pt-1">
              <div className="w-1/3 h-2 bg-gray-4 rounded-full opacity-60" />
              <div className="w-full h-6 bg-white border border-gray-2 rounded-lg shadow-sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const GeneralSettings = () => {
  const {
    name, setName,
    description, setDescription,
    formType, setFormType,

    coordinator, setCoordinator,
    layout, setLayout
  } = useFormStore()

  return (
    <Box className="max-w-[1000px] mx-auto py-10 px-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-inter">
      <Stack gap={32}>
        {/* Header Section */}
        <Group align="flex-start" gap="xl" wrap="nowrap">
          <div className="size-10 bg-accent-soft/30 rounded-lg flex items-center justify-center shrink-0">
            <Icon name="lucide:settings-2" className="text-accent-primary" width={20} height={20} />
          </div>
          <Box>
            <h2 className="text-xl font-bold text-gray-13">General</h2>
            <p className="text-sm text-gray-9 mt-1 max-w-[300px]">
              Define your form's core identity and administrative properties
            </p>
          </Box>

          <Stack gap="lg" className="flex-1 ml-auto">
            <TextInput
              label="Form Name"
              required
              placeholder="e.g. Q1 Performance Review"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
              classNames={{
                label: 'text-xs font-bold text-gray-9 mb-2 uppercase tracking-wider',
                input: 'focus:border-accent-primary transition-all h-10 rounded-xl bg-gray-50 border-gray-2 font-medium'
              }}
            />

            <Textarea
              label="Description"
              placeholder="Internal notes or context for this form..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full"
              minRows={3}
              classNames={{
                label: 'text-xs font-bold text-gray-9 mb-2 uppercase tracking-wider',
                input: 'focus:border-accent-primary transition-all rounded-xl bg-gray-50 border-gray-2 font-medium'
              }}
            />
          </Stack>
        </Group>

        <div className="h-px bg-gray-1" />

        {/* Form Type Section */}
        <Group align="flex-start" gap="xl" wrap="nowrap">
          <div className="size-10 bg-accent-soft/30 rounded-lg flex items-center justify-center shrink-0">
            <Icon name="lucide:layers" className="text-accent-primary" width={20} height={20} />
          </div>
          <Box className="w-[200px] shrink-0">
            <h3 className="text-sm font-bold text-gray-13">Form Type</h3>
            <p className="text-xs text-gray-5 mt-1 font-medium">Choose how this form will be utilized in the system</p>
          </Box>

          <div className="flex flex-col gap-4 flex-1 max-w-[500px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
              {FORM_TYPES.map((type) => {
                const isActive = formType === type.value
                return (
                  <UnstyledButton
                    key={type.value}
                    onClick={() => setFormType(type.value)}
                    className={cn(
                      "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all group aspect-[4/3] text-center",
                      isActive
                        ? "border-accent-primary bg-accent-soft/5 shadow-md ring-4 ring-accent-soft/10"
                        : "border-transparent bg-gray-50 hover:bg-gray-100/80"
                    )}
                  >
                    <div className={cn(
                      "size-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300",
                      isActive ? "bg-accent-primary text-white shadow-lg shadow-accent-soft/50" : "bg-white text-gray-4 border border-gray-2"
                    )}>
                      <Icon name={type.icon} width={24} height={24} />
                    </div>
                    <div>
                      <Text className={cn(
                        "text-sm font-extrabold uppercase tracking-tight",
                        isActive ? "text-gray-13" : "text-gray-9"
                      )}>{type.label}</Text>
                      <Text className="text-[10px] text-gray-5 mt-1 font-bold opacity-70 italic tracking-wide">
                        {type.description}
                      </Text>
                    </div>
                  </UnstyledButton>
                )
              })}
            </div>
          </div>

        </Group>


        <div className="h-px bg-gray-1" />

        {/* Coordinator Section */}
        <Group align="flex-start" gap="xl" wrap="nowrap">
          <div className="size-10 bg-accent-soft/30 rounded-lg flex items-center justify-center shrink-0">
            <Icon name="lucide:user-cog" className="text-accent-primary" width={20} height={20} />
          </div>
          <Box className="w-[200px] shrink-0">
            <h3 className="text-sm font-bold text-gray-900">Coordinator</h3>
            <p className="text-xs text-gray-500 mt-1">Assign primary contact</p>
          </Box>

          <div className="flex-1">
            <Select
              placeholder="Select Coordinator"
              data={['Admin', 'Project Manager', 'HR Department', 'IT Support']}
              value={coordinator}
              onChange={(val) => setCoordinator(val || '')}
              classNames={{
                input: 'focus:border-primary-500 transition-all rounded-lg bg-white border-gray-2 shadow-none'
              }}
            />
          </div>
        </Group>

        <div className="h-px bg-gray-1" />

        {/* Layout Section */}
        <div className="flex flex-col gap-6">
          <Group align="center" gap="xl" wrap="nowrap">
            <div className="size-10 bg-accent-soft/30 rounded-lg flex items-center justify-center shrink-0">
              <Icon name="lucide:layout-template" className="text-accent-primary" width={20} height={20} />
            </div>
            <Box>
              <h2 className="text-xl font-bold text-gray-13">Form Layout</h2>
              <p className="text-sm text-gray-9 mt-1">
                Choose how your form will be presented to respondents
              </p>
            </Box>
          </Group>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 ml-14">
            {LAYOUTS.map((l) => (
              <UnstyledButton
                key={l.id}
                onClick={() => setLayout(l.id)}
                className="flex flex-col gap-3 group w-full"
              >
                <Box className={cn(
                  "h-[140px] w-full rounded-2xl border-2 transition-all flex flex-col relative bg-white overflow-hidden",
                  layout === l.id
                    ? "border-accent-primary shadow-sm shadow-accent-soft/20 ring-4 ring-accent-soft/10"
                    : "border-gray-2 group-hover:border-gray-3 group-hover:bg-gray-50/10"
                )}>
                  {layout === l.id && (
                    <div className="absolute top-2 right-2 z-20 size-6 bg-accent-primary rounded-full flex items-center justify-center shadow-lg transform scale-110">
                      <Icon name="lucide:check" className="text-white" width={14} height={14} />
                    </div>
                  )}
                  <LayoutSkeleton type={l.id} />
                </Box>
                <Box className="px-1 text-center">
                  <Text className={cn(
                    "text-sm font-bold transition-colors",
                    layout === l.id ? "text-accent-primary" : "text-gray-900"
                  )}>{l.label}</Text>
                  <Text className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-1 opacity-70">
                    {l.description}
                  </Text>
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
