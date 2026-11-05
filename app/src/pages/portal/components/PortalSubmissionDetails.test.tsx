// @vitest-environment jsdom
import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import PortalSubmissionDetails from './PortalSubmissionDetails'

afterEach(cleanup)

const panels = [
  {
    fields: [
      { id: 'notes', label: 'Notes', type: 'TEXT_BUILDER' },
      { id: 'plain', label: 'Remarks', type: 'LONG_TEXT' },
    ],
    id: 'p1',
    settings: { title: 'Details' },
  },
]

const renderDetails = (formModel: Record<string, unknown>) =>
  renderWithProviders(
    <PortalSubmissionDetails
      formModel={formModel}
      openIds={new Set(['form-panel-p1'])}
      panels={panels as never}
      onToggle={() => undefined}
    />,
  )

describe('PortalSubmissionDetails Text Builder', () => {
  it('shows saved HTML as formatted text, not as tags', async () => {
    const { container } = renderDetails({
      notes: '<p>Dear <strong>customer</strong></p>',
    })

    await waitFor(() => expect(screen.getByText('customer')).toBeTruthy())
    expect(container.querySelector('strong')?.textContent).toBe('customer')
    expect(container.textContent).not.toContain('<p>')
    expect(container.textContent).not.toContain('<strong>')
  })

  it('still shows plain text for other fields and an empty Text Builder', async () => {
    const { container } = renderDetails({ notes: '', plain: 'Plain remark' })

    await waitFor(() => expect(screen.getByText('Plain remark')).toBeTruthy())
    expect(screen.getByText('Not provided')).toBeTruthy()
    expect(container.querySelector('.tiptap')).toBeNull()
  })
})
