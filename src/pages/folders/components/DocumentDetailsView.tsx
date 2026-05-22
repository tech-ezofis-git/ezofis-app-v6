import { useEffect, useState } from 'react'
import type { DocumentDetail } from '../types/folderTypes'
import { folderApi } from '../api/folderApi'
import { DynamicIcon } from './icons'
import { Button, Card, PrimaryButton, StatusPill } from './Ui'

export function DocumentDetailsView({
  id,
  onAiSummary,
  onBack,
  onEdit,
  onShare,
  onWorkflow,
}: {
  id: string
  onAiSummary: () => void
  onBack: () => void
  onEdit: () => void
  onShare: () => void
  onWorkflow: () => void
}) {
  const [data, setData] = useState<DocumentDetail | null>(null)
  const [tab, setTab] = useState<'timeline' | 'comments' | 'relatedDocs'>(
    'timeline',
  )
  const [fileLoadFailed, setFileLoadFailed] = useState(false)

  useEffect(() => {
    folderApi.getDocumentDetail(id).then(setData)
  }, [id])

  if (!data) {
    return (
      <div className='p-6 text-[13px] text-gray-10'>Loading document...</div>
    )
  }

  const hasValidFileUrl = Boolean(data.fileUrl) && !fileLoadFailed

  const tabs = [
    { icon: 'clock', key: 'timeline', label: 'Timeline' },
    { icon: 'messageSquare', key: 'comments', label: 'Comments (2)' },
    { icon: 'paperclip', key: 'relatedDocs', label: 'Related Docs' },
  ] as const

  const openFile = () => {
    if (!data.fileUrl) return
    window.open(data.fileUrl, '_blank', 'noopener,noreferrer')
  }

  const printFile = () => {
    if (!data.fileUrl) return

    const printWindow = window.open(
      data.fileUrl,
      '_blank',
      'noopener,noreferrer',
    )

    if (printWindow) {
      printWindow.onload = () => {
        printWindow.focus()
        printWindow.print()
      }
    }
  }

  return (
    <div className='animate-in fade-in flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-[13px] text-gray-11 duration-300'>
      <div className='no-print flex h-[60px] shrink-0 items-center gap-2 border-b border-gray-3 bg-surface-primary px-5'>
        <Button
          className='h-8 border-transparent px-3 text-[13px] shadow-none'
          onClick={onBack}
        >
          ← Back
        </Button>

        <PrimaryButton className='h-8 px-3 text-[13px]'>
          <DynamicIcon className='h-4 w-4' name='download' />
          Download
        </PrimaryButton>

        <Button className='h-8 px-3 text-[13px]' onClick={onEdit}>
          <DynamicIcon className='h-4 w-4' name='edit' />
          Edit Metadata
        </Button>

        <Button className='h-8 px-3 text-[13px]' onClick={onAiSummary}>
          <DynamicIcon className='h-4 w-4 text-violet-9' name='bot' />
          AI Summary
        </Button>

        <Button className='h-8 px-3 text-[13px]' onClick={onShare}>
          <DynamicIcon className='h-4 w-4' name='share' />
          Share
        </Button>

        <Button className='h-8 px-3 text-[13px]' onClick={onWorkflow}>
          <DynamicIcon className='h-4 w-4' name='check' />
          Start Workflow
        </Button>

        {/* <Button onClick={printFile} className="h-8 px-3 text-[13px]">
          <DynamicIcon name="printer" className="h-4 w-4" />
          Print
        </Button> */}
      </div>

      <div className='ez-detail-scroll min-h-0 flex-1 overflow-y-auto p-5'>
        <div className='grid grid-cols-[minmax(0,1fr)_400px] gap-5'>
          <main className='min-w-0 space-y-4'>
            {data.alert ? (
              <div className='flex items-center justify-between rounded-xl border border-orange-5 bg-orange-2 px-4 py-3'>
                <div className='flex items-start gap-3'>
                  <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-3'>
                    <DynamicIcon
                      className='h-4 w-4 text-orange-10'
                      name='clock'
                    />
                  </div>

                  <div>
                    <b className='text-[14px] font-semibold text-orange-11'>
                      {data.alert.title}
                    </b>

                    <p className='mt-0.5 text-[12px] text-orange-10'>
                      {data.alert.subtitle}
                    </p>
                  </div>
                </div>

                <div className='inline-flex h-7 min-w-[38px] items-center justify-center rounded-full bg-orange-9 px-3 text-[11px] font-bold text-white shadow-sm'>
                  {data.alert.badge}
                </div>
              </div>
            ) : null}

            <Card className='overflow-hidden'>
              <div className='flex items-center justify-between border-b border-gray-3 px-5 py-4'>
                <div className='flex min-w-0 items-center gap-3'>
                  <DynamicIcon
                    className='h-5 w-5 shrink-0 text-red-8'
                    name='fileText'
                  />

                  <b className='truncate text-[16px] font-semibold text-gray-13'>
                    {data.fileName}
                  </b>

                  <span className='inline-flex w-fit rounded-lg bg-gray-2 px-2 py-1 text-[11px] font-bold whitespace-nowrap text-gray-11'>
                    {data.fileType}
                  </span>
                </div>

                <div className='flex shrink-0 items-center gap-5'>
                  <button
                    className='inline-flex items-center gap-2 text-[13px] font-semibold text-gray-11 transition-all hover:text-blue-11 active:scale-95'
                    type='button'
                    onClick={openFile}
                  >
                    <DynamicIcon className='h-4 w-4' name='externalLink' />
                    Open
                  </button>

                  <button
                    className='inline-flex items-center gap-2 text-[13px] font-semibold text-gray-11 transition-all hover:text-blue-11 active:scale-95'
                    type='button'
                    onClick={printFile}
                  >
                    <DynamicIcon className='h-4 w-4' name='printer' />
                    Print
                  </button>
                </div>
              </div>

              <div className='ez-detail-scroll h-[560px] overflow-y-auto bg-gray-1'>
                {hasValidFileUrl ? (
                  <iframe
                    className='h-full min-h-[560px] w-full border-0'
                    src={data.fileUrl}
                    title={data.fileName}
                    onError={() => setFileLoadFailed(true)}
                  />
                ) : (
                  <DummyDocumentPreview
                    fileName={data.fileName}
                    fileType={data.fileType}
                  />
                )}
              </div>
            </Card>

            <Card className='p-5'>
              <h3 className='mb-4 text-[15px] font-semibold text-gray-13'>
                Invoice Line Items
              </h3>

              <div className='overflow-x-auto'>
                <table className='w-full text-[13px]'>
                  <thead>
                    <tr className='border-b border-gray-3 text-left text-gray-10'>
                      {Object.keys(data.lineItems[0] || {}).map((key) => (
                        <th className='py-3 font-medium' key={key}>
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {data.lineItems.map((row, rowIndex) => (
                      <tr
                        className='border-b border-gray-3 last:border-0'
                        key={rowIndex}
                      >
                        {Object.values(row).map((value, valueIndex) => (
                          <td
                            className='py-3 font-medium text-gray-13'
                            key={valueIndex}
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className='flex w-fit gap-1 rounded-xl bg-gray-2 p-1'>
              {tabs.map((item) => (
                <button
                  key={item.key}
                  className={`inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-all active:scale-95 ${
                    tab === item.key
                      ? 'bg-surface-primary text-gray-13 shadow-sm ring-1 ring-gray-3'
                      : 'text-gray-10 hover:bg-gray-4 hover:text-gray-12'
                  }`}
                  onClick={() => setTab(item.key)}
                >
                  <DynamicIcon className='h-4 w-4' name={item.icon} />
                  {item.label}
                </button>
              ))}
            </div>

            <Card className='min-h-[260px] p-5'>
              {tab === 'timeline' && (
                <div className='space-y-4'>
                  {data.tabs.timeline.map((item, index) => {
                    const iconStyle =
                      index === 0
                        ? 'bg-blue-3 text-blue-11'
                        : index === 1
                          ? 'bg-violet-3 text-violet-11'
                          : index === 4
                            ? 'bg-yellow-3 text-yellow-11'
                            : 'bg-green-3 text-green-11'

                    return (
                      <div className='flex gap-3' key={index}>
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconStyle}`}
                        >
                          <DynamicIcon
                            className='h-4 w-4'
                            name={item.iconKey}
                          />
                        </span>

                        <div>
                          <b className='text-[13px] font-semibold text-gray-13'>
                            {item.title}
                          </b>
                          <p className='mt-0.5 text-[12px] text-gray-10'>
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {tab === 'comments' && (
                <div className='space-y-4'>
                  {data.tabs.comments.map((item) => (
                    <div className='flex gap-3' key={item.author}>
                      <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-3 text-[12px] font-semibold text-blue-11'>
                        {item.author[0]}
                      </span>

                      <div>
                        <b className='text-[13px] font-semibold text-gray-13'>
                          {item.author}
                        </b>
                        <span className='ml-3 text-[12px] text-gray-10'>
                          {item.date}
                        </span>
                        <p className='mt-1 text-[13px] text-gray-10'>
                          {item.message}
                        </p>
                      </div>
                    </div>
                  ))}

                  <div className='flex gap-3 border-t border-gray-3 pt-4'>
                    <input
                      className='h-9 flex-1 rounded-lg border border-gray-3 px-3 text-[13px] transition-all outline-none focus:border-blue-8'
                      placeholder='Add a comment...'
                    />
                    <PrimaryButton className='h-9 px-4 text-[13px]'>
                      Post
                    </PrimaryButton>
                  </div>
                </div>
              )}

              {tab === 'relatedDocs' && (
                <div className='space-y-1'>
                  {data.tabs.relatedDocs.map((item) => (
                    <div
                      className='flex items-center justify-between rounded-lg px-2 py-3 transition-all hover:bg-gray-2'
                      key={item.name}
                    >
                      <div className='flex items-center gap-3'>
                        <DynamicIcon
                          className='h-5 w-5 text-gray-9'
                          name='fileText'
                        />
                        <div>
                          <b className='text-[13px] font-semibold text-gray-13'>
                            {item.name}
                          </b>
                          <p className='text-[12px] text-gray-10'>
                            {item.type}
                          </p>
                        </div>
                      </div>

                      <StatusPill status={item.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </main>

          <aside className='min-w-0 space-y-4'>
            {data.infoCards.map((card) => (
              <Card className='p-5' key={card.id}>
                <h3 className='mb-4 flex items-center gap-2 text-[15px] font-semibold text-gray-13'>
                  <DynamicIcon
                    className='h-4 w-4 text-blue-11'
                    name={card.iconKey}
                  />
                  {card.title}
                </h3>

                <div>
                  {card.rows.map((row) => (
                    <div
                      className='flex justify-between gap-4 border-b border-gray-3 py-2.5 last:border-0'
                      key={row.label}
                    >
                      <span className='text-[13px] text-gray-10'>
                        {row.label}
                      </span>
                      <b className='text-right text-[13px] font-semibold text-gray-13'>
                        {row.value}
                      </b>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </aside>
        </div>
      </div>
    </div>
  )
}

function DummyDocumentPreview({
  fileName,
  fileType,
}: {
  fileName: string
  fileType: string
}) {
  return (
    <div className='flex h-full min-h-[560px] items-center justify-center bg-blue-3/30'>
      <div className='text-center'>
        <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-gray-3 bg-surface-primary shadow-sm'>
          <DynamicIcon className='h-8 w-8 text-red-8' name='fileText' />
        </div>

        <p className='mt-4 text-[14px] font-semibold text-gray-10'>
          {fileName}
        </p>

        <p className='mt-2 text-[12px] text-gray-10'>
          {fileType} Viewer — 1 page · 245 KB
        </p>

        <Button className='mt-4 h-8 px-3 text-[12px]'>
          <DynamicIcon className='h-4 w-4' name='eye' />
          Preview Document
        </Button>
      </div>
    </div>
  )
}
