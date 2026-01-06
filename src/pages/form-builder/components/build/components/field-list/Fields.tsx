import { Accordion } from '@mantine/core'
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import InputText from '@/components/base/inputs/InputText'
import Field from './Field'
import FieldGroup from './FieldGroup'

const Fields = () => {
  const [search, setSearch] = useState('')

  const fieldGroups = [
    {
      items: [
        {
          icon: 'lucide:heading',
          label: 'Heading',
        },
        {
          icon: 'lucide:pilcrow',
          label: 'Paragraph',
        },
        {
          icon: 'lucide:minus',
          label: 'Divider',
        },
        {
          icon: 'lucide:space',
          label: 'Spacer',
        },
      ],
      label: 'Display',
    },
    {
      items: [
        {
          icon: 'mdi:form-textbox',
          label: 'Short Text',
        },
        {
          icon: 'mdi:form-textarea',
          label: 'Long Text',
        },
        {
          icon: 'tabler:number-123',
          label: 'Number',
        },
        {
          icon: 'lucide:dollar-sign',
          label: 'Currency',
        },
        {
          icon: 'lucide:calendar',
          label: 'Date',
        },
        {
          icon: 'lucide:clock',
          label: 'Time',
        },
        {
          icon: 'lucide:list-todo',
          label: 'Single Select',
        },
        {
          icon: 'lucide:list-checks',
          label: 'Multiple Select',
        },
        {
          icon: 'mdi:radiobox-marked',
          label: 'Single Choice',
        },
        {
          icon: 'lucide:square-check',
          label: 'Multiple Choice',
        },
        {
          icon: 'lucide:file-up',
          label: 'File Upload',
        },
      ],
      label: 'Basic',
    },
    {
      items: [
        {
          icon: 'lucide:star',
          label: 'Star Rating',
        },
        {
          icon: 'tabler:chart-bar-popular',
          label: 'Opinion Scale',
        },
        {
          icon: 'lucide:list-ordered',
          label: 'Ranking',
        },
      ],
      label: 'Rating',
    },
    {
      items: [
        {
          icon: 'lucide:user',
          label: 'Full Name',
        },
        {
          icon: 'lucide:mail',
          label: 'Email',
        },
        {
          icon: 'lucide:map-pin',
          label: 'Address',
        },
        {
          icon: 'lucide:phone',
          label: 'Phone Number',
        },
      ],
      label: 'Contact Details',
    },
  ]

  return (
    <div className='space-y-6 p-4'>
      <InputText
        placeholder='Search fields'
        rightSection={<Icon className='text-gray-9' name='lucide:search' />}
        value={search}
        clearable
        onChange={setSearch}
      />

      <Accordion
        defaultValue={fieldGroups.map((group) => group.label)}
        multiple
        classNames={{
          chevron: 'text-gray-9 group-hover:text-gray-11',
          content: 'space-y-2 p-0 pb-6',
          control:
            'focus group mb-1 rounded p-2 transition-colors hover:bg-gray-4 focus-visible:bg-gray-4 focus-visible:outline-0',
          item: 'border-none',
          label:
            'p-0 text-13 font-medium text-gray-10 group-hover:text-gray-11',
        }}
      >
        {fieldGroups.map((group) => (
          <FieldGroup key={group.label} label={group.label}>
            {group.items.map((item) => (
              <Field
                icon={item.icon}
                key={item.label}
                label={item.label}
                draggable
              />
            ))}
          </FieldGroup>
        ))}
      </Accordion>
    </div>
  )
}

Fields.displayName = 'Fields'
export default Fields
