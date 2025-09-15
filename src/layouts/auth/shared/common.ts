import type { VerificationMethod } from '@/types'

export const VERIFICATION_OPTIONS: Record<
  VerificationMethod,
  {
    description: string
    disabled: boolean
    icon: string
    instruction: string
    label: string
    method: VerificationMethod
  }
> = {
  app: {
    description: 'Get a code at your authenticator app.',
    disabled: false,
    icon: 'tabler:device-mobile',
    instruction: 'Enter the code from your authenticator app.',
    label: 'Authenticator App',
    method: 'app',
  },
  email: {
    description: 'Get a verification code at your email.',
    disabled: false,
    icon: 'tabler:mail',
    instruction: 'Enter the code sent to your email.',
    label: 'Email',
    method: 'email',
  },
  sms: {
    description: 'Get a verification code at your mobile.',
    disabled: false,
    icon: 'tabler:message',
    instruction: 'Enter the code sent to your mobile.',
    label: 'SMS',
    method: 'sms',
  },
} as const
