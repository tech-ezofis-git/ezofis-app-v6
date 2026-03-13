import { RouterProvider } from '@tanstack/react-router'
import { PostHogPageView } from '../../components/PostHogPageView'
import { router } from './router'

export default function TanstackRouterProvider() {
  return (
    <>
      <PostHogPageView />
      <RouterProvider router={router} />
    </>
  )
}
