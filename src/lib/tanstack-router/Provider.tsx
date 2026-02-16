import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'

import { PostHogPageView } from '../../components/PostHogPageView'

export default function TanstackRouterProvider() {
  return (
    <>
      <PostHogPageView />
      <RouterProvider router={router} />
    </>
  )
}
