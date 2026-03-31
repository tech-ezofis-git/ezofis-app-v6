import { Button, Group, ActionIcon, Menu } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'

interface Props {
  onClick: () => void
  onSelectTemplate: (type: 'blank' | 'welcome' | 'thank_you') => void
}

const AddSectionButton = ({ onClick, onSelectTemplate }: Props) => {
  return (
    <div className="flex justify-center w-full group/add-section animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Group gap={0} className="bg-white border border-gray-3 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all divide-x divide-gray-2">
        <Button
          variant="subtle"
          color="gray"
          onClick={onClick}
          leftSection={<Icon name="lucide:plus" width={16} height={16} className="text-gray-13" />}
          className="h-10 px-8 hover:bg-gray-50 text-gray-13 font-bold text-sm transition-colors border-0"
        >
          Add page
        </Button>
        
        <Menu position="bottom-end" withArrow shadow="md" width={220}>
          <Menu.Target>
            <ActionIcon 
              variant="subtle" 
              color="gray" 
              className="h-10 w-10 hover:bg-gray-50 text-gray-13 border-0 rounded-none transition-colors"
            >
              <Icon name="lucide:chevron-down" width={16} height={16} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown className="rounded-xl border-gray-2 p-1.5">
            <Menu.Label className="text-[10px] font-black uppercase tracking-widest text-gray-4 pb-2">Add New Section</Menu.Label>
            
            <Menu.Item 
              leftSection={<Icon name="lucide:layout" width={16} height={16} className="text-accent-primary" />}
              onClick={() => onSelectTemplate('blank')}
              className="rounded-lg font-bold text-gray-12 hover:bg-accent-soft/10 mb-0.5"
            >
              Blank Page
            </Menu.Item>

            <Menu.Item 
              leftSection={<Icon name="lucide:megaphone" width={16} height={16} className="text-orange-500" />}
              onClick={() => onSelectTemplate('welcome')}
              className="rounded-lg font-bold text-gray-12 hover:bg-orange-50 mb-0.5"
            >
              Welcome Screen
            </Menu.Item>

            <Menu.Item 
              leftSection={<Icon name="lucide:party-popper" width={16} height={16} className="text-pink-500" />}
              onClick={() => onSelectTemplate('thank_you')}
              className="rounded-lg font-bold text-gray-12 hover:bg-pink-50"
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
