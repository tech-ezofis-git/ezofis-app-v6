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
      label: 'Display',
      items: [
        {
          icon: 'lucide:heading',
          label: 'Heading',
          type: 'heading',
        },
        {
          icon: 'lucide:pilcrow',
          label: 'Paragraph',
          type: 'paragraph',
        },
        {
          icon: 'lucide:minus',
          label: 'Divider',
          type: 'divider',
        },
        {
          icon: 'lucide:space',
          label: 'Spacer',
          type: 'spacer',
        },
      ],
    },
    {
      label: 'Basic',
      items: [
        {
          icon: 'mdi:form-textbox',
          label: 'Short Text',
          type: 'short_text',
        },
        {
          icon: 'mdi:form-textarea',
          label: 'Long Text',
          type: 'long_text',
        },
        {
          icon: 'tabler:number-123',
          label: 'Number',
          type: 'number',
        },
        {
          icon: 'lucide:dollar-sign',
          label: 'Currency',
          type: 'currency',
        },
        {
          icon: 'lucide:calendar',
          label: 'Date',
          type: 'date',
        },
        {
          icon: 'lucide:clock',
          label: 'Time',
          type: 'time',
        },
        {
          icon: 'lucide:list-todo',
          label: 'Single Select',
          type: 'single_select',
        },
        {
          icon: 'lucide:list-checks',
          label: 'Multiple Select',
          type: 'multiple_select',
        },
        {
          icon: 'mdi:radiobox-marked',
          label: 'Single Choice',
          type: 'single_choice',
        },
        {
          icon: 'lucide:square-check',
          label: 'Multiple Choice',
          type: 'multiple_choice',
        },
        {
          icon: 'lucide:file-up',
          label: 'File Upload',
          type: 'file_upload',
        },
      ],
    },
    {
      label: 'Rating',
      items: [
        {
          icon: 'lucide:star',
          label: 'Star Rating',
          type: 'star_rating',
        },
        {
          icon: 'tabler:chart-bar-popular',
          label: 'Opinion Scale',
          type: 'opinion_scale',
        },
        {
          icon: 'lucide:list-ordered',
          label: 'Ranking',
          type: 'ranking',
        },
      ],
    },
    {
      label: 'Contact Details',
      items: [
        {
          icon: 'lucide:user',
          label: 'Full Name',
          type: 'full_name',
        },
        {
          icon: 'lucide:mail',
          label: 'Email',
          type: 'email',
        },
        {
          icon: 'lucide:map-pin',
          label: 'Address',
          type: 'address',
        },
        {
          icon: 'lucide:phone',
          label: 'Phone Number',
          type: 'phone_number',
        },
      ],
    },
  ];
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
                type={item.type}
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
