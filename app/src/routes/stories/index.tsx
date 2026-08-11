import { createFileRoute, Link } from '@tanstack/react-router'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/')({
  component: RouteComponent,
})

const groups = [
  {
    routes: [
      { name: 'Typography', path: '/stories/typography' },
      { name: 'Color Palette', path: '/stories/colors' },
    ],
    title: 'Foundations',
  },
  {
    routes: [
      { name: 'Input Text', path: '/stories/input-text' },
      { name: 'Input Number', path: '/stories/input-number' },
      { name: 'Input Password', path: '/stories/input-password' },
      { name: 'Input Textarea', path: '/stories/input-textarea' },
      { name: 'Input Pin', path: '/stories/input-pin' },
      { name: 'Input Date', path: '/stories/input-date' },
      { name: 'Input Time', path: '/stories/input-time' },
      { name: 'Input Select', path: '/stories/input-select' },
      { name: 'Input Select Multiple', path: '/stories/input-select-multiple' },
      { name: 'Input Checkbox', path: '/stories/input-checkbox' },
      { name: 'Input Checkbox Group', path: '/stories/input-checkbox-group' },
      { name: 'Input Checkbox Card', path: '/stories/input-checkbox-card' },
      { name: 'Input Radio', path: '/stories/input-radio' },
      { name: 'Input Radio Group', path: '/stories/input-radio-group' },
      { name: 'Input Radio Card', path: '/stories/input-radio-card' },
      { name: 'Input Switch', path: '/stories/input-switch' },
      { name: 'Input Switch Group', path: '/stories/input-switch-group' },
      { name: 'Form Integration', path: '/stories/form' },
    ],
    title: 'Form & Selection',
  },
  {
    routes: [
      { name: 'Alert', path: '/stories/alert' },
      { name: 'Badge', path: '/stories/badge' },
      { name: 'Avatar', path: '/stories/avatar' },
      { name: 'Indicator', path: '/stories/indicator' },
      { name: 'Highlight', path: '/stories/highlight' },
      { name: 'Empty State', path: '/stories/empty-state' },
      { name: 'AI Icon', path: '/stories/ai-icon' },
    ],
    title: 'Feedback & Display',
  },
  {
    routes: [
      { name: 'Modal', path: '/stories/modal' },
      { name: 'Drawer', path: '/stories/drawer' },
      { name: 'Popover', path: '/stories/popover' },
      { name: 'Menu', path: '/stories/menu' },
      { name: 'Tooltip', path: '/stories/tooltip' },
      { name: 'Pagination', path: '/stories/pagination' },
      { name: 'Stepper', path: '/stories/stepper' },
      { name: 'Tabs', path: '/stories/tabs' },
    ],
    title: 'Overlays & Navigation',
  },
  {
    routes: [
      { name: 'Button', path: '/stories/button' },
      { name: 'IconButton', path: '/stories/icon-button' },
      // { name: 'Card', path: '/stories/card' },
      { name: 'Accordion', path: '/stories/accordion' },
      // { name: 'Skeleton', path: '/stories/skeleton' },
      { name: 'Table', path: '/stories/table' },
      { name: 'Data Table', path: '/stories/data-table' },
      { name: 'ScrollArea', path: '/stories/scroll-area' },
      { name: 'Divider', path: '/stories/divider' },
      { name: 'Toast', path: '/stories/toast' },
      { name: 'BarLoader', path: '/stories/bar-loader' },
    ],
    title: 'Structural & Core',
  },
]

function RouteComponent() {
  return (
    <div className='mx-auto max-w-7xl p-8'>
      <header className='mb-12 border-b border-gray-3 pb-8'>
        <StoryTitle>Component Documentation</StoryTitle>
        <p className='mt-4 max-w-2xl text-16 text-gray-11'>
          A comprehensive collection of reusable UI components built for the V6
          platform. Each component is documented with usage examples,
          implementation details, and live demonstrations.
        </p>
      </header>

      <div className='grid grid-cols-1 gap-x-12 gap-y-16 md:grid-cols-2 lg:grid-cols-4'>
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className='mb-6 text-14 font-semibold tracking-wider text-gray-9 uppercase'>
              {group.title}
            </h2>
            <ul className='space-y-3'>
              {group.routes.map((route) => (
                <li key={route.path}>
                  <Link
                    className='group flex items-center gap-2 text-15 text-gray-12 transition-colors hover:text-primary-11'
                    to={route.path}
                  >
                    <span className='h-1 w-1 rounded-full bg-gray-4 transition-colors group-hover:bg-primary-9' />
                    {route.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
