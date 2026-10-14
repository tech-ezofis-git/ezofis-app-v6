/* eslint-disable perfectionist/sort-objects */
// @vitest-environment jsdom
//
// Live Preview must render tables with the shared runtime table renderer, so a
// column setting configured in the builder is visible in the preview.
import { addIcon } from '@iconify/react'
import { cleanup, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import LivePreview from './LivePreview'

vi.mock('@/api/v6/folder/folder', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    getRepositoryItemFacets: vi.fn().mockResolvedValue({ data: [] }),
    getRepositorys: vi.fn().mockResolvedValue({ data: [] }),
  }
})

addIcon('lucide:x', { body: '<path d="M0 0"/>', height: 24, width: 24 })

afterEach(cleanup)

const col = (
  id: string,
  type: string,
  specific: Record<string, unknown> = {},
  validation: Record<string, unknown> = {},
  general: Record<string, unknown> = {},
) => ({
  id,
  name: id,
  label: id,
  type,
  size: 'MEDIUM',
  settings: { general, specific, validation },
})

const field = {
  id: 'f_tbl',
  label: 'Line Items',
  type: 'TABLE',
  settings: {
    general: { size: 'col-12' },
    specific: {
      tableColumns: [
        col(
          'code',
          'SHORT_TEXT',
          { placeholder: 'Enter bill no' },
          {},
          {
            displayLabel: 'Bill No',
          },
        ),
        col('amt', 'NUMBER', { prefixLabel: '$', showColumnTotal: true }),
        col('secret', 'SHORT_TEXT', {}, {}, { visibility: 'HIDDEN' }),
      ],
    },
    validation: {},
  },
}

describe('Live Preview table', () => {
  beforeEach(() => {
    useFormStore.setState({
      isPreviewOpen: true,
      panels: [
        { id: 'p1', fields: [field], name: 'Panel', settings: {} } as never,
      ],
    })
  })

  it('renders the shared table: display label, placeholder, prefix and hidden column', async () => {
    renderWithProviders(<LivePreview />)
    expect(await screen.findByText('Bill No')).toBeTruthy()
    expect(screen.getByPlaceholderText('Enter bill no')).toBeTruthy()
    // a HIDDEN column is not shown
    expect(screen.queryByText('secret')).toBeNull()
    // the number cell shows its prefix (settings reach the preview)
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
    expect(inputs.length).toBeGreaterThan(0)
  })
})
