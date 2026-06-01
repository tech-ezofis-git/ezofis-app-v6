import { useEffect, useMemo, useState } from 'react'
import { folderApi } from '../api/folderApi'
import { Button, Card, PrimaryButton, StatusPill } from './Ui'
import { DynamicIcon } from './icons'
import authUserStore from '@/stores/authUserStore'

type DetailField = { key?: string; label?: string; value?: any }
type DetailSection = { sectionKey?: string; title?: string; fields?: DetailField[] | null }
type DetailCard = { id: string; title: string; iconKey: string; rows: Array<{ label: string; value: string }> }

type WorkspaceDocumentDetail = {
  documentId?: string
  fileName: string
  fileType: string
  fileUrl?: string
  DetailsRow?: DetailSection[] | null
  infoCards?: DetailCard[]
  lineItems?: Array<Record<string, any>> | null
  alert?: { title: string; subtitle: string; badge: string } | null
}

type TimelineEvent = {
  id?: string
  eventType?: string
  title: string
  description?: string | null
  actorType?: string
  actorName?: string
  createdAtUtc?: string
  isDerived?: boolean
}

type CommentItem = {
  id?: string
  author?: string
  authorName?: string
  actorName?: string
  createdAtUtc?: string
  date?: string
  message?: string
  comment?: string
  text?: string
  body?: string
  authorUserId?: string
}

type RelatedDoc = { name: string; type: string; status?: string }

const sectionIconMap: Record<string, string> = {
  documentInfo: 'fileText',
  supplierDetails: 'fileText',
  aiAnalysis: 'bot',
  systemInfo: 'clock',
}

const eventIconMap: Record<string, string> = {
  system: 'fileText',
  ai: 'bot',
  workflow: 'check',
  comment: 'messageSquare',
  user: 'clock',
}

