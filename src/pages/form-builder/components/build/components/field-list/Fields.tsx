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
      label: 'Templates',
      items: [
        {
          icon: 'lucide:contact',
          label: 'Contact Info',
          type: 'template:contact_info',
        },
        {
          icon: 'lucide:home',
          label: 'Address Info',
          type: 'template:address_info',
        },
      ],
    },
    {
      label: 'Display',
      items: [
        {
          icon: 'lucide:heading',
          label: 'Heading',
          type: 'heading',
        },
        {
          icon: 'lucide:type',
          label: 'Label',
          type: 'label',
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
          icon: 'lucide:lock',
          label: 'Password',
          type: 'password',
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
          icon: 'lucide:mail',
          label: 'Email',
          type: 'email',
        },
        {
          icon: 'lucide:phone',
          label: 'Phone Number',
          type: 'phone',
        },
        {
          icon: 'lucide:map-pin',
          label: 'Address',
          type: 'address',
        },
        {
          icon: 'lucide:user',
          label: 'Full Name',
          type: 'full_name',
        },
      ],
    },
    {
      label: 'Date & Time',
      items: [
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
          icon: 'lucide:calendar-clock',
          label: 'Date and Time',
          type: 'date_time',
        },
      ],
    },
    {
      label: 'Selections',
      items: [
        {
          icon: 'lucide:list-todo',
          label: 'Single Select',
          type: 'dropdown',
        },
        {
          icon: 'lucide:list-checks',
          label: 'Multi Select',
          type: 'checkbox',
        },
        {
          icon: 'mdi:radiobox-marked',
          label: 'Single Choice',
          type: 'choices',
        },
        {
          icon: 'lucide:square-check',
          label: 'Multi Choice',
          type: 'checkbox',
        },
      ],
    },
    {
      label: 'Rating',
      items: [
        {
          icon: 'lucide:star',
          label: 'Star Rating',
          type: 'rating',
        },
        {
          icon: 'tabler:chart-bar-popular',
          label: 'Opinion Scale',
          type: 'rating',
        },
        {
          icon: 'lucide:list-ordered',
          label: 'Ranking',
          type: 'ranking',
        },
      ],
    },
    {
      label: 'Advanced',
      items: [
        {
          icon: 'lucide:file-up',
          label: 'File Upload',
          type: 'file_upload',
        },
        {
          icon: 'tabler:circle-dot',
          label: 'Counter',
          type: 'counter',
        },
        {
          icon: 'lucide:calculator',
          label: 'Calculated',
          type: 'calculated',
        },
        {
          icon: 'lucide:globe',
          label: 'Country Code',
          type: 'country_code',
        },
        {
          icon: 'lucide:type',
          label: 'Text Builder',
          type: 'text_builder',
        },
        {
          icon: 'lucide:table',
          label: 'Table',
          type: 'table',
        },
      ],
    },
  ];
  const filteredGroups = fieldGroups.map(group => ({
    ...group,
    items: group.items.filter(item =>
      item.label.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(group => group.items.length > 0)

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
          chevron: 'text-gray-9',
          content: 'space-y-1.5 p-0 pb-6',
          control:
            'focus rounded-lg p-2 transition-all hover:bg-gray-1 active:scale-95 mb-1',
          item: 'border-none',
          label:
            'p-0 text-12 font-bold text-gray-13 uppercase tracking-[0.1em]',
        }}
      >
        {filteredGroups.map((group) => (
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
        {filteredGroups.length === 0 && (
          <div className="py-8 text-center text-gray-5 text-sm">
            No fields found matching "{search}"
          </div>
        )}
      </Accordion>
    </div>
  )
}

Fields.displayName = 'Fields'
export default Fields
