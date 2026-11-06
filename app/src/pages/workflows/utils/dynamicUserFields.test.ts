import { describe, expect, it } from 'vitest'
import { hasNoEmailOptions, isDynamicUserField } from './dynamicUserFields'

describe('isDynamicUserField', () => {
  it.each(['SINGLE_SELECT', 'MULTI_SELECT', 'SINGLE_CHOICE', 'EMAIL'])(
    'accepts %s',
    (type) => {
      expect(isDynamicUserField({ type })).toBe(true)
    },
  )

  it('accepts multiple choice, which saves the same list as multi select', () => {
    expect(isDynamicUserField({ type: 'MULTIPLE_CHOICE' })).toBe(true)
  })

  it('accepts a text box only when it is restricted to emails', () => {
    expect(
      isDynamicUserField({
        type: 'SHORT_TEXT',
        settings: { validation: { contentRule: 'email' } },
      }),
    ).toBe(true)
    expect(isDynamicUserField({ type: 'SHORT_TEXT' })).toBe(false)
  })

  it.each(['NUMBER', 'TABLE', 'DATE', 'FILE_UPLOAD'])('rejects %s', (type) => {
    expect(isDynamicUserField({ type })).toBe(false)
  })
})

describe('hasNoEmailOptions', () => {
  const custom = (customOptions: string, optionsType?: string) => ({
    settings: { specific: { customOptions, optionsType } },
  })

  it('flags a typed-in list with no email', () => {
    expect(hasNoEmailOptions(custom('Yes\nNo'))).toBe(true)
  })

  it('passes a typed-in list with an email', () => {
    expect(hasNoEmailOptions(custom('Sales,a@example.com'))).toBe(false)
  })

  it('does not judge options that load at runtime', () => {
    expect(hasNoEmailOptions(custom('Yes', 'USER_LIST'))).toBe(false)
    expect(hasNoEmailOptions({ type: 'EMAIL' })).toBe(false)
  })
})
