import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import type { UserLoginActivity } from '@/api/v6/reportAgent'
import {
  getReportUserActivity,
  getReportUserSession,
} from '@/api/v6/reportAgent'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Modal from '@/components/base/Modal'
import showToast from '@/components/base/toast/showToast'
import cn from '@/utils/cn'
import { formatReportDate } from '@/utils/utcDate'
import StatusPill from './StatusPill'

type Login = UserLoginActivity['logins'][number]

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

const minutesBetween = (from?: null | string, to?: null | string) =>
  from && to ? Math.max(0, dayjs(to).diff(dayjs(from), 'minute')) : 0

/**
 * The actions of one login session (until the next login), shown under its
 * row when the row is opened; loaded only then.
 */
const SessionTimeline = ({
  email,
  login,
  reportId,
}: {
  email: string
  login: Login
  reportId: string
}) => {
  const { t } = useLingui()
  const query = useQuery({
    queryKey: ['report-user-session', reportId, email, login.at],
    retry: false,
    queryFn: () => getReportUserSession(reportId, email, login.at!),
  })
  const actions = query.data?.actions ?? []
  const lastAt = actions[actions.length - 1]?.at
  const minutes = minutesBetween(login.at, lastAt)

  return (
    <motion.div
      animate={{ height: 'auto', opacity: 1 }}
      className='overflow-hidden'
      exit={{ height: 0, opacity: 0 }}
      initial={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className='mb-2 ml-4 border-l-2 border-primary-4 pl-4'>
        {query.isLoading && (
          <p className='flex items-center gap-2 py-2 text-12 text-gray-10'>
            <Icon className='size-3.5 animate-spin' name='lucide:loader-2' />
            {t`Loading session...`}
          </p>
        )}
        {query.isError && (
          <p className='py-2 text-12 text-red-11'>
            {t`Could not load this session.`}
          </p>
        )}
        {query.isSuccess && actions.length === 0 && (
          <p className='py-2 text-12 text-gray-10'>
            {t`No activity recorded in this session.`}
          </p>
        )}
        {actions.length > 0 && (
          <ul className='flex flex-col'>
            {actions.map((action, index) => (
              <motion.li
                animate={{ opacity: 1, x: 0 }}
                className='relative flex items-start gap-3 py-1.5'
                initial={{ opacity: 0, x: -6 }}
                key={`${action.at}-${index}`}
                transition={{
                  delay: Math.min(index, 15) * 0.025,
                  duration: 0.18,
                }}
              >
                <span className='absolute top-3 -left-[21px] size-2 rounded-full bg-primary-9 ring-2 ring-surface' />
                <span className='w-14 shrink-0 pt-px font-mono text-12 text-gray-10'>
                  {action.at ? dayjs(action.at).format('hh:mm A') : '-'}
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-13 text-gray-13'>
                    {action.event || action.type || '-'}
                  </p>
                  {(action.path || action.category) && (
                    <p className='truncate text-12 text-gray-10'>
                      {action.path
                        ? [action.method, action.path].filter(Boolean).join(' ')
                        : action.category}
                    </p>
                  )}
                </div>
                {action.severity && action.severity !== 'Info' && (
                  <StatusPill
                    color={SEVERITY_COLORS[action.severity] ?? 'gray'}
                    label={action.severity}
                  />
                )}
              </motion.li>
            ))}
          </ul>
        )}
        {actions.length > 0 && (
          <p className='pt-1 pb-1 text-12 font-medium text-gray-11'>
            {minutes > 0
              ? t`${actions.length} actions in ${minutes} min`
              : t`${actions.length} actions`}
          </p>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Every login (time, web / mobile, IP, device) and security event of one
 * user, opened from a row of the User Login and Security Activity report.
 * A login opens in place to show what the user did in that session.
 */
const UserActivityModal = ({ email, reportId, onClose }: Props) => {
  const { t } = useLingui()
  const [tab, setTab] = useState<Tab>('logins')
  const [openLogin, setOpenLogin] = useState<null | string>(null)

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

  const [exporting, setExporting] = useState(false)

  // Excel with three sheets: the logins (with their session's action count),
  // every action grouped under the login it belongs to, and the counted events.
  const exportActivity = async () => {
    if (!email) return
    setExporting(true)
    try {
      const data = await getReportUserActivity(reportId, email, {
        includeActions: true,
      })
      const loginTimes = (data.logins ?? [])
        .map((login) => login.at)
        .filter((at): at is string => Boolean(at))
        .sort()
      // An action belongs to the latest login at or before it.
      const sessionOf = (at: null | string) => {
        if (!at) return null
        let found: null | string = null
        for (const loginAt of loginTimes) {
          if (loginAt <= at) found = loginAt
          else break
        }
        return found
      }
      const actions = (data.actions ?? []).map((action) => ({
        ...action,
        session: sessionOf(action.at),
      }))
      const show = (at: null | string) => (at ? formatReportDate(at) : '')
      const book = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.json_to_sheet(
          (data.logins ?? []).map((login) => ({
            [t`Actions`]: actions.filter((a) => a.session === login.at).length,
            [t`Channel`]: login.channel ?? '',
            [t`Device`]: login.device ?? '',
            [t`Login Time`]: show(login.at),
          })),
        ),
        t`Logins`,
      )
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.json_to_sheet(
          actions.map((action) => ({
            [t`Action`]: action.event || action.type || '',
            [t`Action Time`]: show(action.at),
            [t`Category`]: action.category ?? '',
            [t`Login Time`]: show(action.session),
            [t`Method`]: action.method ?? '',
            [t`Page`]: action.path ?? '',
            [t`Severity`]: action.severity ?? '',
          })),
        ),
        t`Session Activity`,
      )
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.json_to_sheet(
          (data.events ?? []).map((event) => ({
            [t`Category`]: event.category ?? '',
            [t`Event`]: event.event || event.type || '',
            [t`Severity`]: event.severity ?? '',
            [t`Time`]: show(event.at),
          })),
        ),
        t`Events`,
      )
      XLSX.writeFile(
        book,
        `${email.replace(/[^a-z0-9._-]+/gi, '_')}-activity.xlsx`,
      )
    } catch {
      showToast({
        message: t`Could not export this user's activity.`,
        variant: 'error',
      })
    } finally {
      setExporting(false)
    }
  }

  const close = () => {
    setOpenLogin(null)
    onClose()
  }

  return (
    <Modal opened={Boolean(email)} width={640} onClose={close}>
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
            ariaLabel={t`Export to Excel`}
            color='gray'
            disabled={exporting || !query.isSuccess}
            icon={exporting ? 'lucide:loader-2' : 'lucide:download'}
            iconClass={exporting ? 'animate-spin' : undefined}
            size='sm'
            tooltip={t`Export logins, session activity and events`}
            variant='ghost'
            onClick={() => void exportActivity()}
          />
          <IconButton
            ariaLabel={t`Close`}
            color='gray'
            icon='lucide:x'
            size='sm'
            variant='ghost'
            onClick={close}
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
              {logins.map((login, index) => {
                const isOpen = Boolean(login.at) && openLogin === login.at
                return (
                  <motion.li
                    animate={{ opacity: 1, y: 0 }}
                    className='border-b border-gray-3 last:border-b-0'
                    initial={{ opacity: 0, y: 6 }}
                    key={`${login.at}-${index}`}
                    transition={{
                      delay: Math.min(index, 12) * 0.03,
                      duration: 0.2,
                    }}
                  >
                    <button
                      aria-expanded={isOpen}
                      disabled={!login.at}
                      type='button'
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-3 rounded-md px-1 py-2.5 text-left transition-colors hover:bg-gray-2',
                        isOpen && 'bg-gray-2',
                      )}
                      onClick={() =>
                        setOpenLogin(isOpen ? null : (login.at ?? null))
                      }
                    >
                      <Icon
                        className='size-4 shrink-0 text-gray-9'
                        name={
                          isOpen
                            ? 'lucide:chevron-down'
                            : 'lucide:chevron-right'
                        }
                      />
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
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && email && (
                        <SessionTimeline
                          email={email}
                          key='session'
                          login={login}
                          reportId={reportId}
                        />
                      )}
                    </AnimatePresence>
                  </motion.li>
                )
              })}
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
