import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axiosV6 } from '../axios'
import {
  generateReportAiPrompt,
  getReportAiReport,
  listReportAiReports,
  runReportAiReport,
  saveReportAiReport,
} from './reportAgent'

vi.mock('../axios', () => ({
  axiosV6: vi.fn(),
  getV6ApiBaseUrl: () => 'https://v6.example.com/api',
}))

vi.mock('@/stores/authUserStore', () => ({
  default: {
    getState: () => ({ identity: null, session: { tenantId: 't-1' } }),
  },
}))

const axiosMock = vi.mocked(axiosV6) as unknown as ReturnType<typeof vi.fn>
const BASE = 'https://v6.example.com/api/report-agent-v2'
const WF_ID = 'b05ed64d-7c94-4ecd-a5b0-caa5839757f9'

const agentSpec = {
  engine: 'report-agent-v2',
  sourceId: WF_ID,
  sourceType: 'Workflow',
  spec: { columns: [{ label: 'Invoice No', ref: 'invoiceNo' }], title: 'AP' },
}
const reportSpec = {
  agentSpec,
  columns: [{ key: 'Invoice No', label: 'Invoice No' }],
  title: 'AP',
  userPrompt: 'list invoices',
}

const lastCall = () =>
  axiosMock.mock.calls[axiosMock.mock.calls.length - 1][0] as Record<
    string,
    unknown
  >

beforeEach(() => {
  axiosMock.mockReset()
  // Independent of a developer's local app/.env.local (CI has none).
  vi.stubEnv('VITE_REPORT_AGENT_V2_URL', '')
})

describe('Report Agent v2 API', () => {
  it('generate previews by workflow id, sends the tenant, and returns rows without an id', async () => {
    axiosMock.mockResolvedValue({
      data: {
        preview: {
          columns: [{ key: 'Invoice No', label: 'Invoice No' }],
          rowCount: 1,
          rows: [{ 'Invoice No': 'INV-1' }],
        },
        reportPrompt: '{}',
        reportSpec,
        reportType: 'specific_workflow',
        title: 'AP',
      },
    })
    const { data, error } = await generateReportAiPrompt({
      description: 'list invoices',
      reportType: 'specific_workflow',
      sessionId: 's-1',
      sourceId: WF_ID,
      workflowName: 'Accounts Payable',
    })
    expect(error).toBe('')
    expect(data?.id).toBe('')
    expect(data?.preview?.rows).toEqual([{ 'Invoice No': 'INV-1' }])
    const call = lastCall()
    expect(call.url).toBe(`${BASE}/definitions/preview`)
    expect(call.headers).toEqual({ 'X-Tenant-Id': 't-1' })
    expect(call.data).toMatchObject({
      prompt: 'list invoices',
      sourceType: 'Workflow',
      workflowId: WF_ID,
    })
  })

  it('falls back to the workflow name when no id is known', async () => {
    axiosMock.mockResolvedValue({
      data: { reportSpec, reportType: 'specific_workflow' },
    })
    await generateReportAiPrompt({
      description: 'list invoices',
      reportType: 'specific_workflow',
      sessionId: 's-1',
      sourceId: 'Accounts Payable',
      workflowName: 'Accounts Payable',
    })
    expect(lastCall().data).toMatchObject({ workflowName: 'Accounts Payable' })
  })

  it('re-runs an edited spec through preview (no LLM) and a saved one by id', async () => {
    axiosMock.mockResolvedValue({
      data: { preview: { columns: [], rows: [] }, reportSpec },
    })
    await runReportAiReport('', { reportSpec })
    expect(lastCall().url).toBe(`${BASE}/definitions/preview`)
    expect(lastCall().data).toMatchObject({
      reportSpec,
      sourceType: 'Workflow',
      workflowId: WF_ID,
    })

    axiosMock.mockResolvedValue({
      data: { columns: [], name: 'AP', rowCount: 0, rows: [] },
    })
    const { data } = await runReportAiReport('r-1', { pageSize: 500 })
    expect(lastCall()).toMatchObject({
      method: 'GET',
      params: { limit: 500 },
      url: `${BASE}/reports/r-1/execute`,
    })
    expect(data?.title).toBe('AP')
  })

  it('saves a previewed report (create) and keeps only uuid share ids', async () => {
    axiosMock.mockResolvedValue({
      data: {
        id: 'r-9',
        name: 'AP',
        reportPrompt: '{}',
        reportSpec,
        reportType: 'specific_workflow',
        title: 'AP',
      },
    })
    const { data } = await saveReportAiReport(null, {
      name: 'AP',
      reportSpec,
      sharedUsers: [WF_ID, 'not-a-uuid'],
      status: 'Published',
      visibility: 'Selected Users',
    })
    expect(data?.id).toBe('r-9')
    expect(data?.kind).toBe('agent')
    const call = lastCall()
    expect(call.url).toBe(`${BASE}/definitions/save`)
    expect(call.data).toMatchObject({
      prompt: 'list invoices',
      sharedUsers: [WF_ID],
      status: 'Published',
      workflowId: WF_ID,
    })
    expect((call.data as { id?: string }).id).toBeUndefined()
  })

  it('refuses to edit a default report without calling the API', async () => {
    const { error } = await saveReportAiReport('r-1', {
      reportSpec: {
        agentSpec: { kind: 'system', template: 'pending_workflow_requests' },
      },
    })
    expect(error).toMatch(/Default reports/)
    expect(axiosMock).not.toHaveBeenCalled()
  })

  it('lists /reports items and marks a missing report as not found', async () => {
    axiosMock.mockResolvedValue({
      data: {
        items: [
          {
            createdAtUtc: '2026-10-30T00:00:00Z',
            id: 'r-1',
            kind: 'default',
            name: 'Pending',
          },
        ],
      },
    })
    const list = await listReportAiReports()
    expect(lastCall().url).toBe(`${BASE}/reports`)
    expect(list.data[0]).toMatchObject({
      id: 'r-1',
      kind: 'default',
      modifiedAtUtc: '2026-10-30T00:00:00Z',
    })

    axiosMock.mockResolvedValue({ data: { error: 'Report not found.' } })
    const missing = await getReportAiReport('nope')
    expect(missing.notFound).toBe(true)
  })
})
