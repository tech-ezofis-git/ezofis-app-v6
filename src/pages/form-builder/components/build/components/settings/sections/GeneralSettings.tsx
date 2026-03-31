import { Divider, UnstyledButton, Box, Group } from '@mantine/core'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import type { FormType } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import cn from '@/utils/cn'

const FORM_TYPES: {
  desc: string
  icon: string
  name: string
  value: FormType
}[] = [
    {
      desc: 'For business processes & automation',
      icon: 'tabler:git-branch',
      name: 'Workflow',
      value: 'WORKFLOW',
    },
    {
      desc: 'For surveys & reviews',
      icon: 'tabler:message-star',
      name: 'Master',
      value: 'MASTER',
    },
  ]

const GeneralSettings = () => {
  const { name, setName, description, setDescription, formType, setFormType } = useFormStore()

  return (
    <div className='custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4 animate-in fade-in duration-500'>
      {/* Basic Info */}
      <Input
        label='Form Name'
        value={name}
        clearable
        required
        onChange={setName}
      />

      <div>
        <label className='mb-2 block text-13 font-medium text-gray-11'>
          Description
        </label>
        <div className='relative'>
          <textarea
            className='min-h-[80px] w-full resize-none rounded-md border border-gray-6 bg-transparent px-3 py-2 text-13 font-medium text-gray-12 outline-none placeholder:font-normal placeholder:text-gray-8 focus:border-primary-8 focus:ring-2 focus:ring-primary-6'
            value={description}
            placeholder="What is this form for?"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <Divider className='border-gray-2' />

      {/* Form Type Cards */}
      <div className='space-y-3'>
        <div className="text-xs font-bold text-gray-11 flex items-center gap-2">
          <Icon name="lucide:layers" width={14} height={14} /> Form Type
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FORM_TYPES.map((t) => {
            const active = formType === t.value
            return (
              <UnstyledButton
                key={t.value}
                onClick={() => setFormType(t.value)}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group gap-2 text-center h-[120px]",
                  active
                    ? "border-accent-primary bg-accent-soft/5 shadow-sm ring-2 ring-accent-soft/10"
                    : "border-gray-5 bg-transparent hover:bg-gray-1"
                )}
              >
                <div className={cn(
                  "size-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-11",
                  active ? "bg-accent-primary text-white shadow-md shadow-accent-soft/3" : "bg-white text-gray-8 border border-gray-4"
                )}>
                  <Icon name={t.icon} width={18} height={18} />
                </div>
                <div className="px-1">
                  <div className={cn("text-xs font-extra-bold uppercase tracking-tight leading-none mb-1", active ? "text-gray-13" : "text-gray-12")}>{t.name}</div>
                  <div className="text-[9px] font-semibold text-gray-5 leading-tight opacity-8 italic text-gray-10">{t.desc}</div>
                </div>
              </UnstyledButton>
            )
          })}
        </div>
      </div>

      <Divider className='border-gray-2' />

      <Box className="p-4 bg-gray-50 rounded-2xl border border-gray-2">
        <Group gap="xs" mb={8}>
          <Icon name="lucide:sparkles" width={14} height={14} className="text-accent-primary" />
          <div className="text-[11px] font-bold text-gray-11">Quick Note</div>
        </Group>
        <div className="text-[10px] text-gray-6 font-medium leading-relaxed">
          These settings apply to the entire form experience. You can also customize Welcome and Thank You pages in their respective screens.
        </div>
      </Box>
    </div>
  )
}

export default GeneralSettings
