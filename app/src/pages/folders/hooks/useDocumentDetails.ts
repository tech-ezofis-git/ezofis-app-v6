import { useEffect, useMemo, useState } from 'react'
import authUserStore from '@/stores/authUserStore'
import { folderApi } from '../api/folderApi'
import {
  buildInfoCards,
  type CommentItem,
  type TimelineEvent,
  type WorkspaceDocumentDetail,
} from '../utils/documentDetailsUtils'
import { resolveShareContext } from '../utils/shareContextStorage'

export function useDocumentDetails(repositoryId: string, id: string) {
  const [data, setData] = useState<WorkspaceDocumentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'timeline' | 'comments' | 'relatedDocs'>(
    'timeline',
  )
  const [fileLoadFailed, setFileLoadFailed] = useState(false)

  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineLoaded, setTimelineLoaded] = useState(false)

  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  const { session } = authUserStore.getState()
  const currentUserEmail = session?.email ?? 'me@app.com'

  useEffect(() => {
    let mounted = true

    const loadDetail = async () => {
      if (!repositoryId || !id) return
      setLoading(true)
      setError('')
      setData(null)
      setFileLoadFailed(false)
      setTimeline([])
      setComments([])
      setTimelineLoaded(false)
      setCommentsLoaded(false)
      setTab('timeline')

      try {
        const shareCtx = resolveShareContext(
          authUserStore.getState().shareContext,
        )
        const useShareToken =
          shareCtx &&
          String(shareCtx.sourceItemId) === String(id) &&
          String(shareCtx.sourceRepositoryId) === String(repositoryId)

        const response = await folderApi.getDocumentDetail(
          repositoryId,
          id,
          useShareToken
            ? {
                shareToken: shareCtx.shareToken,
                tenantId: shareCtx.sourceTenantId,
              }
            : undefined,
        )
        if (mounted) setData(response as WorkspaceDocumentDetail)
      } catch (exception: any) {
        if (mounted)
          setError(exception?.message || 'Unable to load document details')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadDetail()
    return () => {
      mounted = false
    }
  }, [repositoryId, id])

  useEffect(() => {
    let mounted = true

    const loadTimeline = async () => {
      if (tab !== 'timeline' || !repositoryId || !id || timelineLoaded) return
      setTimelineLoading(true)

      try {
        const response = await folderApi.getDocumentTimeline(repositoryId, id)
        if (mounted) {
          setTimeline(Array.isArray(response?.events) ? response.events : [])
          setTimelineLoaded(true)
        }
      } catch {
        if (mounted) {
          setTimeline([])
          setTimelineLoaded(true)
        }
      } finally {
        if (mounted) setTimelineLoading(false)
      }
    }

    loadTimeline()
    return () => {
      mounted = false
    }
  }, [tab, repositoryId, id, timelineLoaded])

  useEffect(() => {
    let mounted = true

    const loadComments = async () => {
      if (tab !== 'comments' || !repositoryId || !id || commentsLoaded) return
      setCommentsLoading(true)

      try {
        const response = await folderApi.getDocumentComments(repositoryId, id, {
          page: 1,
          pageSize: 50,
        })
        if (mounted) {
          setComments(
            Array.isArray(response?.comments) ? response.comments : [],
          )
          setCommentsLoaded(true)
        }
      } catch {
        if (mounted) {
          setComments([])
          setCommentsLoaded(true)
        }
      } finally {
        if (mounted) setCommentsLoading(false)
      }
    }

    loadComments()
    return () => {
      mounted = false
    }
  }, [tab, repositoryId, id, commentsLoaded])

  const saveComment = async () => {
    const value = commentText.trim()
    if (!value || savingComment) return

    setSavingComment(true)
    try {
      await folderApi.addDocumentComment(repositoryId, id, {
        body: commentText.trim(),
      })
      setCommentText('')
      setCommentsLoaded(false)
      setTab('comments')
    } finally {
      setSavingComment(false)
    }
  }

  const infoCards = useMemo(() => buildInfoCards(data), [data])
  const lineItems = Array.isArray(data?.lineItems) ? data.lineItems : []
  const hasLineItems = lineItems.length > 0
  const hasValidFileUrl = Boolean(data?.fileUrl) && !fileLoadFailed

  return {
    comments,
    commentsLoading,
    commentText,
    currentUserEmail,
    data,
    error,
    fileLoadFailed,
    hasLineItems,
    hasValidFileUrl,
    infoCards,
    lineItems,
    loading,
    saveComment,
    savingComment,
    tab,
    timeline,
    timelineLoading,
    setCommentText,
    setFileLoadFailed,
    setTab,
  }
}
