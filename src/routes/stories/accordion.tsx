import { ActionIcon } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import Accordion from '@/components/base/accordion/Accordion'
import { Accordion as Base } from '@mantine/core'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/accordion')({
    component: AccordionStory,
})

function AccordionStory() {
    const items = [
        {
            value: 'customization',
            label: 'Customization',
            content: 'Colors, fonts, shadows and many other parts are customizable to fit your design needs.',
        },
        {
            value: 'flexibility',
            label: 'Flexibility',
            content: 'Configure components with props to achievement exactly what you want.',
        },
        {
            value: 'focus-ring',
            label: 'Focus ring',
            content: 'Render focus ring around interactive elements to improve accessibility.',
        },
    ]

    return (
        <div className='max-w-4xl p-6'>
            <StoryTitle>Accordion</StoryTitle>
            <p className='text-15 text-gray-11 mb-10'>
                Accordions allow users to toggle the visibility of sections of content.
                They are ideal for managing vertical space when presenting long lists of information like FAQs or settings groups.
            </p>

            <p className='text-14 text-gray-11 mb-4'>Before using Accordion, import it and its sub-components:</p>
            <StoryCode>
                {`import Accordion from '@/components/base/accordion/Accordion'
import { Accordion as Base } from '@mantine/core'`}
            </StoryCode>

            <div className='space-y-16'>
                {/* Basic Usage */}
                <section>
                    <StorySubTitle>Basic Usage</StorySubTitle>
                    <p className='text-14 text-gray-11 mb-6'>
                        The Accordion uses Mantine's primitive sub-components for child items.
                    </p>
                    <div className='bg-white dark:bg-gray-1 border border-gray-3 rounded-xl overflow-hidden'>
                        <Accordion>
                            {items.map((item) => (
                                <Base.Item key={item.value} value={item.value}>
                                    <Base.Control className='px-6 py-4 text-14 font-medium'>{item.label}</Base.Control>
                                    <Base.Panel className='px-6 pb-6 pt-0 text-14 leading-relaxed text-gray-11 dark:text-white'>
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
