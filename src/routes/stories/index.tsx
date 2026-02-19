import { createFileRoute, Link } from '@tanstack/react-router'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/')({
  component: RouteComponent,
})

const groups = [
  {
    title: 'Foundations',
    routes: [
      { name: 'Typography', path: '/stories/typography' },
      { name: 'Color Palette', path: '/stories/colors' },
    ]
  },
  {
    title: 'Form & Selection',
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
    ]
  },
  {
    title: 'Feedback & Display',
    routes: [
      { name: 'Alert', path: '/stories/alert' },
      { name: 'Badge', path: '/stories/badge' },
      { name: 'Avatar', path: '/stories/avatar' },
      { name: 'Indicator', path: '/stories/indicator' },
      { name: 'Highlight', path: '/stories/highlight' },
      { name: 'Empty State', path: '/stories/empty-state' },
      { name: 'AI Icon', path: '/stories/ai-icon' },
    ]
  },
  {
    title: 'Overlays & Navigation',
    routes: [
      { name: 'Modal', path: '/stories/modal' },
      { name: 'Drawer', path: '/stories/drawer' },
      { name: 'Popover', path: '/stories/popover' },
      { name: 'Menu', path: '/stories/menu' },
      { name: 'Tooltip', path: '/stories/tooltip' },
      { name: 'Pagination', path: '/stories/pagination' },
      { name: 'Stepper', path: '/stories/stepper' },
      { name: 'Tabs', path: '/stories/tabs' },
    ]
  },
  {
    title: 'Structural & Core',
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
    ]
  }
]

function RouteComponent() {
  return (
    <div className='p-8 max-w-7xl mx-auto'>
      <header className='mb-12 border-b border-gray-3 pb-8'>
        <StoryTitle>Component Documentation</StoryTitle>
        <p className='text-16 text-gray-11 mt-4 max-w-2xl'>
          A comprehensive collection of reusable UI components built for the V6 platform.
          Each component is documented with usage examples, implementation details, and live demonstrations.
        </p>
      </header>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-16'>
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className='text-14 font-semibold text-gray-9 uppercase tracking-wider mb-6'>
              {group.title}
            </h2>
            <ul className='space-y-3'>
              {group.routes.map((route) => (
                <li key={route.path}>
                  <Link
                    to={route.path}
                    className='text-15 text-gray-12 hover:text-primary-11 transition-colors flex items-center gap-2 group'
                  >
                    <span className='w-1 h-1 bg-gray-4 rounded-full group-hover:bg-primary-9 transition-colors' />
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
