import { useLingui } from '@lingui/react/macro'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { useEffect, useRef, useState } from 'react'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import showToast from '@/components/base/toast/showToast'
import type { AiSummaryData } from '../types/folderTypes'
import { folderApi } from '../api/folderApi'
import { DynamicIcon } from './icons'
import { Button, Card } from './Ui'

type AiSummaryViewProps = {
  itemId: string
  repositoryId: string
  onBack: () => void
}

export function AiSummaryView({
  itemId,
  repositoryId,
  onBack,
}: AiSummaryViewProps) {
  const { t } = useLingui()
  const [data, setData] = useState<AiSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const requestIdRef = useRef(0)

  const loadSummary = async (options?: { regenerate?: boolean }) => {
    if (!repositoryId || !itemId) {
      // Keep the loading shell until ids are ready.
      setLoading(true)
      setError('')
      setData(null)
      return
    }

    const isRegenerate = Boolean(options?.regenerate)
    const requestId = ++requestIdRef.current

    if (isRegenerate) setRegenerating(true)
    else setLoading(true)
    setError('')

    try {
      const summary = await folderApi.getAiSummary(repositoryId, itemId, {
        force: isRegenerate,
      })
      if (requestId !== requestIdRef.current) return

      setData(summary)
      setError('')
      if (isRegenerate) {
        showToast({
          message: summary.creditConsumed
            ? t`AI summary regenerated.`
            : t`Showing cached AI summary.`,
          variant: 'success',
        })
      }
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return

      const message = String(err?.message || t`Failed to load AI summary.`)
      // Cancelled/superseded requests should not surface as hard failures.
      if (/cancel/i.test(message) || err?.code === 'ERR_CANCELED') {
        return
      }

      setError(message)
      if (isRegenerate || data) {
        showToast({ message, variant: 'error' })
      } else {
        setData(null)
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
        setRegenerating(false)
      }
    }
  }

  useEffect(() => {
    void loadSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, repositoryId])

  const copySummary = async () => {
    if (!data) return
    const text = [
      data.summary,
      '',
      ...data.facts.map((fact) => `${fact.label}: ${fact.value}`),
      '',
      data.insight,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      await navigator.clipboard.writeText(text || data.rawOutput || '')
      showToast({ message: t`Copied to clipboard`, variant: 'success' })
    } catch {
      showToast({ message: t`Unable to copy summary`, variant: 'error' })
    }
  }

  const exportPdf = async () => {
    const element = ref.current
    if (!element || exporting) return

    try {
      setExporting(true)

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        windowHeight: element.scrollHeight,
        windowWidth: element.scrollWidth,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgHeight = (canvas.height * pageWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save('AI-Summary.pdf')
    } finally {
      setExporting(false)
    }
  }

  const showLoading = loading || regenerating || (!data && !error)

  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-[14px] text-gray-11'>
      <div className='no-print flex h-[60px] shrink-0 items-center gap-3 border-b border-gray-3 bg-surface-primary px-5'>
        <Button
          className='h-9 border-gray-3 px-4 text-[14px] shadow-sm'
          onClick={onBack}
        >
          ← {t`Back`}
        </Button>
       
        <Button
          className='h-9 px-4 text-[14px]'
          disabled={exporting || !data || loading || regenerating}
          onClick={exportPdf}
        >
          {exporting ? (
            <DynamicIcon className='h-4 w-4 animate-spin' name='loader' />
          ) : (
            <DynamicIcon className='h-4 w-4' name='download' />
          )}
          {exporting ? t`Exporting...` : t`Export PDF`}
        </Button>
      </div>

      {showLoading ? (
        <AiSummaryLoading />
      ) : error && !data ? (
        <AiSummaryLoading
          error={error}
          onBack={onBack}
          onRetry={() => void loadSummary()}
        />
      ) : data ? (
        <div
          className='ez-ai-scroll min-h-0 flex-1 overflow-y-auto px-6 py-7'
          ref={ref}
        >
          <div className='print-area mx-auto w-full max-w-[1060px] space-y-5'>
            <section className='animate-in fade-in zoom-in-95 flex items-center justify-between rounded-xl border border-violet-4 bg-gradient-to-r from-violet-3 to-blue-3 px-5 py-4 duration-500'>
              <div className='flex items-center gap-3'>
                <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-violet-9 text-white'>
                  <DynamicIcon className='h-5 w-5' name='bot' />
                </span>
                <div>
                  <h2 className='text-[17px] leading-6 font-semibold text-gray-13'>
                    {data.engineTitle || t`EZOFIS AI Summary`}
                  </h2>
                  <p className='text-[13px] leading-5 text-gray-10'>
                    {data.engineSubtitle}
                  </p>
                </div>
              </div>
              <div className='text-right'>
                <p className='text-[13px] text-gray-10'>{t`Confidence`}</p>
                <b className='text-[28px] leading-8 text-green-9'>
                  {data.confidence}%
                </b>
              </div>
            </section>

            <Card className='animate-in fade-in slide-in-from-bottom-2 p-5 duration-500'>
              <h3 className='mb-4 flex items-center gap-2 text-[17px] font-semibold text-gray-13'>
                <AiBrandIcon className='size-5 text-violet-9' />
                {t`Document Summary`}
              </h3>
              {data.summary ? (
                <TypewriterText text={data.summary} />
              ) : (
                <p className='text-[14px] text-gray-10'>
                  {t`No document summary available.`}
                </p>
              )}
            </Card>

            <Card className='animate-in fade-in slide-in-from-bottom-2 p-5 duration-500'>
              <h3 className='mb-4 flex items-center gap-2 text-[17px] font-semibold text-gray-13'>
                <DynamicIcon className='h-5 w-5 text-blue-11' name='zap' />
                {t`Key Facts Extracted`}
              </h3>
              {data.facts.length > 0 ? (
                <div className='grid grid-cols-2 gap-3'>
                  {data.facts.map((fact) => (
                    <div
                      className='flex gap-3 rounded-xl border border-gray-3 px-4 py-3 transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-[0.99]'
                      key={`${fact.label}-${fact.value}`}
                    >
                      <DynamicIcon
                        className='mt-0.5 h-5 w-5 shrink-0 text-green-9'
                        name='check'
                      />
                      <div>
                        {/* <p className='text-[13px] leading-5 text-gray-13'>
                          {fact.label}
                        </p> */}
                        <p className=' text-[14px] leading-5 text-gray-10'>
                          {fact.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-[14px] text-gray-10'>
                  {t`No key facts extracted.`}
                </p>
              )}
            </Card>

            <Card className='animate-in fade-in slide-in-from-bottom-2 p-5 duration-500'>
              <div className='mb-4 flex items-center justify-between'>
                <h3 className='flex items-center gap-2 text-[17px] font-semibold text-gray-13'>
                  <DynamicIcon
                    className='h-5 w-5 text-green-11'
                    name='shield'
                  />
                  {t`Compliance & Risk Assessment`}
                </h3>
              </div>
              {data.checks.length > 0 ? (
                <div className='grid grid-cols-4 gap-3'>
                  {data.checks.map((check) => (
                    <div
                      className='flex min-h-[100px] flex-col items-center justify-center rounded-xl border border-green-5 bg-green-3 p-4 text-center text-green-11 transition-all hover:bg-green-4 active:scale-[0.99]'
                      key={`${check.label}-${check.status}`}
                    >
                      <DynamicIcon
                        className='mb-2 h-6 w-6'
                        name={check.iconKey}
                      />
                      <b className='text-[13px] leading-5'>{check.label}</b>
                      <span className='mt-2 inline-flex w-fit items-center rounded-full bg-green-9 px-2 py-1 text-[11px] leading-none font-bold whitespace-nowrap text-white'>
                        {check.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : data.complianceText ? (
                <p className='text-[14px] leading-6 text-gray-13'>
                  {data.complianceText}
                </p>
              ) : (
                <p className='text-[14px] text-gray-10'>
                  {t`No compliance assessment available.`}
                </p>
              )}
            </Card>

            <Card className='animate-in fade-in slide-in-from-bottom-2 p-5 duration-500'>
              <h3 className='mb-4 flex items-center gap-2 text-[17px] font-semibold text-gray-13'>
                <AiBrandIcon className='size-5 text-orange-9' />
                {t`AI Recommendations`}
              </h3>
              {data.recommendations.length > 0 ? (
                <div className='space-y-3'>
                  {data.recommendations.map((recommendation) => (
                    <div
                      className='rounded-xl border border-orange-5 bg-orange-3 px-4 py-3 text-[14px] text-gray-13 transition-all hover:bg-orange-4'
                      key={recommendation}
                    >
                      › {recommendation}
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-[14px] text-gray-10'>
                  {t`No recommendations available.`}
                </p>
              )}
            </Card>

            <div className='animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-blue-5 bg-blue-3 p-4 text-[14px] text-blue-11 duration-500'>
              <b>{t`Supplier Trend Insight`}</b>
              <p className='mt-1 text-gray-10'>
                {data.insight || t`No supplier trend insight available.`}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function AiSummaryLoading({
  error,
  onBack,
  onRetry,
}: {
  error?: string
  onBack?: () => void
  onRetry?: () => void
} = {}) {
  const { t } = useLingui()
  const hasError = Boolean(error)

  return (
    <div className='ez-ai-scroll min-h-0 flex-1 overflow-y-auto bg-surface-secondary px-6 py-7 text-[14px] text-gray-11'>
      <div className='mx-auto w-full max-w-[1060px] space-y-5'>
        <div className='rounded-xl border border-violet-4 bg-gradient-to-r from-violet-3 to-blue-3 p-5'>
          <div className='mb-4 flex items-center gap-3'>
            <span className='flex h-11 w-11 animate-pulse items-center justify-center rounded-xl bg-violet-9 text-white'>
              <DynamicIcon className='h-5 w-5' name='bot' />
            </span>
            <div className='flex-1 space-y-2'>
              <div className='h-3.5 w-48 animate-pulse rounded-full bg-violet-5' />
              <div className='h-3 w-2/3 animate-pulse rounded-full bg-blue-5' />
            </div>
          </div>
          <div className='h-1.5 overflow-hidden rounded-full bg-surface-primary'>
            <div
              className={
                hasError
                  ? 'h-full w-1/3 rounded-full bg-violet-6'
                  : 'ez-ai-progress h-full rounded-full bg-violet-9'
              }
            />
          </div>
        </div>

        <Card className='flex min-h-[168px] flex-col items-center justify-center gap-3 p-5'>
          {hasError ? (
            <>
              <div className='text-center'>
                <p className='text-[14px] font-semibold text-gray-13'>
                  {t`Unable to load AI summary`}
                </p>
                <p className='mt-1 text-[13px] text-gray-10'>{error}</p>
              </div>
              <div className='mt-2 flex items-center gap-2'>
                {onBack ? (
                  <Button className='h-9 px-4' onClick={onBack}>
                    {t`Back`}
                  </Button>
                ) : null}
                {onRetry ? (
                  <Button className='h-9 px-4' onClick={onRetry}>
                    {t`Retry`}
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className='h-10 w-10 animate-spin rounded-full border-4 border-violet-3 border-t-violet-9' />
              <div className='text-center'>
                <p className='text-[14px] font-semibold text-gray-13'>
                  {t`AI is analysing the document...`}
                </p>
                <p className='mt-1 text-[13px] text-gray-10'>
                  {t`Extracting metadata, checking duplicates, validating compliance`}
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function TypewriterText({ text }: { text: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(0)
    const timer = window.setInterval(() => {
      setCount((prev) => {
        if (prev >= text.length) {
          window.clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, 18)

    return () => window.clearInterval(timer)
  }, [text])

  return (
    <p className='text-[15px] leading-7 text-gray-13'>
      {text.slice(0, count)}
      {count < text.length && (
        <span className='ml-0.5 inline-block h-5 w-[2px] translate-y-1 animate-pulse bg-gray-13' />
      )}
    </p>
  )
}
