import { MantineProvider } from '@mantine/core'
import '@/styles/index.css'
import '@/lib/tanstack-router/types'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import Toasts from '@/components/base/toast/Toasts'
import cssVariablesResolver from '@/lib/mantine/cssVariablesResolver'
import '@/lib/web-vitals/report'
import theme from '@/lib/mantine/theme'
import TanstackQueryProvider from '@/lib/tanstack-query/Provider.tsx'
import TanstackRouterProvider from '@/lib/tanstack-router/Provider.tsx'
import LingUiProvider from './lib/lingui/LingUiProvider'
// import '@/lib/react-scan/scan'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication } from '@azure/msal-browser'

const googleClientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID as string;
const microsoftClientId = import.meta.env?.VITE_MSAL_CLIENT_ID_DEFAULT as string;


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
        <MsalProvider instance={msalInstance}>      <LingUiProvider>
          <MantineProvider
            cssVariablesResolver={cssVariablesResolver}
            defaultColorScheme='auto'
            theme={theme}
          >
            <Toasts />
            <TanstackQueryProvider>
              <TanstackRouterProvider />
            </TanstackQueryProvider>
          </MantineProvider>
        </LingUiProvider>
        </MsalProvider>
      </GoogleOAuthProvider>
    </StrictMode>,
  )
}