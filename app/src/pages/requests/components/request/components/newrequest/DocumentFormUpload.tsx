import { useLingui } from '@lingui/react/macro'
import { useMemo, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import {
  AnimateEntrancePop,
  AnimateFadeIn,
  AnimateSlideUp,
  AnimateStagger,
} from '@/components/common/animations'
import { extractWorkflowGraph } from '@/pages/requests/utils/workflow.utils'
import { DOCUMENT_ACCEPT, isSupportedDocument, MAX_SIZE } from './utils'

interface AgentProcessCard {
  color: string
  detail: string
  icon: string
  id: string
  label: string
  title: string
}

interface FlowBlock {
  data?: Record<string, unknown>
  icon?: unknown
  id?: string
  toolType?: unknown
  type?: unknown
  settings?: Record<string, unknown>
}

interface FlowRule {
  fromBlockId?: unknown
  toBlockId?: unknown
}

interface Props {
  isUploading: boolean
  workflow: WorkflowLike
  onFilesSelected: (files: FileList | null) => void
}

interface WorkflowLike {
  blocks?: FlowBlock[]
  description?: string
  flowJson?: unknown
  name?: string
  rules?: FlowRule[]
  workflowJson?: {
    blocks?: FlowBlock[]
    rules?: FlowRule[]
    settings?: {
      general?: {
        description?: string
        name?: string
      }
    }
  }
  settings?: {
    general?: {
      description?: string
      name?: string
    }
  }
}

const CARD_COLORS = [
  'text-[var(--orange-9)] bg-[var(--orange-2)]',
  'text-[var(--indigo-9)] bg-[var(--indigo-2)]',
  'text-[var(--green-11)] bg-[var(--green-2)]',
  'text-[var(--primary-9)] bg-[var(--primary-2)]',
]

const textOf = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const agentKeyOf = (block: FlowBlock): string | null => {
  const type = String(block?.type || '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  const tool = String(
    block?.settings?.toolType || block?.toolType || block?.data?.toolType || '',
  )
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (
    type === 'OCR' ||
    type === 'OCR_AGENT' ||
    tool === 'OCR' ||
    tool === 'OCR_AGENT'
  )
    return 'OCR'
  if (type.includes('AGENT')) return type
  if (tool.includes('AGENT')) return tool
  return null
}

const orderBlocks = (blocks: FlowBlock[], rules: FlowRule[]) => {
  if (!blocks.length || !rules.length) return blocks
  const byId = new Map(blocks.map((block) => [String(block?.id), block]))
  const start =
    blocks.find(
      (block) => String(block?.type || '').toUpperCase() === 'START',
    ) || blocks[0]
  const outgoing = new Map<string, string[]>()
  rules.forEach((rule) => {
    const from = String(rule?.fromBlockId || '')
    const to = String(rule?.toBlockId || '')
    if (!from || !to) return
    const next = outgoing.get(from) || []
    next.push(to)
    outgoing.set(from, next)
  })

  const ordered: FlowBlock[] = []
  const seen = new Set<string>()
  const queue = start?.id ? [String(start.id)] : []
  while (queue.length) {
    const id = queue.shift() as string
    if (seen.has(id)) continue
    seen.add(id)
    const block = byId.get(id)
    if (block) ordered.push(block)
    ;(outgoing.get(id) || []).forEach((nextId) => queue.push(nextId))
  }
  blocks.forEach((block) => {
    const id = String(block?.id || '')
    if (!seen.has(id)) ordered.push(block)
  })
  return ordered
}

const DocumentFormUpload = ({
  isUploading,
  workflow,
  onFilesSelected,
}: Props) => {
  const { t } = useLingui()
  const invoiceInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const general =
    workflow?.settings?.general ||
    workflow?.workflowJson?.settings?.general ||
    {}
  const workflowName = workflow?.name || general?.name || t`Workflow`
  const workflowDescription =
    workflow?.description ||
    general?.description ||
    t`Upload a document to start this workflow.`

  const agentProcesses = useMemo(() => {
    const catalog: Record<
      string,
      { detail: string; icon: string; label: string }
    > = {
      AP_AGENT: {
        detail: t`Process invoices and match them to the related purchase orders.`,
        icon: 'lucide:receipt-text',
        label: t`AP Agent`,
      },
      DOCUMENT_GENERATE_AGENT: {
        detail: t`Generate PDF documents from the template set on this step.`,
        icon: 'lucide:file-text',
        label: t`Document Generate`,
      },
      FTP_AGENT: {
        detail: t`Send files out and bring files in through the FTP connection.`,
        icon: 'lucide:server',
        label: t`FTP Agent`,
      },
      KYC_AGENT: {
        detail: t`Verify identity details and the compliance documents on file.`,
        icon: 'lucide:shield-check',
        label: t`KYC Agent`,
      },
      OCR: {
        detail: t`Read and extract the text from uploaded images and PDF files.`,
        icon: 'lucide:scan-text',
        label: t`OCR Agent`,
      },
      PROCUREMENT_AGENT: {
        detail: t`Create requisitions and vendor purchase orders from this request.`,
        icon: 'lucide:shopping-bag',
        label: t`Procurement Agent`,
      },
      QUALIFY_AGENT: {
        detail: t`Qualify each lead and prospect using the rules on this step.`,
        icon: 'lucide:user-check',
        label: t`Qualify Agent`,
      },
      QUOTE_AGENT: {
        detail: t`Build pricing and sales quotes from the details in this request.`,
        icon: 'lucide:calculator',
        label: t`Quote Agent`,
      },
    }

    const { blocks, rules } = extractWorkflowGraph(workflow)
    return orderBlocks(blocks, rules)
      .flatMap((block) => {
        const key = agentKeyOf(block)
        return key ? [{ block, key }] : []
      })
      .map(({ block, key }, index): AgentProcessCard => {
        const known = catalog[key]
        const settings = block?.settings || {}
        const customIcon = textOf(settings.icon || block?.icon)
        const subLabel = textOf(settings.subLabel)
        const configuredDetail =
          textOf(settings.skillText) ||
          textOf(settings.instructions) ||
          (subLabel && subLabel.toLowerCase() !== 'click to configure'
            ? subLabel
            : '')
        const stockWordCopy =
          key === 'DOCUMENT_GENERATE_AGENT' &&
          /\bword\b/i.test(configuredDetail)
        const title = textOf(settings.label) || known?.label || t`Agent`
        return {
          color: CARD_COLORS[index % CARD_COLORS.length],
          detail: stockWordCopy
            ? known?.detail ||
              t`Generate PDF documents from the template set on this step.`
            : configuredDetail ||
              known?.detail ||
              t`Runs as part of this workflow.`,
          icon: customIcon.includes(':')
            ? customIcon
            : known?.icon || 'lucide:cpu',
          id: String(block?.id || `${key}-${index}`),
          label: known?.label || title,
          title,
        }
      })
  }, [t, workflow])

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)
    const valid = fileArray.every(
      (f) => isSupportedDocument(f) && f.size <= MAX_SIZE,
    )
    if (!valid) {
      showToast({ message: t`Invalid file type or size.`, variant: 'error' })
      return
    }
    onFilesSelected(files)
  }

  return (
    <AnimateFadeIn className='flex h-full w-full flex-1 flex-col items-center overflow-y-auto bg-surface-muted px-4 py-4 sm:px-6 lg:px-8'>
      <div className='my-auto flex w-full max-w-5xl flex-col items-center gap-5'>
        {/* Header Section */}
        <AnimateSlideUp className='space-y-1.5 text-center'>
          <h1 className='text-2xl font-bold tracking-tight text-[var(--gray-13)]'>
            {workflowName}
          </h1>
          <p className='mx-auto line-clamp-2 max-w-xl text-sm/5 font-medium text-[var(--gray-10)]'>
            {workflowDescription}
          </p>
        </AnimateSlideUp>

        {/* Upload Zone */}
        <AnimateSlideUp className='relative z-10 w-full max-w-3xl' delay={0.1}>
          <div className='group relative overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface p-2 shadow-sm transition-all duration-500 hover:shadow-md'>
            <div className='pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl opacity-0 transition-opacity duration-700 group-hover:opacity-100'>
              <div className='absolute inset-0 h-1/2 w-full animate-[scan_3s_linear_infinite] bg-gradient-to-b from-transparent via-[var(--primary-2)]/20 to-transparent' />
            </div>

            <button
              aria-label={t`Upload document`}
              type='button'
              className={[
                'relative z-10 flex min-h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[var(--primary-4)] px-8 py-6 text-center transition-all duration-500 ease-out sm:min-h-[128px]',
                isDragOver
                  ? 'scale-[0.99] border-[var(--primary-6)] bg-[var(--primary-1)]'
                  : 'bg-surface hover:border-[var(--primary-5)] hover:bg-[var(--primary-1)]/30',
                isUploading ? 'pointer-events-none opacity-60' : '',
              ].join(' ')}
              onClick={() => invoiceInputRef.current?.click()}
              onDragLeave={() => setIsDragOver(false)}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                handleFiles(e.dataTransfer.files)
              }}
            >
              {isUploading ? (
                <div className='flex flex-col items-center gap-3 py-2'>
                  <div className='flex size-14 items-center justify-center rounded-full bg-[var(--primary-1)]'>
                    <Icon
                      className='size-7 animate-spin text-[var(--primary-9)]'
                      name='tabler:loader-2'
                    />
                  </div>
                  <div className='text-center'>
                    <h2 className='text-base font-bold text-[var(--gray-13)]'>
                      {t`Uploading & Processing...`}
                    </h2>
                    <p className='mt-1 max-w-[280px] truncate text-xs font-semibold text-[var(--gray-10)]'>
                      {t`Please wait while we extract data...`}
                    </p>
                  </div>
                </div>
              ) : (
                <AnimateStagger className='flex flex-col items-center gap-3'>
                  <div className='flex size-14 items-center justify-center rounded-2xl bg-[var(--primary-1)] shadow-sm transition-all duration-500 group-hover:scale-105'>
                    <Icon
                      className='size-7 text-[var(--primary-9)]'
                      name='tabler:cloud-upload'
                    />
                  </div>
                  <div className='text-center'>
                    <h2 className='text-base font-medium tracking-tight text-[var(--gray-13)]'>
                      {t`Drop your file here, or`}{' '}
                      <span className='text-[var(--primary-9)]'>{t`browse`}</span>
                    </h2>
                    <p className='text-xs font-medium text-[var(--gray-9)]'>
                      {t`Supports PDF, Word, Excel, PowerPoint, Images & Documents · Max 50 MB`}
                    </p>
                  </div>
                </AnimateStagger>
              )}

              <input
                accept={DOCUMENT_ACCEPT}
                className='hidden'
                ref={invoiceInputRef}
                type='file'
                onChange={(e) => handleFiles(e.target.files)}
              />
            </button>
          </div>
        </AnimateSlideUp>

        {agentProcesses.length > 0 && (
          <div
            className={[
              'mx-auto grid w-full gap-4',
              agentProcesses.length === 1 ? 'max-w-sm grid-cols-1' : '',
              agentProcesses.length === 2
                ? 'max-w-3xl grid-cols-1 md:grid-cols-2'
                : '',
              agentProcesses.length >= 3
                ? 'max-w-[900px] grid-cols-1 md:grid-cols-3'
                : '',
            ].join(' ')}
          >
            {agentProcesses.map((item, idx) => (
              <AnimateEntrancePop delay={0.2 + idx * 0.08} key={item.id}>
                <div className='group flex h-full flex-col gap-2 rounded-xl border border-[var(--gray-3)] bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md'>
                  <span className='truncate text-[9px] font-bold tracking-wider text-[var(--gray-10)] uppercase'>
                    {item.label}
                  </span>
                  <div className='mt-1 flex items-start gap-3.5'>
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm transition-transform duration-300 group-hover:scale-105 ${item.color}`}
                    >
                      <Icon
                        className='size-5 transition-transform duration-300 group-hover:rotate-6'
                        name={item.icon}
                      />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <h4
                        className='truncate text-13/4.5 font-semibold text-[var(--gray-13)]'
                        title={item.title}
                      >
                        {item.title}
                      </h4>
                      <p
                        className='mt-0.5 line-clamp-2 h-[2lh] overflow-hidden text-11/4 text-[var(--gray-10)]'
                        title={item.detail}
                      >
                        {item.detail}
                      </p>
                    </div>
                  </div>
                </div>
              </AnimateEntrancePop>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(200%); }
        }
      `}</style>
    </AnimateFadeIn>
  )
}

export default DocumentFormUpload
