// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import RestoreEntriesDialog from './RestoreEntriesDialog'

afterEach(cleanup)

const renderDialog = (selectedCount: number, trashCount: number) => {
  const onConfirm = vi.fn()
  renderWithProviders(
    <RestoreEntriesDialog
      isRestoring={false}
      opened
      selectedCount={selectedCount}
      trashCount={trashCount}
      onCancel={vi.fn()}
      onConfirm={onConfirm}
    />,
  )
  return { onConfirm }
}

describe('RestoreEntriesDialog', () => {
  it('restores the picked entries by default and opens Browse', () => {
    const { onConfirm } = renderDialog(2, 5)
    fireEvent.click(screen.getByRole('button', { name: /restore 2 entries/i }))
    expect(onConfirm).toHaveBeenCalledWith({ openBrowse: true, scope: 'selected' })
  })

  it('can restore everything in Trash and stay on Trash', () => {
    const { onConfirm } = renderDialog(2, 5)
    fireEvent.click(screen.getByText(/restore all 5 entries in trash/i))
    fireEvent.click(screen.getByLabelText(/show them in browse/i))
    fireEvent.click(screen.getByRole('button', { name: /restore 5 entries/i }))
    expect(onConfirm).toHaveBeenCalledWith({ openBrowse: false, scope: 'all' })
  })

  it('skips the scope choice when the pick is the whole Trash', () => {
    renderDialog(1, 1)
    expect(screen.queryByText(/restore all/i)).toBeNull()
    expect(screen.getByRole('button', { name: /restore entry/i })).toBeTruthy()
  })
})
