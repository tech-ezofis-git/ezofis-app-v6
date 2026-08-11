import { createFileRoute } from '@tanstack/react-router'
import Badge from '@/components/base/Badge'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/badge')({
  component: RouteComponent,
})

function RouteComponent() {
  const colors = [
    'blue',
    'bronze',
    'cyan',
    'gold',
    'green',
    'indigo',
    'orange',
    'pink',
    'purple',
    'red',
    'teal',
    'violet',
    'yellow',
  ]

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Badge</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        Badges are small status indicators used to highlight items, display
        counts, or categorize content. They are highly versatile and come in a
        wide range of semantic and decorative colors.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Before using Badge, import it from its location:
      </p>
      <StoryCode>{`import Badge from '@/components/base/Badge'`}</StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            A standard badge with the default gray color.
          </p>
          <StoryCode>{`<Badge label='New' />`}</StoryCode>
          <div className='ml-1'>
            <Badge label='New' />
          </div>
        </section>

        {/* Colors Section */}
        <section>
          <StorySubTitle>Color Palette</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Choose from a variety of built-in colors to denote different states
            or categories:
          </p>
          <StoryCode>{`<Badge color='blue' label='Active' />`}</StoryCode>
          <div className='mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-gray-3 p-4'>
            <Badge label='Default' />
            {colors.map((color) => (
              <Badge
                color={color as any}
                key={color}
                label={color.charAt(0).toUpperCase() + color.slice(1)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
