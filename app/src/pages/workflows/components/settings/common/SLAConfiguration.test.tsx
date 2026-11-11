// @vitest-environment jsdom
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
import useWorkflowStore from '../../../stores/useWorkflowStore'
import { createSlaRule } from '../../../utils/slaSettings'
import SLAConfiguration from './SLAConfiguration'

// Icons are fetched over the network in the app. In tests Iconify keeps load /
// retry timers that can fire after the jsdom environment is torn down and set
// state ("window is not defined", an unhandled error that fails CI). A plain
// <span> never loads anything; an empty API provider alone was not enough.
vi.mock('@iconify/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@iconify/react')>()),
  Icon: ({ icon }: { icon?: unknown }) => (
    <span data-icon={typeof icon === 'string' ? icon : undefined} />
  ),
}))

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
    queryFn: async () =>
      formId === '42'
        ? [
            {
              id: 'req',
              label: 'Request Type',
              settings: {
                specific: {
                  customOptions: 'Support,Other',
                  optionsType: 'CUSTOM',
                  separateOptionsUsing: 'COMMA',
                },
              },
              type: 'SINGLE_SELECT',
            },
          ]
        : [
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
      data: {
        entries: [
          {
            f1: 'Support',
            item_id: 'e1',
            t1: [
              { 'After': '1', 'Notify users': ['u1'], 'Time unit': 'Hours' },
            ],
          },
        ],
      },
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
    expect(
      await screen.findByText('Which form has your time limit rules?'),
    ).toBeTruthy()
    expect(screen.queryByText('Entry Display Field')).toBeNull()
    expect(screen.getByText('SLA Rules & Entries')).toBeTruthy()
    expect(screen.getByText('SLA Rule 1')).toBeTruthy()
    expect(
      screen.getByText('Which Time Limit Rule Do You Want to Use?'),
    ).toBeTruthy()
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
    expect(
      await screen.findByText('Which rule should every request use?'),
    ).toBeTruthy()
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

  it('explains the flow, and starts with one rule for every request', async () => {
    render(<Harness initial={advanced()} />)
    expect(await screen.findByText('How This Works')).toBeTruthy()
    expect(screen.getByText('All requests')).toBeTruthy()
    expect(
      screen.getByText('Every request uses the rule you choose.'),
    ).toBeTruthy()
  })

  it('switches to a rule per request and back, without old entries', async () => {
    render(<Harness initial={advanced()} />)
    fireEvent.click(await screen.findByText('No, It Depends on the Request'))
    expect(latest?.selection?.method).toBe('map')
    expect(latest?.masterEntries).toEqual([])
    expect(
      await screen.findByText('Which request field decides the time limit?'),
    ).toBeTruthy()

    fireEvent.click(screen.getByText('Yes, Same for Every Request'))
    expect(latest?.selection).toBeNull()
    expect(latest?.masterEntries).toHaveLength(1)
  }, 20000)

  it('shows the count, the levels and the example for the chosen field', async () => {
    useWorkflowStore.setState({ form: 42 })
    render(
      <Harness
        initial={{
          ...advanced(),
          masterEntries: [],
          selection: {
            defaultEntryId: null,
            fieldId: 'req',
            method: 'sameName',
            recordFormId: null,
            recordValueColumn: null,
            ruleColumn: null,
            valueRules: [],
          },
          slaMasterId: 'm-steps',
        }}
      />,
    )
    expect(
      await screen.findByText(
        '1 out of 2 options has a time limit rule. The remaining option will have no time limit.',
      ),
    ).toBeTruthy()
    expect(await screen.findByText('Notify Raja')).toBeTruthy()
    expect(screen.getByText('After 1 hour')).toBeTruthy()
    expect(screen.getByText('Nothing else happens')).toBeTruthy()
    expect(
      screen.getByText(
        'Support → Support rule → Notify Raja after 1 hour → Nothing else happens',
      ),
    ).toBeTruthy()
    expect(screen.getByText('This rule has the same name.')).toBeTruthy()
    useWorkflowStore.setState({ form: null })
  }, 20000)

  it('asks for a wait and a target only after choosing an action', async () => {
    render(
      <Harness
        initial={{
          ...advanced(),
          afterLastLevel: {
            groupId: null,
            type: 'group',
            userId: null,
            wait: null,
            waitUnit: 'days',
          },
          slaMasterId: 'm-steps',
        }}
      />,
    )
    expect(await screen.findByText('Which group?')).toBeTruthy()
    expect(screen.getByText('Enter how long to wait')).toBeTruthy()
    expect(screen.getByText('Select a group')).toBeTruthy()
    expect(await screen.findByText('Move to the chosen group')).toBeTruthy()
  }, 20000)

  it('says when the master form has no time field for this SLA', async () => {
    render(<Harness initial={advanced()} />)
    expect(await screen.findByText(/has no Response Type field/)).toBeTruthy()
  })
})
