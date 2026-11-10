// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test-utils/renderWithProviders'
import SettingRow from './SettingRow'
import SettingSwitchRow from './SettingSwitchRow'

afterEach(cleanup)

describe('SettingRow', () => {
  it('shows the label, the control and the help sentence', () => {
    renderWithProviders(
      <SettingRow
        help='Grey example text shown inside an empty box.'
        label='Placeholder text'
      >
        <input aria-label='Placeholder box' />
      </SettingRow>,
    )

    expect(screen.getByText('Placeholder text')).toBeTruthy()
    expect(screen.getByLabelText('Placeholder box')).toBeTruthy()
    expect(
      screen.getByText('Grey example text shown inside an empty box.'),
    ).toBeTruthy()
  })

  it('names the group after its label and describes it with the help sentence', () => {
    renderWithProviders(
      <SettingRow help='How wide the field is.' label='Field width'>
        <input />
      </SettingRow>,
    )

    const group = screen.getByRole('group', { name: 'Field width' })
    const noteId = group.getAttribute('aria-describedby')
    expect(noteId).toBeTruthy()
    expect(document.getElementById(noteId!)?.textContent).toBe(
      'How wide the field is.',
    )
  })

  it('marks a required setting with the shared required star', () => {
    renderWithProviders(
      <SettingRow label='Master form' required>
        <input />
      </SettingRow>,
    )

    expect(screen.getByText('*')).toBeTruthy()
  })

  it('shows "(optional)" for an optional setting', () => {
    renderWithProviders(
      <SettingRow label='Row names' optional>
        <input />
      </SettingRow>,
    )

    expect(screen.getByText('(optional)')).toBeTruthy()
  })

  it('shows an error in place of the help sentence', () => {
    renderWithProviders(
      <SettingRow
        error='Pick a master form.'
        help='The master form to look up.'
        label='Master form'
      >
        <input />
      </SettingRow>,
    )

    expect(screen.getByText('Pick a master form.')).toBeTruthy()
    expect(screen.queryByText('The master form to look up.')).toBeNull()
  })

  it('shows no note when there is no help and no error', () => {
    renderWithProviders(
      <SettingRow label='Field width'>
        <input />
      </SettingRow>,
    )

    expect(
      screen.getByRole('group').getAttribute('aria-describedby'),
    ).toBeNull()
  })
})

describe('SettingSwitchRow', () => {
  const renderSwitch = (checked: boolean, disabled = false) => {
    const onChange = vi.fn()
    renderWithProviders(
      <SettingSwitchRow
        checked={checked}
        disabled={disabled}
        help='Users must fill this in before they can submit.'
        title='Required'
        onChange={onChange}
      />,
    )
    return onChange
  }

  it('shows the title and the help sentence', () => {
    renderSwitch(false)

    expect(screen.getByText('Required')).toBeTruthy()
    expect(
      screen.getByText('Users must fill this in before they can submit.'),
    ).toBeTruthy()
  })

  it('switches on when the row is clicked', () => {
    const onChange = renderSwitch(false)

    fireEvent.click(screen.getByText('Required'))

    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('switches off when the row is clicked while on', () => {
    const onChange = renderSwitch(true)

    fireEvent.click(screen.getByText('Required'))

    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('does nothing when disabled', () => {
    const onChange = renderSwitch(false, true)

    fireEvent.click(screen.getByText('Required'))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('is off when the setting was never saved', () => {
    renderWithProviders(<SettingSwitchRow title='Required' />)

    expect((screen.getByRole('switch') as HTMLInputElement).checked).toBe(false)
  })

  it('can be shown disabled without a change handler', () => {
    renderWithProviders(<SettingSwitchRow title='Street' checked disabled />)

    const control = screen.getByRole('switch') as HTMLInputElement
    expect(control.checked).toBe(true)
    expect(control.disabled).toBe(true)
  })

  it('can be found by its title as a switch', () => {
    renderSwitch(true)

    const control = screen.getByRole('switch') as HTMLInputElement
    expect(control.checked).toBe(true)
  })
})
