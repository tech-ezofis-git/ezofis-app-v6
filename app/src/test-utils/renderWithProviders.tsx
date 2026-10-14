import { addAPIProvider } from '@iconify/react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderOptions, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

// jsdom lacks a few browser APIs Mantine relies on.
const installBrowserStubs = () => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      addEventListener: () => undefined,
      addListener: () => undefined,
      dispatchEvent: () => false,
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: () => undefined,
      removeListener: () => undefined,
    })) as typeof window.matchMedia
  }
  if (!('ResizeObserver' in window)) {
    class ResizeObserverStub {
      disconnect() {}
      observe() {}
      unobserve() {}
    }
    ;(window as unknown as Record<string, unknown>).ResizeObserver =
      ResizeObserverStub
    ;(globalThis as unknown as Record<string, unknown>).ResizeObserver =
      ResizeObserverStub
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => undefined
  }
}

installBrowserStubs()
// Icons are fetched over the network in the app; in tests there is no API, so
// register an empty provider to stop Iconify scheduling loads that outlive a test.
addAPIProvider('', { resources: [] })
i18n.load('en', {})
i18n.activate('en')

/** Renders UI with the providers the app's runtime screens rely on. */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider i18n={i18n}>
      <MantineProvider>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </MantineProvider>
    </I18nProvider>
  )
  return render(ui, { wrapper: Wrapper, ...options })
}
