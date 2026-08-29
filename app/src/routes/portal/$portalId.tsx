import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/portal/$portalId')({
  beforeLoad: ({ location, params }) => {
    throw redirect({
      href: `/portals/${encodeURIComponent(params.portalId)}${location.searchStr}`,
      replace: true,
    })
  },
})
