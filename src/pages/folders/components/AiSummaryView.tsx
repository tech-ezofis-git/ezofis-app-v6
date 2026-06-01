import { useEffect, useRef, useState } from 'react'
import { folderApi } from '../api/folderApi'
import type { AiSummaryData } from '../types/folderTypes'
import { Button, Card } from './Ui'
import { DynamicIcon } from './icons'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

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
    <p className="text-[15px] leading-7 text-gray-13">
      {text.slice(0, count)}
      {count < text.length && (
        <span className="ml-0.5 inline-block h-5 w-[2px] translate-y-1 animate-pulse bg-gray-13" />
      )}
    </p>
  )
}

function AiSummaryLoading() {
  return (
    <div className="ez-ai-scroll min-h-0 flex-1 overflow-y-auto bg-surface-secondary px-6 py-7 text-[14px] text-gray-11">
      <div className="mx-auto w-full max-w-[1060px] space-y-5">
        <div className="rounded-xl border border-violet-4 bg-gradient-to-r from-violet-3 to-blue-3 p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl bg-violet-9 text-white">
              <DynamicIcon name="bot" className="h-5 w-5" />
            </span>
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-48 animate-pulse rounded-full bg-violet-5" />
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-blue-5" />
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-primary">
            <div className="ez-ai-progress h-full rounded-full bg-violet-9" />
          </div>
        </div>

        <Card className="flex h-[168px] flex-col items-center justify-center gap-3 p-5">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-3 border-t-violet-9" />
          <div className="text-center">
            <p className="text-[14px] font-semibold text-gray-13">AI is analysing the document...</p>
            <p className="mt-1 text-[13px] text-gray-10">Extracting metadata, checking duplicates, validating compliance</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function AiSummaryView({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<AiSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  useEffect(() => {
    let mounted = true
    Promise.all([
      folderApi.getAiSummary(),
      new Promise((resolve) => window.setTimeout(resolve, 1100)),
    ]).then(([summary]) => {
      if (!mounted) return
      setData(summary as AiSummaryData)
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [])

  const exportPdf = async () => {
    const element = ref.current
    if (!element || exporting) return

    try {
      setExporting(true)

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
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


  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-[14px] text-gray-11">
      <div className="flex h-[60px] shrink-0 items-center gap-3 border-b border-gray-3 bg-surface-primary px-5 no-print">
        <Button onClick={onBack} className="h-9 border-gray-3 px-4 text-[14px] shadow-sm">← Back</Button>
        <Button className="h-9 px-4 text-[14px]"><DynamicIcon name="refresh" className="h-4 w-4" />Regenerate</Button>
        <Button className="h-9 px-4 text-[14px]"><DynamicIcon name="copy" className="h-4 w-4" />Copy</Button>
        <Button
          onClick={exportPdf}
          disabled={exporting}
          className="h-9 px-4 text-[14px]"
        >
          {exporting ? (
            <DynamicIcon name="loader" className="h-4 w-4 animate-spin" />) : (
            <DynamicIcon name="download" className="h-4 w-4" />
          )}
          {exporting ? 'Exporting...' : 'Export PDF'}
        </Button>      </div>
      {loading || !data ? (<AiSummaryLoading />) :
        (<div ref={ref} className="ez-ai-scroll min-h-0 flex-1 overflow-y-auto px-6 py-7">
          <div className="print-area mx-auto w-full max-w-[1060px] space-y-5">
            <section className="flex items-center justify-between rounded-xl border border-violet-4 bg-gradient-to-r from-violet-3 to-blue-3 px-5 py-4 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-9 text-white">
                  <DynamicIcon name="bot" className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-[17px] font-semibold leading-6 text-gray-13">
                    {data.engineTitle}
                    <span className="ml-2 inline-flex w-fit items-center whitespace-nowrap rounded-md border border-violet-5 bg-surface-primary px-2 py-0.5 text-[11px] font-medium text-violet-11">
                      GPT-4o Powered
                    </span>
                  </h2>
                  <p className="text-[13px] leading-5 text-gray-10">{data.engineSubtitle}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[13px] text-gray-10">Confidence</p>
                <b className="text-[28px] leading-8 text-green-9">{data.confidence}%</b>
              </div>
            </section>

            <Card className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h3 className="mb-4 flex items-center gap-2 text-[17px] font-semibold text-gray-13">
                <DynamicIcon name="sparkles" className="h-5 w-5 text-violet-9" />
                Document Summary
              </h3>
              <TypewriterText text={data.summary} />
            </Card>

            <Card className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h3 className="mb-4 flex items-center gap-2 text-[17px] font-semibold text-gray-13">
                <DynamicIcon name="zap" className="h-5 w-5 text-blue-11" />
                Key Facts Extracted
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {data.facts.map((fact) => (
                  <div key={fact.label} className="flex gap-3 rounded-xl border border-gray-3 px-4 py-3 transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-[0.99]">
                    <DynamicIcon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-green-9" />
                    <div>
                      <p className="text-[13px] leading-5 text-gray-10">{fact.label}</p>
                      <b className="text-[14px] leading-5 text-gray-13">{fact.value}</b>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-[17px] font-semibold text-gray-13">
                  <DynamicIcon name="shield" className="h-5 w-5 text-green-11" />
                  Compliance & Risk Assessment
                </h3>
                {/* <span className="inline-flex w-fit items-center whitespace-nowrap rounded-lg border border-green-6 bg-green-3 px-3 py-1 text-[12px] font-semibold text-green-11">
                  All Clear
                </span> */}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {data.checks.map((check) => (
                  <div key={check.label} className="flex min-h-[100px] flex-col items-center justify-center rounded-xl border border-green-5 bg-green-3 p-4 text-center text-green-11 transition-all hover:bg-green-4 active:scale-[0.99]">
                    <DynamicIcon name={check.iconKey} className="mb-2 h-6 w-6" />
                    <b className="text-[13px] leading-5">{check.label}</b>
                    <span className="mt-2 inline-flex w-fit items-center whitespace-nowrap rounded-full bg-green-9 px-2 py-1 text-[11px] font-bold leading-none text-white">
                      {check.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h3 className="mb-4 flex items-center gap-2 text-[17px] font-semibold text-gray-13">
                <DynamicIcon name="sparkles" className="h-5 w-5 text-orange-9" />
                AI Recommendations
              </h3>
              <div className="space-y-3">
                {data.recommendations.map((recommendation) => (
                  <div key={recommendation} className="rounded-xl border border-orange-5 bg-orange-3 px-4 py-3 text-[14px] text-gray-13 transition-all hover:bg-orange-4">
                    › {recommendation}
                  </div>
                ))}
              </div>
            </Card>

            <div className="rounded-xl border border-blue-5 bg-blue-3 p-4 text-[14px] text-blue-11 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <b>Supplier Trend Insight</b>
              <p className="mt-1 text-gray-10">{data.insight}</p>
            </div>
          </div>
        </div>)}
    </div>
  )
}
