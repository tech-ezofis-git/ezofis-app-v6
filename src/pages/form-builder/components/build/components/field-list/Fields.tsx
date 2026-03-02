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
          type: 'CONTACT_INFO',
        },
        {
          icon: 'lucide:home',
          label: 'Address Info',
          type: 'ADDRESS_INFO',
        },
      ],
    },
    {
      label: 'Display',
      items: [
        {
          icon: 'lucide:heading',
          label: 'Heading',
          type: 'HEADING',
        },
        {
          icon: 'lucide:type',
          label: 'Label',
          type: 'LABEL',
        },
        {
          icon: 'lucide:pilcrow',
          label: 'Paragraph',
          type: 'TEXT_BUILDER',
        },
        {
          icon: 'lucide:minus',
          label: 'Divider',
          type: 'DIVIDER',
        },
        {
          icon: 'lucide:space',
          label: 'Spacer',
          type: 'DIVIDER',
        },
      ],
    },
    {
      label: 'Basic',
      items: [
        {
          icon: 'mdi:form-textbox',
          label: 'Short Text',
          type: 'SHORT_TEXT',
        },
        {
          icon: 'mdi:form-textarea',
          label: 'Long Text',
          type: 'LONG_TEXT',
        },
        {
          icon: 'lucide:lock',
          label: 'Password',
          type: 'PASSWORD',
        },
        {
          icon: 'tabler:number-123',
          label: 'Number',
          type: 'NUMBER',
        },
        {
          icon: 'lucide:dollar-sign',
          label: 'Currency',
          type: 'CURRENCY_AMOUNT',
        },
        {
          icon: 'lucide:mail',
          label: 'Email',
          type: 'EMAIL',
        },
        {
          icon: 'lucide:phone',
          label: 'Phone Number',
          type: 'PHONE_NUMBER',
        },
        {
          icon: 'lucide:map-pin',
          label: 'Address',
          type: 'ADDRESS',
        },
        {
          icon: 'lucide:user',
          label: 'Full Name',
          type: 'FULL_NAME',
        },
      ],
    },
    {
      label: 'Date & Time',
      items: [
        {
          icon: 'lucide:calendar',
          label: 'Date',
          type: 'DATE',
        },
        {
          icon: 'lucide:clock',
          label: 'Time',
          type: 'TIME',
        },
        {
          icon: 'lucide:calendar-clock',
          label: 'Date and Time',
          type: 'DATE_TIME',
        },
      ],
    },
    {
      label: 'Selections',
      items: [
        {
          icon: 'lucide:list-todo',
          label: 'Single Select',
          type: 'SINGLE_SELECT',
        },
        {
          icon: 'lucide:list-checks',
          label: 'Multi Select',
          type: 'MULTI_SELECT',
        },
        {
          icon: 'mdi:radiobox-marked',
          label: 'Single Choice',
          type: 'SINGLE_CHOICE',
        },
        {
          icon: 'lucide:square-check',
          label: 'Multi Choice',
          type: 'MULTIPLE_CHOICE',
        },
      ],
    },
    {
      label: 'Rating',
      items: [
        {
          icon: 'lucide:star',
          label: 'Star Rating',
          type: 'RATING',
        },
        {
          icon: 'tabler:chart-bar-popular',
          label: 'Opinion Scale',
          type: 'RATING',
        },
        {
          icon: 'lucide:list-ordered',
          label: 'Ranking', // Note: Ranking might not be in store, mapping to RATING or similar if needed, or check store
          type: 'RATING',
        },
      ],
    },
    {
      label: 'Advanced',
      items: [
        {
          icon: 'lucide:file-up',
          label: 'File Upload',
          type: 'FILE_UPLOAD',
        },
        {
          icon: 'tabler:circle-dot',
          label: 'Counter',
          type: 'COUNTER',
        },
        {
          icon: 'lucide:calculator',
          label: 'Calculated',
          type: 'CALCULATED',
        },
        {
          icon: 'lucide:globe',
          label: 'Country Code',
          type: 'COUNTRY_CODE',
        },
        {
          icon: 'lucide:type',
          label: 'Text Builder',
          type: 'TEXT_BUILDER',
        },
        {
          icon: 'lucide:table',
          label: 'Table',
          type: 'TABLE',
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
