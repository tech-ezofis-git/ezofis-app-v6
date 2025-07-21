import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/stories/')({
  component: RouteComponent,
})

const routes1 = [
  { name: 'Button', path: '/stories/button' },
  { name: 'IconButton', path: '/stories/icon-button' },
  { name: 'Tooltip', path: '/stories/tooltip' },
  { name: 'ScrollArea', path: '/stories/scroll-area' },
  { name: 'Drawer', path: '/stories/drawer' },
  { name: 'Modal', path: '/stories/modal' },
  { name: 'Menu', path: '/stories/menu' },
  { name: 'Avatar', path: '/stories/avatar' },
  { name: 'Indicator', path: '/stories/indicator' },
  { name: 'Divider', path: '/stories/divider' },
  { name: 'Badge', path: '/stories/badge' },
  { name: 'Tabs', path: '/stories/tabs' },
  { name: 'Pagination', path: '/stories/pagination' },
  { name: 'Popover', path: '/stories/popover' },
  { name: 'Toast', path: '/stories/toast' },
]
const routes2 = [
  { name: 'Highlight', path: '/stories/highlight' },
  { name: 'AI Icon', path: '/stories/ai-icon' },
  { name: 'Input Text', path: '/stories/input-text' },
  { name: 'Input Number', path: '/stories/input-number' },
  { name: 'Input Password', path: '/stories/input-password' },
  { name: 'Input Textarea', path: '/stories/input-textarea' },
  { name: 'Input Pin', path: '/stories/input-pin' },
  { name: 'Input Radio', path: '/stories/input-radio' },
  { name: 'Input Radio Group', path: '/stories/input-radio-group' },
  { name: 'Input Checkbox', path: '/stories/input-checkbox' },
  { name: 'Input Checkbox Group', path: '/stories/input-checkbox-group' },
  { name: 'Input Switch', path: '/stories/input-switch' },
  { name: 'Input Switch Group', path: '/stories/input-switch-group' },
  { name: 'Input Date', path: '/stories/input-date' },
  { name: 'Input Time', path: '/stories/input-time' },
]

function List({
  routes,
  start,
}: {
  routes: { name: string; path: string }[]
  start: number
}) {
  return (
    <ul className='space-y-3'>
      {routes.map((route, index) => (
        <li key={route.name}>
          <Link
            className='text-base font-medium transition-colors hover:text-gray-950 hover:underline'
            to={route.path}
          >
            {start + index + 1}. {route.name}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function RouteComponent() {
  return (
    <div className='grid max-h-160 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
      {<List routes={routes1} start={0} />}
      {<List routes={routes2} start={routes1.length} />}
    </div>
  )
}
