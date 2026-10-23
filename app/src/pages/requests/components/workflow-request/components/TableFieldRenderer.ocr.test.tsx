/* eslint-disable perfectionist/sort-objects */
// @vitest-environment jsdom
//
// A file column configured to fill other columns must call uploadForOcr and
// write the extracted values into that row.
import { addIcon } from '@iconify/react'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import TableFieldRenderer from './TableFieldRenderer'

const uploadForOcr = vi.fn()
const getRepositorys = vi.fn()

vi.mock('@/api/v6/folder/folder', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    getRepositoryItemFacets: vi.fn().mockResolvedValue({ data: [] }),
    getRepositorys: (...args: unknown[]) => getRepositorys(...args),
    uploadForOcr: (...args: unknown[]) => uploadForOcr(...args),
  }
})

vi.mock('@/api/v6/uploadAndIndex', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  const mockApi = {
    uploadWithOcr: vi.fn().mockResolvedValue({
      data: { fileId: 'staged-file-1', repositoryId: 'repo-1' },
      error: '',
    }),
  }
  return {
    ...actual,
    default: mockApi,
    uploadAndIndexApi: mockApi,
  }
})

addIcon('lucide:x', { body: '<path d="M0 0"/>', height: 24, width: 24 })
addIcon('lucide:refresh-cw', { body: '<path d="M0 0"/>', height: 24, width: 24 })

beforeEach(() => {
  uploadForOcr.mockReset()
  getRepositorys.mockReset()
  getRepositorys.mockResolvedValue({ data: [] })
})
afterEach(cleanup)

type Row = Record<string, unknown>

const col = (
  id: string,
  type: string,
  specific: Record<string, unknown> = {},
  validation: Record<string, unknown> = {},
) => ({
  id,
  name: id,
  label: id,
  type,
  size: 'MEDIUM',
  settings: { general: {}, specific, validation },
})

const field = {
  id: 'f_tbl',
  label: 'Receipts',
  type: 'TABLE',
  settings: {
    general: {},
    specific: {
      tableColumns: [
        col(
          'Receipt',
          'FILE_UPLOAD',
          {},
          { assignOtherControls: ['bill', 'merchant'] },
        ),
        col('bill', 'SHORT_TEXT'),
        col('merchant', 'SHORT_TEXT'),
      ],
    },
    validation: {},
  },
}

const Host = ({
  repositoryId,
  onValue,
  initial,
}: {
  initial?: Row[]
  repositoryId?: string
  onValue: (rows: Row[]) => void
}) => {
  const [value, setValue] = useState<Row[]>(initial ?? [{}])
  return (
    <TableFieldRenderer
      field={field}
      repositoryId={repositoryId}
      value={value}
      onChange={(rows) => {
        setValue(rows)
        onValue(rows)
      }}
    />
  )
}

const pickFile = (container: HTMLElement, file: File) => {
  // The list view opens row 1 itself; expand it only if it is collapsed
  const expand = screen.queryAllByLabelText('Expand row')[0]
  if (expand) fireEvent.click(expand)
  const input = container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  fireEvent.change(input)
}

describe('file column: fill other columns from the document', () => {
  it('calls uploadForOcr with the selected columns and fills the row', async () => {
    uploadForOcr.mockResolvedValue({
      data: {
        ocrFieldList: [
          { name: 'merchant', value: 'Acme Stores' },
          { name: 'bill', value: 'B-100' },
        ],
      },
      error: '',
    })
    let latest: Row[] = []
    const { container } = renderWithProviders(
      <Host repositoryId='repo-1' onValue={(r) => (latest = r)} />,
    )
    pickFile(
      container,
      new File(['x'], 'receipt.pdf', { type: 'application/pdf' }),
    )

    await waitFor(() => expect(uploadForOcr).toHaveBeenCalledTimes(1))
    const [repo, file, hints] = uploadForOcr.mock.calls[0]
    expect(repo).toBe('repo-1')
    expect((file as File).name).toBe('receipt.pdf')
    expect(hints).toEqual(['bill,SHORT_TEXT', 'merchant,SHORT_TEXT'])

    await waitFor(() => expect(latest[0].bill).toBe('B-100'))
    expect(latest[0].merchant).toBe('Acme Stores')
  })

  it('shows no status line once the row is filled (the info icon lists the columns)', async () => {
    uploadForOcr.mockResolvedValue({
      data: { ocrFieldList: [{ name: 'bill', value: 'B-7' }] },
      error: '',
    })
    let latest: Row[] = []
    const { container } = renderWithProviders(
      <Host repositoryId='repo-1' onValue={(r) => (latest = r)} />,
    )
    pickFile(container, new File(['x'], 'r.pdf', { type: 'application/pdf' }))
    await waitFor(() => expect(latest[0].bill).toBe('B-7'))
    expect(screen.queryByText(/Filled from the document/)).toBeNull()
    expect(screen.queryByText(/Reading document/)).toBeNull()
  })

  it('says so when the document has none of the selected values', async () => {
    uploadForOcr.mockResolvedValue({
      data: { ocrFieldList: [{ name: 'unrelated', value: 'x' }] },
      error: '',
    })
    const { container } = renderWithProviders(
      <Host repositoryId='repo-1' onValue={() => undefined} />,
    )
    pickFile(container, new File(['x'], 'r.pdf', { type: 'application/pdf' }))
    expect(
      await screen.findByText(
        /No values were found in the document for: bill, merchant/,
      ),
    ).toBeTruthy()
  })

  it('shows the error when the extraction service fails', async () => {
    uploadForOcr.mockResolvedValue({ data: null, error: 'OCR is not enabled' })
    const { container } = renderWithProviders(
      <Host repositoryId='repo-1' onValue={() => undefined} />,
    )
    pickFile(container, new File(['x'], 'r.pdf', { type: 'application/pdf' }))
    expect(
      await screen.findByText(
        /Could not read the document: OCR is not enabled/,
      ),
    ).toBeTruthy()
  })

  it('with no repository from the screen, uses the first available repository', async () => {
    getRepositorys.mockResolvedValue({ data: [{ id: 'repo-9', name: 'Main' }] })
    uploadForOcr.mockResolvedValue({
      data: { ocrFieldList: [{ name: 'merchant', value: 'Acme' }] },
      error: '',
    })
    let latest: Row[] = []
    const { container } = renderWithProviders(
      <Host onValue={(r) => (latest = r)} />,
    )
    await waitFor(() => expect(getRepositorys).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 50))
    pickFile(container, new File(['x'], 'r.pdf', { type: 'application/pdf' }))
    await waitFor(() => expect(uploadForOcr).toHaveBeenCalledTimes(1))
    expect(uploadForOcr.mock.calls[0][0]).toBe('repo-9')
    await waitFor(() => expect(latest[0].merchant).toBe('Acme'))
  })

  it('with no repository anywhere, tells the user instead of failing silently', async () => {
    getRepositorys.mockResolvedValue({ data: [] })
    const { container } = renderWithProviders(
      <Host onValue={() => undefined} />,
    )
    await new Promise((r) => setTimeout(r, 100))
    pickFile(container, new File(['x'], 'r.pdf', { type: 'application/pdf' }))
    expect(
      await screen.findByText(/no repository is available for this form/),
    ).toBeTruthy()
    expect(uploadForOcr).not.toHaveBeenCalled()
  })
})
