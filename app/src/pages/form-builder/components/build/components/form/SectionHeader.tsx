import { ActionIcon, Tooltip } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { type Panel, useFormStore } from '@/pages/form-builder/store/formStore'
import cn from '@/utils/cn'

interface Props {
  fieldCount: number
  isCollapsed: boolean
  isLogicOpen: boolean
  panel: Panel
  isLocked?: boolean
  onToggleCollapse: () => void
  onToggleLogic: () => void
}

const SectionHeader = ({
  fieldCount,
  isCollapsed,
  isLocked,
  isLogicOpen,
  panel,
  onToggleCollapse,
  onToggleLogic,
}: Props) => {
  const { updatePanel } = useFormStore()
  const ruleCount = panel?.settings?.logic?.length || 0

  return (
    <>
      <div className='group/header relative flex flex-col gap-0.5 rounded-t-xl bg-surface px-4 pt-3.5 pb-2 transition-all'>
        {/* Header: Title + Expand Toggle + Count Badge */}
        <div className='flex w-full items-center justify-between gap-3'>
          <div className='-ml-1.5 flex min-w-0 flex-1 items-center gap-1'>
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
                  name={
                    isCollapsed ? 'lucide:chevron-down' : 'lucide:chevron-up'
                  }
                  width={16}
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

          <Tooltip label='Section logic' position='top' withArrow>
            <button
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all hover:border-primary-5 hover:bg-primary-2 active:scale-95',
                ruleCount > 0 || isLogicOpen
                  ? 'border-primary-5 bg-primary-1 text-primary-9'
                  : 'border-gray-3 bg-gray-2 text-gray-11',
              )}
              onClick={onToggleLogic}
            >
              <Icon height={12} name='lucide:split' width={12} />
              {ruleCount > 0 ? `Logic · ${ruleCount}` : 'Logic'}
            </button>
          </Tooltip>

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
    </>
  )
}

export default SectionHeader
