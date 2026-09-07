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
    <div className='group/header relative flex flex-col gap-0.5 rounded-t-xl bg-white px-4 pt-3.5 pb-2 transition-all'>
      {/* Header: Title + Expand Toggle + Count Badge */}
      <div className='flex w-full items-center justify-between gap-3'>
        <div className='flex min-w-0 flex-1 items-center gap-1 -ml-1.5'>
          <Tooltip
            label={isCollapsed ? 'Expand' : 'Collapse'}
            position='top'
            withArrow
          >
            <ActionIcon
              className='rounded-md text-gray-10 transition-all hover:bg-gray-2 hover:text-gray-13 active:scale-95'
              color='gray'
              size='xs'
              variant='subtle'
              onClick={onToggleCollapse}
            >
              <Icon
                height={16}
                width={16}
                name={
                  isCollapsed ? 'lucide:chevron-down' : 'lucide:chevron-up'
                }
              />
            </ActionIcon>
          </Tooltip>

          <input
            className='flex-1 rounded-md bg-transparent px-1 py-0.5 text-15/5 font-bold text-gray-13 transition-colors placeholder:text-gray-9 focus:bg-gray-1/60 focus:outline-none disabled:cursor-not-allowed'
            disabled={isLocked}
            placeholder='Section Title'
            type='text'
            value={panel?.settings?.title || ''}
            onChange={(e) => updatePanel(panel.id, { title: e.target.value })}
          />
        </div>

        {/* Count Pill Badge */}
        {fieldCount > 0 && (
          <div className='shrink-0 rounded-full border border-gray-3 bg-gray-2 px-2.5 py-0.5 text-[11px] font-semibold text-gray-11 shadow-2xs'>
            {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
          </div>
        )}
      </div>

      {/* Description Input */}
      <div className='flex w-full items-center pl-6'>
        <input
          className='w-full bg-transparent px-1 text-xs font-normal text-gray-10 placeholder:text-gray-9 focus:outline-none disabled:cursor-not-allowed'
          disabled={isLocked}
          placeholder='Please provide details...'
          type='text'
          value={panel?.settings?.description || ''}
          onChange={(e) =>
            updatePanel(panel.id, { description: e.target.value })
          }
        />
      </div>
    </div>
  )
}

export default SectionHeader
