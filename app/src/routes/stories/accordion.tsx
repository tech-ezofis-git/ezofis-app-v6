import { Accordion as Base } from '@mantine/core'
// import { ActionIcon } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import Accordion from '@/components/base/accordion/Accordion'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/accordion')({
  component: AccordionStory,
})

function AccordionStory() {
  const items = [
    {
      content:
        'Colors, fonts, shadows and many other parts are customizable to fit your design needs.',
      label: 'Customization',
      value: 'customization',
    },
    {
      content:
        'Configure components with props to achievement exactly what you want.',
      label: 'Flexibility',
      value: 'flexibility',
    },
    {
      content:
        'Render focus ring around interactive elements to improve accessibility.',
      label: 'Focus ring',
      value: 'focus-ring',
    },
  ]

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Accordion</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        Accordions allow users to toggle the visibility of sections of content.
        They are ideal for managing vertical space when presenting long lists of
        information like FAQs or settings groups.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using Accordion, import it and its sub-components:
      </p>
      <StoryCode>
        {`import Accordion from '@/components/base/accordion/Accordion'
import { Accordion as Base } from '@mantine/core'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Basic Usage */}
        <section>
          <StorySubTitle>Basic Usage</StorySubTitle>
          <p className='mb-6 text-14 text-gray-11'>
            The Accordion uses Mantine's primitive sub-components for child
            items.
          </p>
          <div className='overflow-hidden rounded-xl border border-gray-3 bg-surface'>
            <Accordion>
              {items.map((item) => (
                <Base.Item key={item.value} value={item.value}>
                  <Base.Control className='px-6 py-4 text-14 font-medium'>
                    {item.label}
                  </Base.Control>
                  <Base.Panel className='px-6 pt-0 pb-6 text-14 leading-relaxed text-gray-11 dark:text-white'>
                    {item.content}
                  </Base.Panel>
                </Base.Item>
              ))}
            </Accordion>
          </div>
          <div className='mt-6'>
            <StoryCode>
              {`<Accordion>
  <Base.Item value="item-1">
    <Base.Control>Section Title</Base.Control>
    <Base.Panel>Section Content</Base.Panel>
  </Base.Item>
</Accordion>`}
            </StoryCode>
          </div>
        </section>
      </div>
    </div>
  )
}
