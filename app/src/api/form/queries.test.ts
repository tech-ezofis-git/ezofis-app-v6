import { describe, expect, it, vi } from 'vitest'
import formApi from './form'
import { getSlaFormsQueryOptions } from './queries'

vi.mock('./form', () => ({ default: { getForms: vi.fn() } }))

const load = () =>
  (getSlaFormsQueryOptions().queryFn as unknown as () => Promise<unknown[]>)()

describe('getSlaFormsQueryOptions', () => {
  it('keeps only published forms of type SLA', async () => {
    vi.mocked(formApi.getForms).mockResolvedValue({
      data: {
        data: [
          {
            key: '',
            value: [
              {
                id: 'a',
                name: 'Policies',
                publishOption: 'PUBLISHED',
                type: 'SLA',
              },
              { id: 'b', name: 'Draft', publishOption: 'DRAFT', type: 'SLA' },
              {
                id: 'c',
                name: 'PO',
                publishOption: 'PUBLISHED',
                type: 'MASTER',
              },
              {
                id: 'd',
                name: 'Claim',
                publishOption: 'PUBLISHED',
                type: 'WORKFLOW',
              },
            ],
          },
        ],
      },
      error: '',
    })

    expect(await load()).toEqual([
      { formId: 'a', id: 'a', name: 'Policies', uid: 'a' },
    ])
  })

  it('reports a failed load', async () => {
    vi.mocked(formApi.getForms).mockResolvedValue({ data: null, error: 'nope' })
    await expect(load()).rejects.toThrow('nope')
  })
})
