// @vitest-environment jsdom
//
// The SLA form's table through the real entry-form renderer: headers, saved
// rows, and the user group list reaching the Group column.
import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import { buildSlaFormPayload } from '../utils/slaForm'
import FormEntryTableField from './FormEntryTableField'

const getGroups = vi.hoisted(() =>
  vi.fn(async () => ({ data: [{ name: 'Sales Team' }], error: '' })),
)

vi.mock('@/api/v6/user', async (original) => ({
  ...(await original<object>()),
  getGroups,
  getUsers: async () => ({
    data: [{ email: 'raja@example.com', id: 'u1' }],
    error: '',
  }),
}))

afterEach(cleanup)

const field = () => buildSlaFormPayload('SLA', '').panels[0].fields[2]

describe('SLA Steps table', () => {
  it('shows the step columns and saved rows, and loads the user groups', async () => {
    const saved = JSON.stringify([
      {
        after: 1,
        escalateGroup: 'Sales Team',
        escalateTo: 'Group',
        notifyInitiator: 'Yes',
        notifyUsers: ['raja@example.com'],
        sendBy: ['Email', 'SMS'],
        unit: 'Minutes',
      },
    ])
    renderWithProviders(
      <FormEntryTableField
        field={field() as never}
        value={saved}
        onChange={() => {}}
      />,
    )

    for (const header of [
      'After',
      'Time unit',
      'Notify users',
      'Notify group',
      'Notify initiator',
      'Send by',
      'Escalate to',
      'Escalate user',
      'Escalate group',
      'Escalate stage',
    ]) {
      expect(screen.getAllByText(header).length).toBeGreaterThan(0)
    }
    await waitFor(() => expect(getGroups).toHaveBeenCalled())
    expect(screen.getAllByText('Sales Team').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Yes').length).toBeGreaterThan(0)
    // The full table renderer is slow to mount on a busy machine.
  }, 20000)

  it('does not fill in a group when only one exists', async () => {
    getGroups.mockResolvedValue({ data: [{ name: 'Only Team' }], error: '' })
    const onChange = vi.fn()
    renderWithProviders(
      <FormEntryTableField
        field={field() as never}
        value={JSON.stringify([{ after: 1, unit: 'Hours' }])}
        onChange={onChange}
      />,
    )
    await waitFor(() => expect(getGroups).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 300))
    const groupSaved = onChange.mock.calls.some(([value]) =>
      String(value).includes('Only Team'),
    )
    expect(groupSaved).toBe(false)
  }, 20000)
})
