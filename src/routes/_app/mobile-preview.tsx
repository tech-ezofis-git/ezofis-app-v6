import { createFileRoute } from '@tanstack/react-router'
import { MobileApp } from '@/pages/mobile'

export const Route = createFileRoute('/_app/mobile-preview')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Mobile Preview',
  },
})

function RouteComponent() {
  return (
    <div className='flex min-h-full justify-center bg-surface-muted p-4'>
      <div className='w-full max-w-md overflow-hidden rounded-3xl border border-border-default shadow-lg'>
        <MobileApp />
      </div>
    </div>
  )
}
