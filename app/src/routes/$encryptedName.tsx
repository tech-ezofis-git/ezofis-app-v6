import { createFileRoute } from '@tanstack/react-router'
import BrandedSignInPage from '@/pages/sign-in/BrandedSignInPage'

export const Route = createFileRoute('/$encryptedName')({
  component: RouteComponent,
})

function RouteComponent() {
  const { encryptedName } = Route.useParams()
  return <BrandedSignInPage encryptedName={encryptedName} />
}
