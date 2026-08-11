import { useMemo } from 'react'
import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'

interface Props {
  password: string
}

export const requirementsConfig = [
  { id: 1, label: msg`Minimum 8 characters`, regex: /.{8,}/ },
  { id: 2, label: msg`At least 1 uppercase (A-Z)`, regex: /[A-Z]/ },
  { id: 3, label: msg`At least 1 lowercase (a-z)`, regex: /[a-z]/ },
  { id: 4, label: msg`At least 1 number (0-9)`, regex: /\d/ },
  {
    id: 5,
    label: msg`At least 1 special character (!@#$%^&*)`,
    regex: /[!@#$%^&*]/,
  },
]

export const getRequirementsConfig = (
  _: (descriptor: any) => string,
) =>
  requirementsConfig.map((req) => ({
    ...req,
    label: _(req.label),
  }))

const PasswordRequirements = ({ password }: Props) => {
  const { i18n, t } = useLingui()
  const requirements = useMemo(
    () =>
      requirementsConfig.map((req) => ({
        ...req,
        isValid: req.regex.test(password),
        label: i18n._(req.label),
      })),
    [i18n, password],
  )

  return (
    <div className='space-y-2 text-13 text-gray-10'>
      <div className='font-medium text-gray-11'>{t`Must contain:`}</div>

      <ul className='space-y-2' role='list'>
        {requirements.map(({ id, isValid, label }) => (
          <li
            key={id}
            role='listitem'
            className={`flex items-center gap-x-2 transition-all duration-200 ${
              isValid ? 'font-semibold text-success-main' : 'text-gray-9'
            }`}
          >
            <Icon
              className={isValid ? 'text-success-main' : 'text-gray-6'}
              name={isValid ? 'lucide:check' : 'lucide:dot'}
            />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

PasswordRequirements.displayName = 'PasswordRequirements'
export default PasswordRequirements
