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

// import '@/lib/react-scan/scan'

const rootElement = document.getElementById('app')

if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
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
    </StrictMode>,
  )
}
