import { UnstyledButton } from '@mantine/core'
import type {
  FormLayout,
  FormType,
  PublishStatus,
} from '@/pages/form-builder/store/formStore'
import Icon from '@/components/base/icon/Icon'
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
    desc: 'Processes & Automation',
    icon: 'tabler:git-branch',
    name: 'Workflow',
    value: 'WORKFLOW',
  },
  {
    desc: 'Surveys & Reviews',
    icon: 'tabler:message-star',
    name: 'Master',
    value: 'MASTER',
  },
]

const LAYOUT_OPTIONS: {
  desc: string
  icon: string
  name: string
  value: FormLayout
}[] = [
  {
    desc: 'One question at a time',
    icon: 'tabler:square-rotated',
    name: 'Single Page',
    value: 'SINGLE',
  },
  {
    desc: 'Multi-column layout',
    icon: 'tabler:layout-grid',
    name: 'Classic Grid',
    value: 'CLASSIC',
  },
  {
    desc: 'Expandable section stack',
    icon: 'tabler:layout-list',
    name: 'Accordion',
    value: 'ACCORDION',
  },
]

const GeneralSettings = () => {
  const {
    description,
    formType,
    layout,
    name,
    publishStatus,
    setDescription,
    setFormType,
    setLayout,
    setName,
    setPublishStatus,
  } = useFormStore()

  return (
    <div className='custom-scrollbar animate-in fade-in flex-1 space-y-4 overflow-y-auto p-4 duration-500'>
      {/* 1. Form Name */}
      <Input
        label='Form Name'
        value={name}
        clearable
        required
        onChange={setName}
      />

      {/* 2. Description */}
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

      {/* 3. Form Type Cards */}
      <div className='space-y-2.5'>
        <div className='flex items-center gap-2 text-13 font-medium text-gray-11'>
          <Icon height={15} name='lucide:layers' width={15} /> Form Type
        </div>
        <div className='grid grid-cols-2 gap-3'>
          {FORM_TYPES.map((t) => {
            const active = formType === t.value
            return (
              <UnstyledButton
                key={t.value}
                className={cn(
                  'group flex h-[90px] flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition-all',
                  active
                    ? 'border-primary-9 bg-primary-1/60 shadow-xs ring-2 ring-primary-6/20'
                    : 'border-gray-4 bg-transparent hover:bg-gray-1',
                )}
                onClick={() => setFormType(t.value)}
              >
                <div
                  className={cn(
                    'flex size-8 items-center justify-center rounded-lg transition-transform group-hover:scale-105',
                    active
                      ? 'bg-primary-9 text-white shadow-xs'
                      : 'border border-gray-4 bg-surface text-gray-8',
                  )}
                >
                  <Icon height={16} name={t.icon} width={16} />
                </div>
                <div className='px-1'>
                  <div
                    className={cn(
                      'mb-0.5 text-12 leading-none font-semibold tracking-tight uppercase',
                      active ? 'text-primary-9' : 'text-gray-12',
                    )}
                  >
                    {t.name}
                  </div>
                  <div className='truncate text-[10px] leading-tight font-normal text-gray-10'>
                    {t.desc}
                  </div>
                </div>
              </UnstyledButton>
            )
          })}
        </div>
      </div>

      {/* 4. Form Layout Cards */}
      <div className='space-y-2.5'>
        <div className='flex items-center gap-2 text-13 font-medium text-gray-11'>
          <Icon height={15} name='lucide:layout-template' width={15} /> Form
          Layout
        </div>
        <div className='flex flex-col gap-2'>
          {LAYOUT_OPTIONS.map((l) => {
            const active = layout === l.value
            return (
              <UnstyledButton
                key={l.value}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-2.5 transition-all duration-200',
                  active
                    ? 'border-primary-9 bg-primary-1/60 shadow-xs ring-2 ring-primary-6/20'
                    : 'border-gray-4 bg-transparent hover:bg-gray-1',
                )}
                onClick={() => setLayout(l.value)}
              >
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg border',
                    active
                      ? 'border-primary-9 bg-primary-9 text-white'
                      : 'border-gray-3 bg-surface text-gray-8',
                  )}
                >
                  <Icon height={16} name={l.icon} width={16} />
                </div>
                <div className='min-w-0 flex-1 text-left'>
                  <div
                    className={cn(
                      'text-12 font-semibold',
                      active ? 'text-primary-9' : 'text-gray-12',
                    )}
                  >
                    {l.name}
                  </div>
                  <div className='truncate text-[10px] text-gray-10'>
                    {l.desc}
                  </div>
                </div>
                {active && (
                  <Icon
                    className='shrink-0 text-primary-9'
                    height={16}
                    name='lucide:check-circle-2'
                    width={16}
                  />
                )}
              </UnstyledButton>
            )
          })}
        </div>
      </div>

      {/* 5. Publish Option */}
      <div className='flex flex-col gap-1.5 pt-1'>
        <label className='text-13 font-medium text-gray-11'>
          Publish Option
        </label>
        <div className='bg-surface-muted flex rounded-lg border border-gray-3 p-1'>
          {[
            { id: 'DRAFT', label: 'Draft' },
            { id: 'PUBLISHED', label: 'Published' },
          ].map((opt) => {
            const active = String(publishStatus).toUpperCase() === opt.id
            return (
              <button
                key={opt.id}
                type='button'
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-primary-9 text-white shadow-sm'
                    : 'text-gray-9 hover:bg-surface/50 hover:text-gray-12'
                }`}
                onClick={() => setPublishStatus(opt.id as PublishStatus)}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default GeneralSettings
