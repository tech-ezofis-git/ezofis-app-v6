// @vitest-environment jsdom
import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import RichTextView, { looksLikeHtml } from './RichTextView'

afterEach(cleanup)

describe('looksLikeHtml', () => {
  it('detects HTML and ignores plain text', () => {
    expect(looksLikeHtml('<p>Hello</p>')).toBe(true)
    expect(looksLikeHtml('plain text')).toBe(false)
    expect(looksLikeHtml('5 < 6 and 7 > 3')).toBe(false)
    expect(looksLikeHtml(undefined)).toBe(false)
  })
})

describe('RichTextView', () => {
  it('shows formatting and drops script tags and event handlers', async () => {
    const { container } = renderWithProviders(
      <RichTextView
        html={
          '<p>Hi <strong>there</strong></p><script>window.__pwned = 1</script>' +
          '<img src="x" onerror="window.__pwned = 1">'
        }
      />,
    )

    await waitFor(() => expect(screen.getByText('there')).toBeTruthy())
    expect(container.querySelector('strong')?.textContent).toBe('there')
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('[onerror]')).toBeNull()
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined()
  })
})
