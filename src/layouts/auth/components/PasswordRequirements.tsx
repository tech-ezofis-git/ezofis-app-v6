import { useMemo } from 'react'
import Icon from '@/components/base/icon/Icon'

interface Props {
  password: string
}

const requirementsConfig = [
  { id: 1, label: 'Minimum 8 characters', regex: /.{8,}/ },
  { id: 2, label: 'At least 1 uppercase (A-Z)', regex: /[A-Z]/ },
  { id: 3, label: 'At least 1 lowercase (a-z)', regex: /[a-z]/ },
  { id: 4, label: 'At least 1 number (0-9)', regex: /\d/ },
  {
    id: 5,
    label: 'At least 1 special character (!@#$%^&*)',
    regex: /[!@#$%^&*]/,
  },
]

const PasswordRequirements = ({ password }: Props) => {
  const requirements = useMemo(
    () =>
      requirementsConfig.map((req) => ({
        ...req,
        isValid: req.regex.test(password),
      })),
    [password],
  )

  return (
    <div className='space-y-2 text-sm text-gray-9'>
      <div className='font-medium text-gray-11'>Must contain:</div>

      <ul className='space-y-2' role='list'>
        {requirements.map(({ id, isValid, label }) => (
          <li className='flex items-center gap-x-2' key={id} role='listitem'>
            <Icon
              className={isValid ? 'text-primary-11' : 'text-gray-7'}
              name='tabler:check'
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
