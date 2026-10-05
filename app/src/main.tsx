import { PublicClientApplication } from '@azure/msal-browser'
import '@/styles/index.css'
import '@/lib/tanstack-router/types'
import { MsalProvider } from '@azure/msal-react'
import { DirectionProvider, MantineProvider } from '@mantine/core'
// import '@/lib/react-scan/scan'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react'
import posthog from 'posthog-js'
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

const posthogProjectToken =
  (import.meta.env?.VITE_POSTHOG_PROJECT_TOKEN as string) ||
  (import.meta.env?.VITE_POSTHOG_KEY as string) ||
  'phc_vpdrDKNugLVVgvtVLV5QSFCq8B5WvMqq5JbSqQu3uxdi'
const posthogHost =
  (import.meta.env?.VITE_POSTHOG_HOST as string) || 'https://us.i.posthog.com'

if (posthogProjectToken) {
  posthog.init(posthogProjectToken, {
    api_host: posthogHost,
    defaults: '2026-05-30',
    enable_heatmaps: true,
  })
}

function PostHogErrorFallback({ error }: { error?: any }) {
  return (
    <div className='p-6 text-center text-error-main' role='alert'>
      <h2 className='text-lg font-bold'>An unhandled application error occurred.</h2>
      <pre className='mt-2 overflow-auto rounded bg-surface-secondary p-4 text-left text-xs'>
        {error instanceof Error ? error.message : String(error ?? 'Unknown error')}
      </pre>
    </div>
  )
}

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
      <PostHogProvider client={posthog}>
        <PostHogErrorBoundary fallback={PostHogErrorFallback}>
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
        </PostHogErrorBoundary>
      </PostHogProvider>
    </StrictMode>,
  )
}
