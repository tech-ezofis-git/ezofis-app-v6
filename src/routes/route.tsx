import { createFileRoute } from '@tanstack/react-router'
import { Logo } from '@/components/common'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='p-6'>
      <Logo />
    </div>
  )
}
