import { Box, Divider, Group, UnstyledButton } from '@mantine/core'
import type { FormType } from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import Input from '@/components/base/inputs/InputText'
import { useFormStore } from '@/pages/form-builder/store/formStore'
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
  const { description, formType, name, setDescription, setFormType, setName } =
    useFormStore()

  return (
    <div className='custom-scrollbar animate-in fade-in flex-1 space-y-3 overflow-y-auto p-4 duration-500'>
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
            placeholder='What is this form for?'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <Divider className='border-gray-2' />

      {/* Form Type Cards */}
      <div className='space-y-3'>
        <div className='flex items-center gap-2 text-xs font-bold text-gray-11'>
          <Icon height={14} name='lucide:layers' width={14} /> Form Type
        </div>
        <div className='grid grid-cols-2 gap-3'>
          {FORM_TYPES.map((t) => {
            const active = formType === t.value
            return (
              <UnstyledButton
                key={t.value}
                className={cn(
                  'group flex h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 text-center transition-all',
                  active
                    ? 'border-accent-primary bg-accent-soft/5 shadow-sm ring-2 ring-accent-soft/10'
                    : 'border-gray-5 bg-transparent hover:bg-gray-1',
                )}
                onClick={() => setFormType(t.value)}
              >
                <div
                  className={cn(
                    'flex size-9 items-center justify-center rounded-lg transition-transform group-hover:scale-11',
                    active
                      ? 'bg-accent-primary text-white shadow-md shadow-accent-soft/3'
                      : 'border border-gray-4 bg-white text-gray-8',
                  )}
                >
                  <Icon height={18} name={t.icon} width={18} />
                </div>
                <div className='px-1'>
                  <div
                    className={cn(
                      'font-extra-bold mb-1 text-xs leading-none tracking-tight uppercase',
                      active ? 'text-gray-13' : 'text-gray-12',
                    )}
                  >
                    {t.name}
                  </div>
                  <div className='text-[9px] leading-tight font-semibold text-gray-5 text-gray-10 italic opacity-8'>
                    {t.desc}
                  </div>
                </div>
              </UnstyledButton>
            )
          })}
        </div>
      </div>

      <Divider className='border-gray-2' />

      <Box className='bg-gray-50 rounded-2xl border border-gray-2 p-4'>
        <Group gap='xs' mb={8}>
          <AiBrandIcon className='size-3.5 shrink-0' variant='outline-purple' />
          <div className='text-[11px] font-bold text-gray-11'>Quick Note</div>
        </Group>
        <div className='text-[10px] leading-relaxed font-medium text-gray-6'>
          These settings apply to the entire form experience. You can also
          customize Welcome and Thank You pages in their respective screens.
        </div>
      </Box>
    </div>
  )
}

export default GeneralSettings
