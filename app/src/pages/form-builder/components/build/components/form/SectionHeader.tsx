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
    <div className='group/header relative flex flex-col gap-1 rounded-t-2xl border-b border-gray-3/30 bg-white px-8 pt-4 pb-3 transition-all'>
      {/* Visual Indicator Line (Optional based on design, matching purple branding) */}
      <div className='absolute top-0 right-8 left-8 h-1 rounded-b-md bg-accent-soft/20' />

      {/* Compact Header: Title + Actions */}
      <div className='group/desc -ml-2 flex h-10 w-full items-center justify-between'>
        <div className='flex min-w-0 flex-1 items-center'>
          {/* Hover Actions: Drag handles and collapse */}
          <div className='flex w-8 shrink-0 items-center justify-center'>
            <Tooltip
              label={isCollapsed ? 'Expand' : 'Collapse'}
              position='top'
              withArrow
            >
              <ActionIcon
                className='rounded-md text-gray-10 transition-all hover:bg-gray-1 hover:text-gray-13 active:scale-95'
                color='gray'
                size='sm'
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
          </div>

          <input
            className='hover:bg-gray-50 flex-1 rounded-md bg-transparent px-1 py-1 text-lg font-semibold tracking-tight text-gray-13 transition-colors placeholder:text-gray-4 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:hover:bg-transparent'
            disabled={isLocked}
            placeholder='Section Title'
            type='text'
            value={panel?.settings?.title || ''}
            onChange={(e) => updatePanel(panel.id, { title: e.target.value })}
          />
        </div>

        {/* Right Actions - Moved outside to floating bar */}
        <div className='flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/header:opacity-100'>
          {/* Only keeping things that might still be useful inside if any, but the user asked for them outside. Canva keeps nothing in header except title. */}
        </div>
      </div>

      {/* Description Input (with mocked variable detection for visual) */}
      <div className='group/desc relative mt-1 flex w-full items-center'>
        <input
          className='w-full bg-transparent px-1 text-13 font-medium text-gray-12 placeholder:font-normal placeholder:text-gray-8 focus:outline-none disabled:cursor-not-allowed'
          disabled={isLocked}
          placeholder='Please provide details...'
          type='text'
          value={panel?.settings?.description || ''}
          onChange={(e) =>
            updatePanel(panel.id, { description: e.target.value })
          }
        />

        {fieldCount > 0 && (
          <div className='bg-gray-50 pointer-events-none absolute top-1/2 right-0 shrink-0 -translate-y-1/2 rounded-md border border-gray-2 px-2 py-0.5 opacity-0 transition-opacity group-hover/desc:opacity-100'>
            <span className='text-[10px] leading-none font-bold tracking-widest whitespace-nowrap text-gray-4 uppercase'>
              {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
            </span>
          </div>
        )}
      </div>

      <div className='mt-4 h-px w-full bg-gray-1' />
    </div>
  )
}

export default SectionHeader
