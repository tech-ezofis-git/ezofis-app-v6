import { createRouter } from '@tanstack/react-router'
import { routeTree } from '../../routeTree.gen'
import { queryClient } from '../tanstack-query/queryClient'

export const router = createRouter({
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  defaultStructuralSharing: true,
  routeTree,
  scrollRestoration: true,
})
