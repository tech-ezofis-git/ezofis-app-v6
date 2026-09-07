import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import SettingsPage from '@/pages/settings/SettingsPage'

const settingsSearchSchema = z.object({
  step: z.string().optional(),
})

export const Route = createFileRoute('/_app/settings')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Settings',
  },
  validateSearch: settingsSearchSchema,
})

function RouteComponent() {
  return <SettingsPage />
}
