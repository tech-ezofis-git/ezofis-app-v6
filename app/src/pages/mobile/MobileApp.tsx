import { useState } from 'react'
import requestStore from '@/pages/requests/stores/useRequestStore'
import { LoginScreen } from './features/auth/LoginScreen'
import { MobileSignUpFlow } from './features/auth/MobileSignUpFlow'
import { FoldersScreen } from './features/folders/FoldersScreen'
import { InvoiceDetailScreen } from './features/invoice-detail/InvoiceDetailScreen'
import { RequestsInboxScreen } from './features/requests/RequestsInboxScreen'

type MobileRoute = 'login' | 'signup' | 'inbox' | 'folders'

/** Lightweight in-module navigator for previewing mobile screens. */
export function MobileApp({
  initialRoute = 'login',
}: {
  initialRoute?: MobileRoute
}) {
  const [route, setRoute] = useState<MobileRoute>(initialRoute)
  const { closeRequest, isRequestOpen } = requestStore()

  if (route === 'login') {
    return <LoginScreen onSignIn={() => setRoute('inbox')} />
  }

  if (route === 'signup') {
    return <MobileSignUpFlow />
  }

  if (route === 'folders') {
    return (
      <FoldersScreen
        onTabBarChange={(id) => {
          if (id === 'inbox' || id === 'home') setRoute('inbox')
        }}
      />
    )
  }

  if (isRequestOpen) {
    return <InvoiceDetailScreen onBack={() => closeRequest()} />
  }

  return (
    <RequestsInboxScreen
      onTabBarChange={(id) => {
        if (id === 'home') setRoute('login')
        if (id === 'folder') setRoute('folders')
      }}
    />
  )
}
