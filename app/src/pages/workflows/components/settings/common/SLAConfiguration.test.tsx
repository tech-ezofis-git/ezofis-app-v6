// @vitest-environment jsdom
import { addAPIProvider } from '@iconify/react'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { SlaSettings } from '../../../utils/slaSettings'
import { createSlaRule } from '../../../utils/slaSettings'
import SLAConfiguration from './SLAConfiguration'

// Icons are fetched over the network in the app. With no API in tests, Iconify
// keeps retry timers that fire after the jsdom environment is torn down
// ("window is not defined"). An empty provider stops it scheduling loads, as
// test-utils/renderWithProviders does.
addAPIProvider('', { resources: [] })

vi.mock('@/api/v6/user', () => ({
  getGroups: async () => ({
    data: [{ groupId: 'g1', name: 'Sales Team' }],
    error: '',
  }),
  getUsers: async () => ({ data: [{ id: 'u1', value: 'Raja' }], error: '' }),
}))
vi.mock('@/api/form/queries', () => ({
  getFormFieldsQueryOptions: (formId: string) => ({
    queryKey: ['fields', formId],
    queryFn: async () => [
      { id: 'f1', label: 'Name', type: 'SHORT_TEXT' },
      formId === 'm-steps'
        ? { id: 't1', label: 'SLA Steps', type: 'TABLE' }
        : { id: 'f3', label: 'Response Time', type: 'NUMBER' },
    ],
  }),
  getSlaFormsQueryOptions: () => ({
    queryKey: ['sla-forms'],
    queryFn: async () => [{ id: 'm1', name: 'SLA Master' }],
  }),
}))
vi.mock('@/api/form/form', () => ({
  default: {
    getFormEntries: async () => ({
      data: { entries: [{ f1: 'Support', item_id: 'e1' }] },
    }),
  },
}))

let latest: null | SlaSettings = null

function Harness({ initial }: { initial: SlaSettings }) {
  const [value, setValue] = useState<null | SlaSettings>(initial)
  latest = value
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <SLAConfiguration
          scope='block'
          value={value}
          showErrors
          onChange={setValue}
        />
      </MantineProvider>
    </QueryClientProvider>
  )
}

const standard = (patch = {}): SlaSettings => ({
  mode: 'standard',
  notifications: { email: true, sms: false },
  rules: [{ ...createSlaRule('block'), id: 'r1', name: '', ...patch }],
  slaMasterId: null,
})

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    addListener: () => {},
    removeEventListener: () => {},
    removeListener: () => {},
  })) as unknown as typeof window.matchMedia
  window.ResizeObserver ??= class {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
})

afterEach(cleanup)

describe('SLA rule form', () => {
  it('shows each control only when its checkbox is ticked', async () => {
    render(<Harness initial={standard()} />)
    expect(screen.queryByText('Notification Recipients')).toBeNull()
    expect(screen.queryByText('Escalation Target')).toBeNull()

    fireEvent.click(screen.getByLabelText('Send Notification'))
    expect(await screen.findByText('Notification Recipients')).toBeTruthy()
    expect(screen.getByLabelText('Notify Request Initiator')).toBeTruthy()
    expect(screen.getByText('Notification Channels')).toBeTruthy()
    expect(screen.getByLabelText('Email')).toBeTruthy()
    expect(screen.getByLabelText('SMS')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Send Notification'))
    expect(screen.queryByText('Notification Recipients')).toBeNull()
  })

  it('escalates to User by default, with no None option, and offers Group', async () => {
    render(<Harness initial={standard()} />)
    fireEvent.click(screen.getByLabelText('Enable Escalation'))

    expect(await screen.findByText('Escalation Target')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'None' })).toBeNull()
    expect(latest?.rules[0].escalateTo?.type).toBe('user')

    fireEvent.click(screen.getByRole('button', { name: 'Group' }))
    expect(latest?.rules[0].escalateTo?.type).toBe('group')
    expect(
      // Validation is on here, so the error shows in place of the description.
      await screen.findByText('Select a group to escalate to'),
    ).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Enable Escalation'))
    expect(latest?.rules[0].escalateTo?.type).toBeNull()
    expect(screen.queryByText('Escalation Target')).toBeNull()
  })

  it('loads a rule with no escalation as unticked', () => {
    render(<Harness initial={standard({ notifyUserIds: ['u1'] })} />)
    expect(
      (screen.getByLabelText('Enable Escalation') as HTMLInputElement).checked,
    ).toBe(false)
    expect(
      (screen.getByLabelText('Send Notification') as HTMLInputElement).checked,
    ).toBe(true)
  })
})

describe('Advanced SLA entries', () => {
  const advanced = (): SlaSettings => ({
    masterEntries: [
      { entryId: 'e1', escalate: false, id: 'row-1', notify: true },
    ],
    masterFieldId: 'f1',
    mode: 'advanced',
    notifications: { email: true, sms: false },
    rules: [],
    slaMasterId: 'm1',
  })

  it('adds and removes entries, each with its own Notify and Escalate', async () => {
    render(<Harness initial={advanced()} />)
    expect(await screen.findByText('SLA Configuration Form')).toBeTruthy()
    expect(screen.queryByText('Entry Display Field')).toBeNull()
    expect(screen.getByText('SLA Rules & Entries')).toBeTruthy()
    expect(screen.getByText('SLA Rule 1')).toBeTruthy()
    expect(screen.getByText('Select Master Form Entry')).toBeTruthy()
    expect(screen.queryByText('Value')).toBeNull()
    expect(screen.queryByText('When the SLA is crossed')).toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: 'Add another SLA rule' }),
    )
    expect(latest?.masterEntries).toHaveLength(2)
    expect(screen.getAllByLabelText('Notify')).toHaveLength(2)

    fireEvent.click(screen.getAllByLabelText('Escalate')[1])
    expect(latest?.masterEntries?.[1].escalate).toBe(true)
    expect(latest?.masterEntries?.[0].escalate).toBe(false)

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Remove SLA rule' })[0],
    )
    expect(latest?.masterEntries).toHaveLength(1)
  })

  it('asks how to send messages only for forms without an SLA Steps table', async () => {
    const { unmount } = render(<Harness initial={advanced()} />)
    expect(await screen.findByText('How to send messages')).toBeTruthy()
    unmount()

    render(<Harness initial={{ ...advanced(), slaMasterId: 'm-steps' }} />)
    // With a steps table the rule area is just the entry dropdown.
    expect(await screen.findByText('Select Master Form Entry')).toBeTruthy()
    await waitFor(() => expect(screen.queryByLabelText('Notify')).toBeNull())
    expect(screen.queryByText('SLA Rule 1')).toBeNull()
    expect(screen.queryByText('SLA Rules & Entries')).toBeNull()
    expect(screen.queryByText('How to send messages')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remove SLA rule' })).toBeNull()
  }, 20000)

  it('names the entries from Policy Name without asking', async () => {
    render(<Harness initial={{ ...advanced(), masterFieldId: null }} />)
    expect((await screen.findAllByText('Support')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Entry Display Field')).toBeNull()
  }, 20000)

  it('says when the master form has no time field for this SLA', async () => {
    render(<Harness initial={advanced()} />)
    expect(await screen.findByText(/has no Response Type field/)).toBeTruthy()
  })
})
