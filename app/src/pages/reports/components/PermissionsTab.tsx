import { useLingui } from '@lingui/react/macro'
import type { Report } from '@/pages/report-builder/types'
import Icon from '@/components/base/icon/Icon'
import { MOCK_GROUPS, MOCK_USERS } from '@/pages/report-builder/constants'

interface Props {
  report: Report
}

const labelFor = (options: { label: string; value: string }[], value: string) =>
  options.find((o) => o.value === value)?.label || value

const PermissionsTab = ({ report }: Props) => {
  const { t } = useLingui()

  return (
    <div className='flex flex-col gap-5'>
      <div className='rounded-xl border border-gray-3 p-4'>
        <p className='mb-1 text-12 font-semibold tracking-wide text-gray-9 uppercase'>
          {t`Visibility`}
        </p>
        <p className='flex items-center gap-2 text-14 font-medium text-gray-13'>
          <Icon
            className='size-4 text-primary-9'
            name={
              report.visibility === 'Private'
                ? 'lucide:lock'
                : report.visibility === 'Selected Users'
                  ? 'lucide:users'
                  : 'lucide:user-round-check'
            }
          />
          {report.visibility}
        </p>
      </div>

      {report.visibility === 'Selected Users' && (
        <div className='rounded-xl border border-gray-3 p-4'>
          <p className='mb-3 text-12 font-semibold tracking-wide text-gray-9 uppercase'>
            {t`Shared Users`}
          </p>
          {report.sharedUsers.length === 0 ? (
            <p className='text-13 text-gray-9'>{t`No users shared yet.`}</p>
          ) : (
            <div className='flex flex-wrap gap-2'>
              {report.sharedUsers.map((user) => (
                <span
                  className='inline-flex items-center gap-1.5 rounded-full border border-gray-3 bg-gray-1 px-3 py-1 text-13 text-gray-12'
                  key={user}
                >
                  <Icon className='size-3.5 text-gray-9' name='lucide:user' />
                  {labelFor(MOCK_USERS, user)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {report.visibility === 'Selected Groups' && (
        <div className='rounded-xl border border-gray-3 p-4'>
          <p className='mb-3 text-12 font-semibold tracking-wide text-gray-9 uppercase'>
            {t`Shared Groups`}
          </p>
          {report.sharedGroups.length === 0 ? (
            <p className='text-13 text-gray-9'>{t`No groups shared yet.`}</p>
          ) : (
            <div className='flex flex-wrap gap-2'>
              {report.sharedGroups.map((group) => (
                <span
                  className='inline-flex items-center gap-1.5 rounded-full border border-gray-3 bg-gray-1 px-3 py-1 text-13 text-gray-12'
                  key={group}
                >
                  <Icon
                    className='size-3.5 text-gray-9'
                    name='lucide:users-round'
                  />
                  {labelFor(MOCK_GROUPS, group)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className='rounded-xl border border-gray-3 p-4'>
        <p className='mb-1 text-12 font-semibold tracking-wide text-gray-9 uppercase'>
          {t`Owner`}
        </p>
        <p className='text-14 font-medium text-gray-13'>{report.owner}</p>
      </div>
    </div>
  )
}

PermissionsTab.displayName = 'PermissionsTab'
export default PermissionsTab
