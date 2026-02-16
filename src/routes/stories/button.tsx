import { createFileRoute } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'
import StoryCode from './-components/StoryCode'

export const Route = createFileRoute('/stories/button')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>1. Button</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        Buttons are used to trigger actions, such as submitting a form, opening a dialog, or performing an operation. They provide a clear call to action (CTA) for users.
      </p>
      <p className='text-14 text-gray-11 mb-4'>before using button import it from '@/components/base/button/Button'</p>
      <StoryCode>
        {`import Button from '@/components/base/button/Button'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A standard button with default primary styling and medium size.
          </p>
          <StoryCode>
            {`<Button label='Button' />`}
          </StoryCode>
          <div className='flex items-center gap-4'>
            <Button label='Button' />
          </div>
        </section>

        {/* Colors Section */}
        <section>
          <StorySubTitle>Colors</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Buttons support multiple semantic color variants to convey meaning or hierarchy:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Primary:</strong> Default brand color.</li>
            <li><strong>Secondary:</strong> Used for less prominent actions.</li>
            <li><strong>Red:</strong> Indicates destructive or dangerous actions.</li>
            <li><strong>Green:</strong> Indicates success or positive actions.</li>
            <li><strong>Gray:</strong> Neutral styling for tertiary actions.</li>
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
          <p className='text-14 text-gray-11 mb-4'>
            Different visual styles can be applied to buttons to differentiate their importance:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Solid:</strong> Filled background (default).</li>
            <li><strong>Outline:</strong> Bordered with transparent background.</li>
            <li><strong>Subtle:</strong> Light background with primary color text.</li>
            <li><strong>Ghost:</strong> Transparent background, only visible on hover.</li>
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
            <Button label='Solid' color="secondary" variant='solid' />
            <Button label='Outline' color="secondary" variant='outline' />
            <Button label='Subtle' color="secondary" variant='subtle' />
            <Button label='Ghost' color="secondary" variant='ghost' />
          </div>

          <StoryCode>
            {`<Button label='Button' color="red" variant='solid' />
<Button label='Button' color="red" variant='outline' />
<Button label='Button' color="red" variant='subtle' />
<Button label='Button' color="red" variant='ghost' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4 pb-4'>
            <Button label='Solid' color="red" variant='solid' />
            <Button label='Outline' color="red" variant='outline' />
            <Button label='Subtle' color="red" variant='subtle' />
            <Button label='Ghost' color="red" variant='ghost' />
          </div>

          <StoryCode>
            {`<Button label='Button' color="green" variant='solid' />
<Button label='Button' color="green" variant='outline' />
<Button label='Button' color="green" variant='subtle' />
<Button label='Button' color="green" variant='ghost' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4 pb-4'>
            <Button label='Solid' color="green" variant='solid' />
            <Button label='Outline' color="green" variant='outline' />
            <Button label='Subtle' color="green" variant='subtle' />
            <Button label='Ghost' color="green" variant='ghost' />
          </div>

          <StoryCode>
            {`<Button label='Button' color="gray" variant='solid' />
<Button label='Button' color="gray" variant='outline' />
<Button label='Button' color="gray" variant='subtle' />
<Button label='Button' color="gray" variant='ghost' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4 pb-4'>
            <Button label='Solid' color="gray" variant='solid' />
            <Button label='Outline' color="gray" variant='outline' />
            <Button label='Subtle' color="gray" variant='subtle' />
            <Button label='Ghost' color="gray" variant='ghost' />
          </div>
        </section>

        {/* Sizes Section */}
        <section>
          <StorySubTitle>Sizes</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Buttons are available in five standardized sizes:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Extra Small (xs):</strong> For tight spaces.</li>
            <li><strong>Small (sm):</strong> Compact layouts.</li>
            <li><strong>Medium (md):</strong> Default size.</li>
            <li><strong>Large (lg):</strong> Prominent actions.</li>
            <li><strong>Extra Large (xl):</strong> High-impact CTAs.</li>
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
          <p className='text-14 text-gray-11 mb-6'>
            Visual feedback for user interaction and processing states.
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            <div>
              <p className='text-13 font-medium mb-3'>Loading State</p>
              <StoryCode>{"<Button label='Button' loading />"}</StoryCode>
              <Button label='Loading...' loading />
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Disabled State</p>
              <StoryCode>{"<Button label='Button' disabled />"}</StoryCode>
              <Button label='Disabled' disabled />
            </div>
          </div>
        </section>

        {/* Icons Section */}
        <section>
          <StorySubTitle>With Icons</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Icons can be added to the start or end of the button label using Iconify names.
          </p>
          <StoryCode>
            {`<Button icon='lucide:plus' label='Add Item' />
<Button label='Next' suffixIcon='lucide:arrow-right' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4'>
            <Button icon='lucide:plus' label='Prefix Icon' />
            <Button label='Suffix Icon' suffixIcon='lucide:arrow-right' />
            <Button icon='lucide:download' label='Download' color='green' />
          </div>
        </section>
      </div>
    </div>
  )
}
