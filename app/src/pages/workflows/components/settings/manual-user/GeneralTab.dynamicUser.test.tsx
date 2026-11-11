// @vitest-environment jsdom
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { MantineProvider } from '@mantine/core'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import GeneralTab from './GeneralTab'

const contactEmail = { id: 'f-email', name: 'Contact Email' }
const notes = { id: 'f-notes', name: 'Notes' }

const renderTab = (
  nodeData: Record<string, unknown>,
  noEmailOptionFieldIds: string[] = [],
) =>
  render(
    <I18nProvider i18n={i18n}>
      <MantineProvider>
        <GeneralTab
          actorNodeOptions={[]}
          emailFieldOptions={[contactEmail]}
          fieldOptions={[contactEmail, notes]}
          groupOptions={[]}
          nodeData={nodeData}
          noEmailOptionFieldIds={noEmailOptionFieldIds}
          openSections={{ assignees: true }}
          updateNodeData={vi.fn()}
          userOptions={[]}
          onToggleSection={vi.fn()}
        />
      </MantineProvider>
    </I18nProvider>,
  )

describe('GeneralTab Dynamic User', () => {
  beforeAll(() => {
    i18n.loadAndActivate({ locale: 'en', messages: {} })
    window.matchMedia ??= vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })
    window.ResizeObserver ??= class {
      disconnect() {}
      observe() {}
      unobserve() {}
    }
  })

  afterEach(cleanup)

  it('stays collapsed while the toggle is off', () => {
    renderTab({ isDynamicUserEnabled: false })

    expect(screen.getByText('Dynamic User (Form Input)')).toBeTruthy()
    expect(screen.queryByText('Select Email Field')).toBeNull()
  })

  it('shows the field picker and its help when enabled', () => {
    renderTab({ dynamicUserField: 'f-email', isDynamicUserEnabled: true })

    expect(screen.getByText('Assign User Based on Form Field')).toBeTruthy()
    expect(
      screen.getByText(
        'The request will go to the email address selected in this field.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Select Email Field')).toBeTruthy()
    expect(
      screen.getByText(
        'The selected field can contain one or more email addresses.',
      ),
    ).toBeTruthy()
    expect(screen.getAllByText('Contact Email').length).toBeGreaterThan(0)
    expect(screen.queryByText('Notes')).toBeNull()
  })

  it.each([
    [{}, 'Select a field to assign this stage.'],
    [
      { dynamicUserField: 'f-deleted' },
      'The selected field is no longer available on the form.',
    ],
    [
      { dynamicUserField: 'f-notes' },
      'The selected field type is not supported. Choose a select, choice or email field.',
    ],
  ])('explains a bad selection %#', (data, message) => {
    renderTab({ ...data, isDynamicUserEnabled: true })

    expect(screen.getByText(message)).toBeTruthy()
  })

  it('warns when a typed-in option list holds no email', () => {
    renderTab({ dynamicUserField: 'f-email', isDynamicUserEnabled: true }, [
      'f-email',
    ])

    expect(
      screen.getByText(
        'The selected field has no email addresses in its options.',
      ),
    ).toBeTruthy()
  })
})