const toDisplayValue = (value: any) => {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

const formatDateTime = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const buildInfoCards = (data: WorkspaceDocumentDetail | null): DetailCard[] => {
  if (!data) return []
  if (Array.isArray(data.infoCards) && data.infoCards.length > 0) return data.infoCards

  const sections = Array.isArray(data.DetailsRow) ? data.DetailsRow : []

  return sections
    .filter((section) => Array.isArray(section.fields) && section.fields.length > 0)
    .map((section, index) => ({
      id: section.sectionKey || `section-${index}`,
      title: section.title || section.sectionKey || `Section ${index + 1}`,
      iconKey: sectionIconMap[section.sectionKey || ''] || 'fileText',
      rows: (section.fields || [])
        .filter((field) => field && field.value !== null && field.value !== undefined && field.value !== '')
        .map((field) => ({
          label: field.label || field.key || '-',
          value: toDisplayValue(field.value),
        })),
    }))
    .filter((card) => card.rows.length > 0)
}

function DummyDocumentPreview({ fileName, fileType }: { fileName: string; fileType: string }) {
  return (
    <div className="flex h-full min-h-[560px] items-center justify-center bg-blue-3/30">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-gray-3 bg-surface-primary shadow-sm">
          <DynamicIcon name="fileText" className="h-8 w-8 text-red-8" />
        </div>
        <p className="mt-4 text-[14px] font-semibold text-gray-10">{fileName}</p>
        <p className="mt-2 text-[12px] text-gray-10">{fileType} Viewer</p>
      </div>
    </div>
  )
}

function NoDataState({
  icon = 'paperclip',
  title,
  description,
}: {
  icon?: string
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[260px] items-center justify-center px-6 py-12 text-center">
      <div className="max-w-[520px]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-primary shadow-sm">
            <DynamicIcon name={icon} className="h-7 w-7 text-gray-10" />
          </div>
        </div>
        <h3 className="mt-5 text-[16px] font-bold text-gray-13">{title}</h3>
        <p className="mt-2 text-[14px] leading-6 text-gray-10">{description}</p>
      </div>
    </div>
  )
}

export function DocumentDetailsView({
  id,
  repositoryId,
  onBack,
  onEdit,
  onAiSummary,
  onShare,
  onWorkflow,
}: {
  id: string
  repositoryId: string
  onBack: () => void
  onEdit: () => void
  onAiSummary: () => void
  onShare: () => void
  onWorkflow: () => void
}) {
  const [data, setData] = useState<WorkspaceDocumentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'timeline' | 'comments' | 'relatedDocs'>('timeline')
  const [fileLoadFailed, setFileLoadFailed] = useState(false)

  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineLoaded, setTimelineLoaded] = useState(false)

  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const fileUrl = "https://demo.ezofis.com/v6api"
  const relatedDocs: RelatedDoc[] = []
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
        const response = await folderApi.getDocumentDetail(repositoryId, id)
        if (mounted) setData(response as WorkspaceDocumentDetail)
      } catch (exception: any) {
        if (mounted) setError(exception?.message || 'Unable to load document details')
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
        const response = await folderApi.getDocumentComments(repositoryId, id, { page: 1, pageSize: 50 })
        if (mounted) {
          setComments(Array.isArray(response?.comments) ? response.comments : [])
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

  const tabs = [
    { key: 'timeline', label: 'Timeline', icon: 'clock', count: timeline.length },
    { key: 'comments', label: 'Comments', icon: 'messageSquare', count: comments.length },
    { key: 'relatedDocs', label: 'Related Docs', icon: 'paperclip', count: relatedDocs.length },
  ] as const

  if (loading) return <div className="p-6 text-[13px] text-gray-10">Loading document...</div>

  if (error) {
    return (
      <div className="p-6">
        <Button onClick={onBack} className="mb-4 h-8 border-transparent px-3 text-[13px] shadow-none">← Back</Button>
        <div className="rounded-xl border border-red-4 bg-red-1 p-4 text-sm font-semibold text-red-10">{error}</div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-[13px] text-gray-11 animate-in fade-in duration-300">
      <div className="flex h-[60px] shrink-0 items-center gap-2 border-b border-gray-3 bg-surface-primary px-5 no-print">
        <Button onClick={onBack} className="h-8 border-transparent px-3 text-[13px] shadow-none">← Back</Button>
        <PrimaryButton className="h-8 px-3 text-[13px]"><DynamicIcon name="download" className="h-4 w-4" />Download</PrimaryButton>
        <Button onClick={onEdit} className="h-8 px-3 text-[13px]"><DynamicIcon name="edit" className="h-4 w-4" />Edit Metadata</Button>
        <Button onClick={onAiSummary} className="h-8 px-3 text-[13px]"><DynamicIcon name="bot" className="h-4 w-4 text-violet-9" />AI Summary</Button>
        <Button onClick={onShare} className="h-8 px-3 text-[13px]"><DynamicIcon name="share" className="h-4 w-4" />Share</Button>
        <Button onClick={onWorkflow} className="h-8 px-3 text-[13px]"><DynamicIcon name="check" className="h-4 w-4" />Start Workflow</Button>
      </div>

      <div className="ez-detail-scroll min-h-0 flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_400px] gap-5">
          <main className="min-w-0 space-y-4">
            {data.alert ? (
              <div className="flex items-center justify-between rounded-xl border border-orange-5 bg-orange-2 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-3"><DynamicIcon name="clock" className="h-4 w-4 text-orange-10" /></div>
                  <div><b className="text-[14px] font-semibold text-orange-11">{data.alert.title}</b><p className="mt-0.5 text-[12px] text-orange-10">{data.alert.subtitle}</p></div>
                </div>
                <div className="inline-flex h-7 min-w-[38px] items-center justify-center rounded-full bg-orange-9 px-3 text-[11px] font-bold text-white shadow-sm">{data.alert.badge}</div>
              </div>
            ) : null}

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <DynamicIcon name="fileText" className="h-5 w-5 shrink-0 text-red-8" />
                  <b className="truncate text-[16px] font-semibold text-gray-13">{data.fileName}</b>
                  <span className="inline-flex w-fit whitespace-nowrap rounded-lg bg-gray-2 px-2 py-1 text-[11px] font-bold text-gray-11">{data.fileType}</span>
                </div>
              </div>

              <div className="ez-detail-scroll h-[560px] overflow-y-auto bg-gray-1">
                {hasValidFileUrl ? (
                  <iframe title={data.fileName} src={`${fileUrl}${data.fileUrl}#zoom=120`} className="h-full min-h-[560px] w-full border-0" onError={() => setFileLoadFailed(true)} />
                ) : (
                  <DummyDocumentPreview fileName={data.fileName} fileType={data.fileType} />
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-4 text-[15px] font-semibold text-gray-13">Invoice Line Items</h3>
              {hasLineItems ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-gray-3 text-left text-gray-10">
                        {Object.keys(lineItems[0] || {}).map((key) => <th key={key} className="py-3 font-medium">{key}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-gray-3 last:border-0">
                          {Object.values(row).map((value, valueIndex) => <td key={valueIndex} className="py-3 font-medium text-gray-13">{toDisplayValue(value)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <NoDataState icon="fileText" title="No line items found" description="No invoice line item data is available for this document." />
              )}
            </Card>

            <div className="flex w-fit gap-1 rounded-xl bg-gray-2 p-1">
              {tabs.map((item) => (
                <button key={item.key} onClick={() => setTab(item.key)} className={`inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-all active:scale-95 ${tab === item.key ? 'bg-surface-primary text-gray-13 shadow-sm ring-1 ring-gray-3' : 'text-gray-10 hover:bg-gray-4 hover:text-gray-12'}`}>
                  <DynamicIcon name={item.icon} className="h-4 w-4" />{item.label} {item.count ? `(${item.count})` : ''}
                </button>
              ))}
            </div>

            <Card className="min-h-[320px] p-5">
              {tab === 'timeline' && (
                timelineLoading ? (
                  <div className="py-10 text-center text-[13px] font-semibold text-gray-10">Loading timeline...</div>
                ) : timeline.length ? (
                  <div className="space-y-4">
                    {timeline.map((item, index) => (
                      <div key={`${item.id || item.title}-${index}`} className="flex gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-3 text-blue-11">
                          <DynamicIcon name={eventIconMap[item.eventType || ''] || 'clock'} className="h-4 w-4" />
                        </span>
                        <div>
                          <b className="text-[13px] font-semibold text-gray-13">{item.title}</b>
                          <p className="mt-0.5 text-[12px] text-gray-10">
                            {[item.actorName || item.actorType, formatDateTime(item.createdAtUtc)].filter(Boolean).join(' · ')}
                          </p>
                          {item.description ? <p className="mt-1 text-[13px] text-gray-10">{item.description}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <NoDataState icon="clock" title="No timeline found" description="No activity timeline is available for this document." />
                )
              )}

              {tab === 'comments' && (
                <div className="flex h-[360px] flex-col">
                  <div className="flex-1 overflow-y-auto p-5">
                    {commentsLoading ? (
                      <div className="py-10 text-center text-[13px] font-semibold text-gray-10">
                        Loading comments...
                      </div>
                    ) : comments.length ? (
                      <div className="space-y-4">
                        {comments.map((item, index) => {
                          const author = item.authorName || item.author || item.actorName || 'User'
                          const message = item.body || item.message || item.comment || item.text || ''
                          const isMine = item.authorUserId === currentUserEmail

                          return (
                            <div
                              key={`${item.id || author}-${index}`}
                              className={`flex gap-3 ${isMine ? 'justify-end' : 'justify-start'}`}
                            >
                              {!isMine && (
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-3 text-[12px] font-semibold text-blue-11">
                                  {author.charAt(0).toUpperCase()}
                                </span>
                              )}

                              <div
                                className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${isMine ? 'bg-violet-9 text-white' : 'bg-gray-2 text-gray-13'
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <b className="text-[13px] font-semibold">
                                    {isMine ? 'You' : author}
                                  </b>

                                  <span className={`text-[11px] ${isMine ? 'text-violet-1' : 'text-gray-10'}`}>
                                    {formatDateTime(item.createdAtUtc || item.date)}
                                  </span>
                                </div>

                                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5">
                                  {message}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <NoDataState
                        icon="messageSquare"
                        title="No comments found"
                        description="No comments are available for this document. Add the first comment to start collaboration."
                      />
                    )}
                  </div>

                  <div className="shrink-0 border-t border-gray-3 bg-surface-primary p-4">
                    <div className="flex items-center gap-3">
                      <textarea
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        placeholder="Add a comment..."
                        rows={1}
                        className="h-12 flex-1 resize-none rounded-lg border border-gray-3 bg-white px-4 py-3 text-[13px] text-gray-13 outline-none focus:border-blue-7"
                      />

                      <PrimaryButton
                        onClick={saveComment}
                        disabled={!commentText.trim() || savingComment}
                        className="h-12 shrink-0 px-6 text-[13px]"
                      >
                        {savingComment ? 'Posting...' : 'Post'}
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              )}
              {tab === 'relatedDocs' && (
                relatedDocs.length ? (
                  relatedDocs.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-lg px-2 py-3 transition-all hover:bg-gray-2">
                      <div className="flex items-center gap-3">
                        <DynamicIcon name="fileText" className="h-5 w-5 text-gray-9" />
                        <div><b className="text-[13px] font-semibold text-gray-13">{item.name}</b><p className="text-[12px] text-gray-10">{item.type}</p></div>
                      </div>
                      <StatusPill status={item.status || 'Active'} />
                    </div>
                  ))
                ) : (
                  <NoDataState icon="paperclip" title="Related documents not found" description="No related documents are linked with this file yet." />
                )
              )}
            </Card>
          </main>

          {infoCards.length > 0 ? (
            <aside className="min-w-0 space-y-4">
              {infoCards.map((card) => (
                <Card key={card.id} className="p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-gray-13"><DynamicIcon name={card.iconKey} className="h-4 w-4 text-blue-11" />{card.title}</h3>
                  <div>
                    {card.rows.map((row) => (
                      <div key={`${card.id}-${row.label}`} className="flex justify-between gap-4 border-b border-gray-3 py-2.5 last:border-0">
                        <span className="text-[13px] text-gray-10">{row.label}</span>
                        <b className="text-right text-[13px] font-semibold text-gray-13">{row.value}</b>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  )
}
