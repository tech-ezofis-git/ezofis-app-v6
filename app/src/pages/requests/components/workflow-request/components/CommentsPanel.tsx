import { useLingui } from '@lingui/react/macro'
import { useRef } from 'react'
import Icon from '@/components/base/icon/Icon'
import authUserStore from '@/stores/authUserStore'
import { formatDatetime } from '@/utils/dayjs'

const getInitials = (fullNameOrEmail: string): string => {
  const clean = String(fullNameOrEmail || '').trim()
  if (!clean) return 'U'
  if (clean.includes('@')) {
    const part = clean.split('@')[0]
    const parts = part.split(/[._-]/).filter(Boolean)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : part.slice(0, 2).toUpperCase()
  }
  const parts = clean.split(/\s+/).filter(Boolean)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : clean.slice(0, 2).toUpperCase()
}

export interface LocalComment {
  createdAt: string
  id: string
  text: string
}

interface Props {
  comments: LocalComment[]
  draft: string
  onDraftChange: (value: string) => void
  onSend: () => void
}

// Notes attached to the request on submit (joined into the start payload's
// `context`). This is a local, pre-submission list, not a live thread —
// a real multi-person discussion only exists once the request has an
// instanceId, which is what the existing request-detail Comments.tsx
// renders against the real comments API.
const CommentsPanel = ({ comments, draft, onDraftChange, onSend }: Props) => {
  const { t } = useLingui()
  const session = authUserStore((state) => state.session)
  const displayName =
    session?.name || session?.firstName || session?.email || 'You'
  const initials = getInitials(displayName)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = draft.trim().length > 0

  return (
    <div className='rounded-xl border border-gray-3 bg-gray-0 p-4 shadow-2xs'>
      <div className='mb-3 flex items-center justify-between gap-2.5'>
        <div className='flex items-center gap-2.5'>
          <div className='flex size-8 items-center justify-center rounded-lg bg-primary-1'>
            <Icon className='size-4 text-primary-9' name='tabler:message-2' />
          </div>
          <div>
            <h3 className='text-14 font-bold text-gray-13'>{t`Comments`}</h3>
            <p className='text-11 text-gray-9'>{t`Add a note for the approver`}</p>
          </div>
        </div>
        {comments.length > 0 && (
          <span className='rounded-full bg-gray-2 px-2 py-0.5 text-11 font-semibold text-gray-10'>
            {comments.length}
          </span>
        )}
      </div>

      {comments.length === 0 ? (
        <div className='mb-3 flex items-center gap-2 rounded-lg border border-dashed border-gray-3 px-3 py-2.5 text-12 text-gray-8'>
          <Icon className='size-3.5 shrink-0' name='tabler:messages-off' />
          {t`No comments yet`}
        </div>
      ) : (
        <div className='mb-3 flex max-h-[220px] flex-col gap-3 overflow-y-auto pr-1'>
          {comments.map((c) => (
            <div className='flex items-start gap-2.5' key={c.id}>
              <div className='flex size-7 shrink-0 items-center justify-center rounded-full border border-primary-4 bg-primary-3 text-11 font-bold text-primary-9'>
                {initials}
              </div>
              <div className='min-w-0 flex-1'>
                <div className='flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5'>
                  <span className='text-12 font-bold text-gray-13'>{t`You`}</span>
                  <span className='text-11 font-medium text-gray-9'>
                    {formatDatetime(c.createdAt, 'hh:mm A')}
                  </span>
                </div>
                <p className='text-12 leading-relaxed font-medium break-words whitespace-pre-wrap text-gray-11'>
                  {c.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className='flex items-start gap-2.5'>
        <div className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-primary-4 bg-primary-3 text-13 font-bold text-primary-9'>
          {initials}
        </div>
        <div className='flex-1 overflow-hidden rounded-xl border border-[var(--gray-4)] bg-surface transition-all focus-within:border-[var(--primary-6)] focus-within:ring-1 focus-within:ring-[var(--primary-4)]'>
          <textarea
            className='w-full resize-none bg-transparent px-3 py-2 text-[13px] font-medium text-[var(--gray-13)] placeholder:text-[var(--gray-9)] focus:outline-none'
            placeholder={t`Add a comment...`}
            ref={textareaRef}
            rows={1}
            style={{ lineHeight: '1.4', minHeight: '36px' }}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (canSend) onSend()
              }
            }}
          />
        </div>
        <button
          disabled={!canSend}
          title={t`Send comment`}
          type='button'
          className={`mt-0.5 flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl bg-primary-9 text-white transition-all active:scale-95 ${
            canSend
              ? 'cursor-pointer hover:opacity-90'
              : 'cursor-not-allowed opacity-45'
          }`}
          onClick={onSend}
        >
          <Icon className='size-4.5' name='tabler:send' />
        </button>
      </div>
    </div>
  )
}

CommentsPanel.displayName = 'CommentsPanel'
export default CommentsPanel
