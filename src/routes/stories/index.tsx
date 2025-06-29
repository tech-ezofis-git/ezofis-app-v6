import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/stories/')({
  component: RouteComponent,
})

const routes = [
  { name: 'Button', path: '/stories/button' },
  { name: 'IconButton', path: '/stories/icon-button' },
  { name: 'Tooltip', path: '/stories/tooltip' },
  { name: 'ScrollArea', path: '/stories/scroll-area' },
  { name: 'Drawer', path: '/stories/drawer' },
  { name: 'Modal', path: '/stories/modal' },
]

function RouteComponent() {
  return (
    <ul className='space-y-2'>
      {routes.map((route, index) => (
        <li key={route.name}>
          <Link
            className='text-base font-medium transition-colors hover:text-primary hover:underline'
            to={route.path}
          >
            {index + 1}. {route.name}
          </Link>
        </li>
      ))}
    </ul>
  )
}
