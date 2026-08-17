import { ActionIcon, Tooltip } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { type Panel, useFormStore } from '@/pages/form-builder/store/formStore'

interface Props {
  fieldCount: number
  isCollapsed: boolean
  panel: Panel
  isLocked?: boolean
  onToggleCollapse: () => void
}

const SectionHeader = ({
  fieldCount,
  isCollapsed,
  isLocked,
  panel,
  onToggleCollapse,
}: Props) => {
  const { updatePanel } = useFormStore()

  return (
    <div className='group/header relative flex flex-col gap-1 rounded-t-2xl bg-white px-6 pt-5 pb-3 transition-all'>
      {/* Header: Title + Expand Toggle + Count Badge */}
      <div className='flex w-full items-center justify-between gap-4'>
        <div className='flex min-w-0 flex-1 items-center gap-1.5 -ml-2'>
          <Tooltip
            label={isCollapsed ? 'Expand' : 'Collapse'}
            position='top'
            withArrow
          >
            <ActionIcon
              className='rounded-md text-gray-10 transition-all hover:bg-gray-2 hover:text-gray-13 active:scale-95'
              color='gray'
              size='sm'
              variant='subtle'
              onClick={onToggleCollapse}
            >
              <Icon
                height={18}
                width={18}
                name={
                  isCollapsed ? 'lucide:chevron-down' : 'lucide:chevron-up'
                }
              />
            </ActionIcon>
          </Tooltip>

          <input
            className='flex-1 rounded-lg bg-transparent px-1 py-0.5 font-poppins text-xl font-bold tracking-tight text-gray-13 transition-colors placeholder:text-gray-8 focus:bg-gray-1/50 focus:outline-none disabled:cursor-not-allowed'
            disabled={isLocked}
            placeholder='Section Title'
            type='text'
            value={panel.settings.title}
            onChange={(e) => updatePanel(panel.id, { title: e.target.value })}
          />
        </div>

        {/* Count Pill Badge */}
        {fieldCount > 0 && (
          <div className='shrink-0 rounded-full bg-gray-2 px-3 py-1 text-xs font-semibold text-gray-11 shadow-2xs'>
            {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
          </div>
        )}
      </div>

      {/* Description Input */}
      <div className='mt-0.5 flex w-full items-center pl-6'>
        <input
          className='w-full bg-transparent px-1 text-xs font-normal text-gray-10 placeholder:text-gray-8 focus:outline-none disabled:cursor-not-allowed'
          disabled={isLocked}
          placeholder='Please provide details...'
          type='text'
          value={panel.settings.description}
          onChange={(e) =>
            updatePanel(panel.id, { description: e.target.value })
          }
        />
      </div>
    </div>
  )
}

export default SectionHeader
