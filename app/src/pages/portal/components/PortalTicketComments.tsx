import { useLingui } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
import workflowsApiV6 from '@/api/v6/workflows'
import showToast from '@/components/base/toast/showToast'
import CommentsPanel, {
  type LocalComment,
} from '@/pages/requests/components/workflow-request/components/CommentsPanel'
import type { CommentItem } from '@/pages/requests/hooks/useComments'
import authUserStore from '@/stores/authUserStore'
import { parseUtcDate } from '@/utils/utcDate'

const UUID_RE =
  /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

type Props = {
  comments: CommentItem[]
  instanceId?: number | string
  isLoading?: boolean
  workflowId: number | string
  refetch: () => Promise<void>
}

// The request's live comment thread in the same card as the new submission's
// Comments: lists everyone's comments and posts new ones to the request.
export default function PortalTicketComments({
  comments,
  instanceId,
  isLoading = false,
  workflowId,
  refetch,
}: Props) {
  const { t } = useLingui()
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const items = useMemo<LocalComment[]>(() => {
    const { session } = authUserStore.getState()
    const myEmail = session?.email?.trim().toLowerCase()
    const myId = session?.id ? String(session.id) : ''
    return comments
      .map((comment, index) => {
        const isAgent =
          comment.isAgent === true ||
          String(comment.authorType || '').toUpperCase() === 'AGENT'
        const isMe =
          !isAgent &&
          ((Boolean(myEmail) &&
            comment.createdByEmail?.trim().toLowerCase() === myEmail) ||
            (Boolean(myId) && String(comment.createdBy || '') === myId))
        const name = isAgent
          ? comment.authorName || comment.externalCommentsBy || t`Agent`
          : [comment.createdByName, comment.createdByEmail].find(
              (value) => value && !UUID_RE.test(value),
            ) || t`User`
        const date = comment.createdAt ? parseUtcDate(comment.createdAt) : null
        return {
          authorName: isMe ? undefined : name,
          createdAt: date ? date.toISOString() : comment.createdAt || '',
          id: String(comment.id ?? index),
          text: String(comment.comments || ''),
        }
      })
      .sort(
        (a, b) =>
          (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0),
      )
  }, [comments, t])

  const send = async () => {
    const text = draft.trim()
    if (!text || !instanceId || sending) return
    setSending(true)
    const posted = await workflowsApiV6.addInstanceComment(
      String(workflowId),
      instanceId,
      { comments: text, showTo: 2 },
    )
    if (posted.error) {
      showToast({
        message: t`Unable to post your comment.`,
        variant: 'error',
      })
    } else {
      setDraft('')
      await refetch()
    }
    setSending(false)
  }

  return (
    <CommentsPanel
      comments={items}
      draft={draft}
      isLoading={isLoading}
      isSending={sending}
      subtitle={t`Discuss this request with the approvers`}
      onDraftChange={setDraft}
      onSend={() => void send()}
    />
  )
}
