import { PublicClientApplication } from '@azure/msal-browser'
import '@/styles/index.css'
import '@/lib/tanstack-router/types'
import { MsalProvider } from '@azure/msal-react'
import { DirectionProvider, MantineProvider } from '@mantine/core'
// import '@/lib/react-scan/scan'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { StrictMode } from 'react'
import '@/lib/web-vitals/report'
import ReactDOM from 'react-dom/client'
import Toasts from '@/components/base/toast/Toasts'
import theme from '@/lib/mantine/theme'
import TanstackQueryProvider from '@/lib/tanstack-query/Provider.tsx'
import TanstackRouterProvider from '@/lib/tanstack-router/Provider.tsx'
import { ThemeSync } from '@/lib/theme'
import cssVariablesResolver from '@/lib/theme/cssVariablesResolver'
import ForceLtrDirection from './lib/lingui/ForceLtrDirection'
import LingUiProvider from './lib/lingui/LingUiProvider'

const googleClientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID as string
const microsoftClientId = import.meta.env?.VITE_MSAL_CLIENT_ID_DEFAULT as string

const msalInstance = new PublicClientApplication({
  auth: {
    clientId: microsoftClientId,
    redirectUri: window.location.origin,
  },
})

const rootElement = document.getElementById('app')

if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <GoogleOAuthProvider clientId={googleClientId}>
        <MsalProvider instance={msalInstance}>
          <LingUiProvider>
            <DirectionProvider detectDirection={false} initialDirection='ltr'>
              <ForceLtrDirection />
              <MantineProvider
                cssVariablesResolver={cssVariablesResolver}
                defaultColorScheme='auto'
                theme={theme}
              >
                <ThemeSync />
                <Toasts />
                <TanstackQueryProvider>
                  <TanstackRouterProvider />
                </TanstackQueryProvider>
              </MantineProvider>
            </DirectionProvider>
          </LingUiProvider>
        </MsalProvider>
      </GoogleOAuthProvider>
    </StrictMode>,
  )
}
