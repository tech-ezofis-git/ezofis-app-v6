import { createFileRoute } from '@tanstack/react-router'
import V5AppShell from '@/pages/v5-app/V5AppShell'

export const Route = createFileRoute('/v5-app')({
  component: V5AppShell,
})
