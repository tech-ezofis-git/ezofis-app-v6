import { createFileRoute } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/button')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>1. Button</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        Buttons are used to trigger actions, such as submitting a form, opening
        a dialog, or performing an operation. They provide a clear call to
        action (CTA) for users.
      </p>
      <p className='mb-4 text-14 text-gray-11'>
        before using button import it from '@/components/base/button/Button'
      </p>
      <StoryCode>
        {`import Button from '@/components/base/button/Button'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A standard button with default primary styling and medium size.
          </p>
          <StoryCode>{`<Button label='Button' />`}</StoryCode>
          <div className='flex items-center gap-4'>
            <Button label='Button' />
          </div>
        </section>

        {/* Colors Section */}
        <section>
          <StorySubTitle>Colors</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Buttons support multiple semantic color variants to convey meaning
            or hierarchy:
          </p>
          <ul className='mb-6 ml-2 list-inside list-disc space-y-2 text-14 text-gray-11'>
            <li>
              <strong>Primary:</strong> Default brand color.
            </li>
            <li>
              <strong>Secondary:</strong> Used for less prominent actions.
            </li>
            <li>
              <strong>Red:</strong> Indicates destructive or dangerous actions.
            </li>
            <li>
              <strong>Green:</strong> Indicates success or positive actions.
            </li>
            <li>
              <strong>Gray:</strong> Neutral styling for tertiary actions.
            </li>
          </ul>
          <StoryCode>
            {`<Button label='Button' />
<Button color='secondary' label='Button' />
<Button color='red' label='Button' />
<Button color='green' label='Button' />
<Button color='gray' label='Button' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4'>
            <Button label='Button' />
            <Button color='secondary' label='Button' />
            <Button color='red' label='Button' />
            <Button color='green' label='Button' />
            <Button color='gray' label='Button' />
          </div>
        </section>

        {/* Variants Section */}
        <section>
          <StorySubTitle>Variants</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Different visual styles can be applied to buttons to differentiate
            their importance:
          </p>
          <ul className='mb-6 ml-2 list-inside list-disc space-y-2 text-14 text-gray-11'>
            <li>
              <strong>Solid:</strong> Filled background (default).
            </li>
            <li>
              <strong>Outline:</strong> Bordered with transparent background.
            </li>
            <li>
              <strong>Subtle:</strong> Light background with primary color text.
            </li>
            <li>
              <strong>Ghost:</strong> Transparent background, only visible on
              hover.
            </li>
          </ul>
          <StoryCode>
            {`<Button label='Button' variant='solid' />
<Button label='Button' variant='outline' />
<Button label='Button' variant='subtle' />
<Button label='Button' variant='ghost' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4 pb-4'>
            <Button label='Solid' variant='solid' />
            <Button label='Outline' variant='outline' />
            <Button label='Subtle' variant='subtle' />
            <Button label='Ghost' variant='ghost' />
          </div>
          <StoryCode>
            {`<Button label='Button' color="secondary" variant='solid' />
<Button label='Button' color="secondary" variant='outline' />
<Button label='Button' color="secondary" variant='subtle' />
<Button label='Button' color="secondary" variant='ghost' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4 pb-4'>
            <Button color='secondary' label='Solid' variant='solid' />
            <Button color='secondary' label='Outline' variant='outline' />
            <Button color='secondary' label='Subtle' variant='subtle' />
            <Button color='secondary' label='Ghost' variant='ghost' />
          </div>

          <StoryCode>
            {`<Button label='Button' color="red" variant='solid' />
<Button label='Button' color="red" variant='outline' />
<Button label='Button' color="red" variant='subtle' />
<Button label='Button' color="red" variant='ghost' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4 pb-4'>
            <Button color='red' label='Solid' variant='solid' />
            <Button color='red' label='Outline' variant='outline' />
            <Button color='red' label='Subtle' variant='subtle' />
            <Button color='red' label='Ghost' variant='ghost' />
          </div>

          <StoryCode>
            {`<Button label='Button' color="green" variant='solid' />
<Button label='Button' color="green" variant='outline' />
<Button label='Button' color="green" variant='subtle' />
<Button label='Button' color="green" variant='ghost' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4 pb-4'>
            <Button color='green' label='Solid' variant='solid' />
            <Button color='green' label='Outline' variant='outline' />
            <Button color='green' label='Subtle' variant='subtle' />
            <Button color='green' label='Ghost' variant='ghost' />
          </div>

          <StoryCode>
            {`<Button label='Button' color="gray" variant='solid' />
<Button label='Button' color="gray" variant='outline' />
<Button label='Button' color="gray" variant='subtle' />
<Button label='Button' color="gray" variant='ghost' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4 pb-4'>
            <Button color='gray' label='Solid' variant='solid' />
            <Button color='gray' label='Outline' variant='outline' />
            <Button color='gray' label='Subtle' variant='subtle' />
            <Button color='gray' label='Ghost' variant='ghost' />
          </div>
        </section>

        {/* Sizes Section */}
        <section>
          <StorySubTitle>Sizes</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Buttons are available in five standardized sizes:
          </p>
          <ul className='mb-6 ml-2 list-inside list-disc space-y-2 text-14 text-gray-11'>
            <li>
              <strong>Extra Small (xs):</strong> For tight spaces.
            </li>
            <li>
              <strong>Small (sm):</strong> Compact layouts.
            </li>
            <li>
              <strong>Medium (md):</strong> Default size.
            </li>
            <li>
              <strong>Large (lg):</strong> Prominent actions.
            </li>
            <li>
              <strong>Extra Large (xl):</strong> High-impact CTAs.
            </li>
          </ul>
          <StoryCode>
            {`<Button label='Button' size='xs' />
<Button label='Button' size='sm' />
<Button label='Button' size='md' />
<Button label='Button' size='lg' />
<Button label='Button' size='xl' />`}
          </StoryCode>
          <div className='flex flex-wrap items-end gap-4'>
            <Button label='XS Button' size='xs' />
            <Button label='SM Button' size='sm' />
            <Button label='MD Button' size='md' />
            <Button label='LG Button' size='lg' />
            <Button label='XL Button' size='xl' />
          </div>
        </section>

        {/* States Section */}
        <section>
          <StorySubTitle>States</StorySubTitle>
          <p className='mb-6 text-14 text-gray-11'>
            Visual feedback for user interaction and processing states.
          </p>
          <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <p className='mb-3 text-13 font-medium'>Loading State</p>
              <StoryCode>{"<Button label='Button' loading />"}</StoryCode>
              <Button label='Loading...' loading />
            </div>
            <div>
              <p className='mb-3 text-13 font-medium'>Disabled State</p>
              <StoryCode>{"<Button label='Button' disabled />"}</StoryCode>
              <Button label='Disabled' disabled />
            </div>
          </div>
        </section>

        {/* Icons Section */}
        <section>
          <StorySubTitle>With Icons</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Icons can be added to the start or end of the button label using
            Iconify names.
          </p>
          <StoryCode>
            {`<Button icon='lucide:plus' label='Add Item' />
<Button label='Next' suffixIcon='lucide:arrow-right' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4'>
            <Button icon='lucide:plus' label='Prefix Icon' />
            <Button label='Suffix Icon' suffixIcon='lucide:arrow-right' />
            <Button color='green' icon='lucide:download' label='Download' />
          </div>
        </section>
      </div>
    </div>
  )
}
