import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
// import TanStackQueryDevtools from '@/lib/tanstack-query/Devtools'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <Outlet />
      {/* <TanStackRouterDevtools />
      <TanStackQueryDevtools /> */}
    </>
  ),
})
