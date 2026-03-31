import { ActionIcon, Divider, Text, Tooltip } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { type Panel, useFormStore } from '@/pages/form-builder/store/formStore'

interface Props {
  fieldCount: number
  isCollapsed: boolean
  panel: Panel
  panelIndex: number
  onToggleCollapse: () => void
}

const SectionHeader = ({
  fieldCount,
  isCollapsed,
  panel,
  panelIndex,
  onToggleCollapse,
}: Props) => {
  const { deletePanel, movePanel, panels, updatePanel } = useFormStore()

  return (
    <div className='group/header flex flex-col gap-2 rounded-t-2xl border-b border-gray-1 bg-gray-0 px-6 py-4 transition-all'>
      {/* Top Row: Icon, Title, Actions */}
      <div className='flex items-center justify-between gap-4'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <div className='flex size-9 items-center justify-center rounded-xl border border-accent-soft/30 bg-accent-soft/20 text-accent-primary shadow-sm'>
            <Icon height={20} name='lucide:layout' width={20} />
          </div>

          <div className='flex min-w-0 flex-1 flex-col'>
            <div className='flex items-center gap-3'>
              <input
                className='truncate bg-transparent py-0 text-[22px] font-semibold tracking-tight text-gray-13 placeholder:text-gray-3 focus:outline-none'
                placeholder='Section Title'
                type='text'
                value={panel.settings.title}
                onChange={(e) =>
                  updatePanel(panel.id, { title: e.target.value })
                }
              />
              <div className='shrink-0 rounded-full border border-gray-3 bg-gray-2 px-2 py-0.5'>
                <Text
                  className='whitespace-nowrap text-gray-9'
                  fw={700}
                  size='xs'
                >
                  {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
                </Text>
              </div>
            </div>
          </div>
        </div>

        <div className='flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/header:opacity-100'>
          {/* Move Controls */}
          <div className='flex items-center rounded-lg border border-gray-3 bg-gray-1 p-0.5'>
            {panelIndex > 0 && (
              <Tooltip label='Move Up' position='top' withArrow>
                <ActionIcon
                  className='rounded-md transition-all hover:bg-white active:scale-95'
                  color='gray'
                  size='sm'
                  variant='subtle'
                  onClick={() => movePanel(panel.id, 'up')}
                >
                  <Icon height={14} name='lucide:arrow-up' width={14} />
                </ActionIcon>
              </Tooltip>
            )}
            {panelIndex < panels.length - 1 && (
              <Tooltip label='Move Down' position='top' withArrow>
                <ActionIcon
                  className='rounded-md transition-all hover:bg-white active:scale-95'
                  color='gray'
                  size='sm'
                  variant='subtle'
                  onClick={() => movePanel(panel.id, 'down')}
                >
                  <Icon height={14} name='lucide:arrow-down' width={14} />
                </ActionIcon>
              </Tooltip>
            )}
          </div>

          <Divider
            className='h-4 border-gray-3'
            mx={4}
            orientation='vertical'
          />

          {/* Section Actions */}
          <div className='flex items-center gap-1'>
            <Tooltip
              label={isCollapsed ? 'Expand' : 'Collapse'}
              position='top'
              withArrow
            >
              <ActionIcon
                className='rounded-lg transition-all hover:bg-gray-2 active:scale-95'
                color='gray'
                size='md'
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

            <Tooltip label='Delete Section' position='top' withArrow>
              <ActionIcon
                className='hover:bg-red-50 rounded-lg transition-all active:scale-95'
                color='red'
                size='md'
                variant='subtle'
                onClick={() => deletePanel(panel.id)}
              >
                <Icon height={16} name='lucide:trash' width={16} />
              </ActionIcon>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Bottom Row: Description */}
      <div className='flex-1'>
        <input
          className='w-full bg-transparent text-13/5 text-gray-11 placeholder:text-gray-3 focus:outline-none'
          placeholder='Add a description for this section...'
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
