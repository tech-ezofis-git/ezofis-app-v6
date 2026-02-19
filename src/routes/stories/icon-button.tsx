import { createFileRoute } from '@tanstack/react-router'
import IconButton from '@/components/base/button/IconButton'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'
import StoryCode from './-components/StoryCode'

export const Route = createFileRoute('/stories/icon-button')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>2. Icon Button</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        Icon buttons are used to trigger actions when space is limited or when an icon provides enough context. They are commonly used in toolbars, navigation bars, and as action triggers in lists.
      </p>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A standard icon button requires an icon property and uses primary styling by default.
          </p>
          <StoryCode>
            {`<IconButton icon='lucide:plus' />`}
          </StoryCode>
          <div className='flex items-center gap-4'>
            <IconButton icon='lucide:plus' />
          </div>
        </section>

        {/* Colors Section */}
        <section>
          <StorySubTitle>Colors</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Icon buttons support semantic color variants to indicate specific actions:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Primary:</strong> Default action color.</li>
            <li><strong>Secondary:</strong> Secondary actions.</li>
            <li><strong>Red:</strong> Destructive actions (e.g., delete, remove).</li>
            <li><strong>Green:</strong> Success or positive actions (e.g., save, complete).</li>
            <li><strong>Gray:</strong> Neutral or less emphasized actions.</li>
          </ul>
          <StoryCode>
            {`<IconButton icon='lucide:plus' />
<IconButton color='secondary' icon='lucide:plus' />
<IconButton color='red' icon='lucide:trash' />
<IconButton color='green' icon='lucide:check' />
<IconButton color='gray' icon='lucide:settings' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4 rounded-md p-6 bg-white dark:bg-gray-13'>
            <IconButton icon='lucide:plus' />
            <IconButton color='secondary' icon='lucide:plus' />
            <IconButton color='red' icon='lucide:trash' />
            <IconButton color='green' icon='lucide:check' />
            <IconButton color='gray' icon='lucide:settings' />
          </div>
        </section>

        {/* Variants Section */}
        <section>
          <StorySubTitle>Variants</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Visual variants to match different UI contexts:
          </p>
          <ul className='list-disc list-inside space-y-2 text-14 text-gray-11 mb-6 ml-2'>
            <li><strong>Solid:</strong> High prominence with filled background.</li>
            <li><strong>Outline:</strong> Medium prominence with border.</li>
            <li><strong>Subtle:</strong> Low prominence with soft background.</li>
            <li><strong>Ghost:</strong> Minimal prominence, no background until hover.</li>
          </ul>
          <StoryCode>
            {`<IconButton icon='lucide:plus' variant='solid' />
<IconButton icon='lucide:plus' variant='outline' />
<IconButton icon='lucide:plus' variant='subtle' />
<IconButton icon='lucide:plus' variant='ghost' />`}
          </StoryCode>
          <div className='flex flex-wrap items-center gap-4'>
            <IconButton icon='lucide:plus' variant='solid' />
            <IconButton icon='lucide:plus' variant='outline' />
            <IconButton icon='lucide:plus' variant='subtle' />
            <IconButton icon='lucide:plus' variant='ghost' />
          </div>
        </section>

        {/* Sizes Section */}
        <section>
          <StorySubTitle>Sizes</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Consistent sizing options for different layouts:
          </p>
          <StoryCode>
            {`<IconButton icon='lucide:plus' size='xs' />
<IconButton icon='lucide:plus' size='sm' />
<IconButton icon='lucide:plus' size='md' />
<IconButton icon='lucide:plus' size='lg' />
<IconButton icon='lucide:plus' size='xl' />`}
          </StoryCode>
          <div className='flex flex-wrap items-end gap-4'>
            <IconButton icon='lucide:plus' size='xs' />
            <IconButton icon='lucide:plus' size='sm' />
            <IconButton icon='lucide:plus' size='md' />
            <IconButton icon='lucide:plus' size='lg' />
            <IconButton icon='lucide:plus' size='xl' />
          </div>
        </section>

        {/* States Section */}
        <section>
          <StorySubTitle>States</StorySubTitle>
          <p className='text-14 text-gray-11 mb-6'>
            Visual indicators for interaction and processing:
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            <div>
              <p className='text-13 font-medium mb-3'>Loading State</p>
              <StoryCode>{"<IconButton icon='lucide:plus' loading />"}</StoryCode>
              <IconButton icon='lucide:plus' loading />
            </div>
            <div>
              <p className='text-13 font-medium mb-3'>Disabled State</p>
              <StoryCode>{"<IconButton icon='lucide:plus' disabled />"}</StoryCode>
              <IconButton icon='lucide:plus' disabled />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
