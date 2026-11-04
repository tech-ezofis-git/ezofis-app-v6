import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useState } from 'react'
import { getReportUserActivity } from '@/api/v6/reportAgent'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Modal from '@/components/base/Modal'
import cn from '@/utils/cn'
import { formatReportDate } from '@/utils/utcDate'
import StatusPill from './StatusPill'

interface Props {
  email: string | null
  reportId: string
  onClose: () => void
}

type Tab = 'events' | 'logins'

const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'red',
  Info: 'blue',
  Warning: 'orange',
}

/**
 * Every login (time, web / mobile, IP, device) and security event of one
 * user, opened from a row of the User Login and Security Activity report.
 */
const UserActivityModal = ({ email, reportId, onClose }: Props) => {
  const { t } = useLingui()
  const [tab, setTab] = useState<Tab>('logins')

  const query = useQuery({
    enabled: Boolean(email),
    queryKey: ['report-user-activity', reportId, email],
    retry: false,
    queryFn: () => getReportUserActivity(reportId, email!),
  })
  const logins = query.data?.logins ?? []
  const events = query.data?.events ?? []
  const web = logins.filter((login) => login.channel === 'Web').length

  const tabs: { count: number; id: Tab; label: string }[] = [
    { count: logins.length, id: 'logins', label: t`Logins` },
    { count: events.length, id: 'events', label: t`Events` },
  ]

  return (
    <Modal opened={Boolean(email)} width={640} onClose={onClose}>
      <div className='flex max-h-[80vh] flex-col p-5'>
        <div className='flex items-start gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-2 text-primary-11'>
            <Icon className='size-5' name='lucide:user-round' />
          </div>
          <div className='min-w-0 flex-1'>
            <h3 className='truncate text-15 font-semibold text-gray-13'>
              {email}
            </h3>
            <p className='mt-0.5 text-13 text-gray-11'>
              {t`Last 30 days`}
              {logins.length > 0 && (
                <>
                  {' · '}
                  {t`${logins.length} logins (${web} web, ${logins.length - web} mobile)`}
                </>
              )}
            </p>
          </div>
          <IconButton
            ariaLabel={t`Close`}
            color='gray'
            icon='lucide:x'
            size='sm'
            variant='ghost'
            onClick={onClose}
          />
        </div>

        <div className='mt-4 flex gap-1 border-b border-gray-4'>
          {tabs.map(({ count, id, label }) => (
            <button
              key={id}
              type='button'
              className={cn(
                '-mb-px cursor-pointer border-b-2 px-3 py-2 text-13 font-medium transition-colors',
                tab === id
                  ? 'border-primary-9 text-primary-11'
                  : 'border-transparent text-gray-10 hover:text-gray-12',
              )}
              onClick={() => setTab(id)}
            >
              {label}
              <span className='ml-1.5 rounded-full bg-gray-3 px-1.5 text-12 text-gray-11'>
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className='ez-scrollbar mt-3 min-h-40 flex-1 overflow-y-auto'>
          {query.isLoading && (
            <div className='flex items-center justify-center gap-2 py-10 text-13 text-gray-10'>
              <Icon className='size-4 animate-spin' name='lucide:loader-2' />
              {t`Loading activity...`}
            </div>
          )}
          {query.isError && (
            <p className='py-10 text-center text-13 text-red-11'>
              {t`Could not load this user's activity.`}
            </p>
          )}
          {query.isSuccess &&
            (tab === 'logins' ? logins.length : events.length) === 0 && (
              <p className='py-10 text-center text-13 text-gray-10'>
                {tab === 'logins'
                  ? t`No logins in the last 30 days.`
                  : t`No security, warning or permission events in the last 30 days.`}
              </p>
            )}
          {query.isSuccess && tab === 'logins' && logins.length > 0 && (
            <ul className='flex flex-col'>
              {logins.map((login, index) => (
                <motion.li
                  animate={{ opacity: 1, y: 0 }}
                  className='flex items-center gap-3 border-b border-gray-3 py-2.5 last:border-b-0'
                  initial={{ opacity: 0, y: 6 }}
                  key={`${login.at}-${index}`}
                  transition={{
                    delay: Math.min(index, 12) * 0.03,
                    duration: 0.2,
                  }}
                >
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg',
                      login.channel === 'Mobile'
                        ? 'bg-green-2 text-green-11'
                        : 'bg-blue-2 text-blue-11',
                    )}
                  >
                    <Icon
                      className='size-4'
                      name={
                        login.channel === 'Mobile'
                          ? 'lucide:smartphone'
                          : 'lucide:monitor'
                      }
                    />
                  </span>
                  <div className='min-w-0 flex-1'>
                    <p className='text-13 font-medium text-gray-13'>
                      {login.at ? formatReportDate(login.at) : '-'}
                    </p>
                    <p className='truncate text-12 text-gray-10'>
                      {[login.channel, login.device]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <span className='shrink-0 font-mono text-12 text-gray-11'>
                    {login.ip || '-'}
                  </span>
                </motion.li>
              ))}
            </ul>
          )}
          {query.isSuccess && tab === 'events' && events.length > 0 && (
            <ul className='flex flex-col'>
              {events.map((event, index) => (
                <motion.li
                  animate={{ opacity: 1, y: 0 }}
                  className='flex items-center gap-3 border-b border-gray-3 py-2.5 last:border-b-0'
                  initial={{ opacity: 0, y: 6 }}
                  key={`${event.at}-${index}`}
                  transition={{
                    delay: Math.min(index, 12) * 0.03,
                    duration: 0.2,
                  }}
                >
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-13 font-medium text-gray-13'>
                      {event.event || event.type || '-'}
                    </p>
                    <p className='truncate text-12 text-gray-10'>
                      {[
                        event.at ? formatReportDate(event.at) : null,
                        event.category,
                        event.ip,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {event.severity && (
                    <StatusPill
                      color={SEVERITY_COLORS[event.severity] ?? 'gray'}
                      label={event.severity}
                    />
                  )}
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}

UserActivityModal.displayName = 'UserActivityModal'
export default UserActivityModal
