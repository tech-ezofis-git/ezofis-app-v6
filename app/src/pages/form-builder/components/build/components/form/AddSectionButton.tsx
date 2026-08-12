import { ActionIcon, Button, Group, Menu } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'

interface Props {
  onClick: () => void
  onSelectTemplate: (type: 'blank' | 'welcome' | 'thank_you') => void
}

const AddSectionButton = ({ onClick, onSelectTemplate }: Props) => {
  return (
    <div className='group/add-section animate-in fade-in slide-in-from-bottom-2 flex w-full justify-center duration-500'>
      <Group
        className='divide-x divide-gray-2 overflow-hidden rounded-lg border border-gray-3 bg-white shadow-sm transition-all hover:shadow-md'
        gap={0}
      >
        <Button
          className='hover:bg-gray-50 h-10 border-0 px-8 text-sm font-bold text-gray-13 transition-colors'
          color='gray'
          variant='subtle'
          leftSection={
            <Icon
              className='text-gray-13'
              height={16}
              name='lucide:plus'
              width={16}
            />
          }
          onClick={onClick}
        >
          Add page
        </Button>

        <Menu position='bottom-end' shadow='md' width={220} withArrow>
          <Menu.Target>
            <ActionIcon
              className='hover:bg-gray-50 h-10 w-10 rounded-none border-0 text-gray-13 transition-colors'
              color='gray'
              variant='subtle'
            >
              <Icon height={16} name='lucide:chevron-down' width={16} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown className='rounded-xl border-gray-2 p-1.5'>
            <Menu.Label className='pb-2 text-[10px] font-black tracking-widest text-gray-4 uppercase'>
              Add New Section
            </Menu.Label>

            <Menu.Item
              className='mb-0.5 rounded-lg font-normal text-gray-12 hover:bg-accent-soft/10'
              leftSection={
                <Icon
                  className='text-accent-primary'
                  height={16}
                  name='lucide:layout'
                  width={16}
                />
              }
              onClick={() => onSelectTemplate('blank')}
            >
              Blank Page
            </Menu.Item>

            <Menu.Item
              className='hover:bg-orange-50 mb-0.5 rounded-lg font-normal text-gray-12'
              leftSection={
                <Icon
                  className='text-orange-500'
                  height={16}
                  name='lucide:megaphone'
                  width={16}
                />
              }
              onClick={() => onSelectTemplate('welcome')}
            >
              Welcome Screen
            </Menu.Item>

            <Menu.Item
              className='hover:bg-pink-50 rounded-lg font-normal text-gray-12'
              leftSection={
                <Icon
                  className='text-pink-500'
                  height={16}
                  name='lucide:party-popper'
                  width={16}
                />
              }
              onClick={() => onSelectTemplate('thank_you')}
            >
              Completion Screen
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </div>
  )
}

export default AddSectionButton
