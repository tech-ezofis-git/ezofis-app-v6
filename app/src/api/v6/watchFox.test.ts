import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axiosV6 } from '../axios'
import {
  connectWatchFoxMailbox,
  createWorkflowEmailWebhookKey,
  deleteWatch,
  disableWorkflowEmailWebhookKey,
  getWorkflowEmailSettings,
  getWorkflowEmailWebhook,
  getWorkflowWatches,
  isWatchFoxOutlook,
  resumeWatch,
  saveWorkflowEmailSettings,
  updateWatchTypes,
} from './watchFox'

vi.mock('../axios', () => ({
  axiosV6: vi.fn(),
}))

vi.mock('@/stores/authUserStore', () => ({
  default: {
    getState: () => ({ identity: null, session: { tenantId: 't-1' } }),
  },
}))

const axiosMock = vi.mocked(axiosV6) as unknown as ReturnType<typeof vi.fn>
const WF_ID = '1325cf43-3902-426d-800f-ffde5bbfe0da'

const lastCall = () =>
  axiosMock.mock.calls[axiosMock.mock.calls.length - 1][0] as Record<
    string,
    unknown
  >

beforeEach(() => {
  axiosMock.mockReset()
  axiosMock.mockResolvedValue({ data: {} })
})

describe('watchFox api', () => {
  it('sends provider, types, workflow and the session tenant on connect', async () => {
    axiosMock.mockResolvedValue({
      data: { url: 'https://watchfox.run/connect?t=x' },
    })

    const link = await connectWatchFoxMailbox({
      provider: 'gmail',
      types: ['enquiry', 'invoice'],
      workflowId: WF_ID,
    })

    expect(link.url).toBe('https://watchfox.run/connect?t=x')
    const call = lastCall()
    expect(call.method).toBe('POST')
    expect(call.url).toBe('/email-ingest/watchfox/connect')
    expect(call.headers).toEqual({ 'X-Tenant-Id': 't-1' })
    expect(call.data).toMatchObject({
      provider: 'gmail',
      tenantId: 't-1',
      types: ['enquiry', 'invoice'],
      workflowId: WF_ID,
    })
    expect(String((call.data as { redirectUrl: string }).redirectUrl)).toMatch(
      /^https:\/\//,
    )
  })

  it('lists the watches of one workflow', async () => {
    await getWorkflowWatches(WF_ID)
    expect(lastCall()).toMatchObject({
      method: 'GET',
      url: `/email-ingest/watchfox/workflows/${WF_ID}/watches`,
    })
  })

  it('patches types, resumes with catch-up and deletes by saved id', async () => {
    await updateWatchTypes('w-1', ['support'])
    expect(lastCall()).toMatchObject({
      data: { types: ['support'] },
      method: 'PATCH',
      url: '/email-ingest/watchfox/watches/w-1',
    })

    await resumeWatch('w-1')
    expect(lastCall()).toMatchObject({
      data: { catchUp: true },
      method: 'POST',
      url: '/email-ingest/watchfox/watches/w-1/resume',
    })

    await deleteWatch('w-1')
    expect(lastCall()).toMatchObject({
      method: 'DELETE',
      url: '/email-ingest/watchfox/watches/w-1',
    })
  })

  it('turns an API error into its message', async () => {
    axiosMock.mockRejectedValue({
      response: { data: { error: 'Choose at most 10 types.' } },
    })

    await expect(updateWatchTypes('w-1', [])).rejects.toThrow(
      'Choose at most 10 types.',
    )
  })

  it('reads, creates and turns off the workflow webhook key', async () => {
    await getWorkflowEmailWebhook(WF_ID)
    expect(lastCall()).toMatchObject({
      method: 'GET',
      url: `/email-ingest/webhook/workflows/${WF_ID}`,
    })

    axiosMock.mockResolvedValue({
      data: { key: 'ezwh_abc', webhook: { enabled: true } },
    })
    const created = await createWorkflowEmailWebhookKey(WF_ID)
    expect(created.key).toBe('ezwh_abc')
    expect(lastCall()).toMatchObject({
      headers: { 'X-Tenant-Id': 't-1' },
      method: 'POST',
      url: `/email-ingest/webhook/workflows/${WF_ID}/key`,
    })

    await disableWorkflowEmailWebhookKey(WF_ID)
    expect(lastCall()).toMatchObject({
      method: 'DELETE',
      url: `/email-ingest/webhook/workflows/${WF_ID}/key`,
    })
  })

  it('reads and saves the workflow email ticket settings', async () => {
    await getWorkflowEmailSettings(WF_ID)
    expect(lastCall()).toMatchObject({
      headers: { 'X-Tenant-Id': 't-1' },
      method: 'GET',
      url: `/email-ingest/workflows/${WF_ID}/email-settings`,
    })

    await saveWorkflowEmailSettings(WF_ID, {
      attachmentTypes: ['.pdf', '.xlsx'],
      ticketMode: 'attachment',
    })
    expect(lastCall()).toMatchObject({
      data: { attachmentTypes: ['.pdf', '.xlsx'], ticketMode: 'attachment' },
      method: 'PUT',
      url: `/email-ingest/workflows/${WF_ID}/email-settings`,
    })
  })

  it('treats m365 and outlook as Outlook', () => {
    expect(isWatchFoxOutlook('m365')).toBe(true)
    expect(isWatchFoxOutlook('outlook')).toBe(true)
    expect(isWatchFoxOutlook('gmail')).toBe(false)
  })
})
