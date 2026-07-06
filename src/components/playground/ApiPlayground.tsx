import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
// import cn from '@/utils/cn'

interface ApiPlaygroundProps {
  context?: {
    provider?: string
    model?: string
    endpoint?: string
    actionName?: string
    document?: {
      amount: number
      currency: string
      invoiceNumber: string
      poNumber: string
      requestNo: string
      vendor: string
    }
  }
  onClose: () => void
}

export const ApiPlayground = ({ context, onClose }: ApiPlaygroundProps) => {
  const [copiedCode, setCopiedCode] = useState(false)
  const doc = context?.document

  // Default mock values if context document is missing
  const requestPayload = {
    amount: doc?.amount || 3057.78,
    currency: doc?.currency || 'USD',
    invoiceNumber: doc?.invoiceNumber || 'INV-2001',
    poNumber: doc?.poNumber || 'PO-1001',
    requestNo: doc?.requestNo || 'REQ-1',
    vendor: doc?.vendor || 'Silverline Auto Parts',
  }

  const curlCode = `curl -X POST https://api.ezofis.com/api/v6/payments/process \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '${JSON.stringify(requestPayload, null, 2).replace(/\n/g, '\n  ')}'`

  const responseSnippet = `{
  "success": true,
  "transactionId": "TXN-${Math.floor(100000 + Math.random() * 900000)}",
  "status": "Processed",
  "processedAt": "${new Date().toISOString()}"
}`

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div className='flex h-full flex-col bg-surface font-sans text-gray-13'>
      {/* Top Header */}
      <div className='flex items-center justify-between border-b border-[var(--gray-3)] px-4 py-3 bg-[var(--gray-1)]'>
        <div className='flex items-center gap-2'>
          <Icon className='h-4 w-4 text-[var(--primary-9)]' name='tabler:file-description' />
          <span className='text-xs font-bold uppercase tracking-wider text-[var(--gray-12)]'>API Documentation</span>
        </div>
        <button
          onClick={onClose}
          className='rounded-md p-1 hover:bg-[var(--gray-2)] text-[var(--gray-11)] hover:text-[var(--gray-13)] transition-colors cursor-pointer border-none bg-transparent'
          title='Close Panel'
        >
          <Icon className='h-4 w-4' name='tabler:x' />
        </button>
      </div>

      {/* Main Content Area */}
      <div className='flex-1 overflow-y-auto p-4 space-y-6 scrollbar'>
        
        {/* Intro */}
        <div className='space-y-2'>
          <h3 className='text-xs font-extrabold uppercase tracking-wider text-[var(--gray-11)]'>Disbursement API</h3>
          <p className='text-xs text-[var(--gray-11)] leading-relaxed'>
            This external API is invoked when transitioning a transaction using the <strong className='text-[var(--gray-13)]'>Paid</strong> action. It registers the payment disbursement in the integrated accounting system.
          </p>
        </div>

        {/* Playground External Link */}
        <div className='rounded-xl border border-[var(--primary-3)] bg-[var(--primary-1)]/10 p-4 space-y-3.5 text-center'>
          <div className='text-xs text-[var(--gray-12)] leading-normal'>
            Need to test prompts or explore models in a sandbox environment?
          </div>
          <a
            href={context?.endpoint || 'https://ezagentplayground.onrender.com/apikey.html?id=2'}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--primary-9)] hover:bg-[var(--primary-10)] active:scale-95 text-white px-4 py-2 text-xs font-bold transition-all shadow-md decoration-none cursor-pointer border-none'
          >
            <Icon className='h-4 w-4' name='tabler:external-link' />
            Open API Playground
          </a>
        </div>

        {/* Endpoint Details */}
        <div className='space-y-2.5'>
          <h4 className='text-[10px] font-bold text-[var(--gray-11)] uppercase tracking-wider'>Request Specification</h4>
          <div className='flex items-center gap-2 rounded-lg border border-[var(--gray-3)] bg-[var(--gray-1)] px-3 py-2 text-xs'>
            <span className='rounded bg-[var(--green-1)] border border-[var(--green-3)] px-1.5 py-0.5 text-[10px] font-extrabold text-[var(--green-9)] uppercase'>
              POST
            </span>
            <span className='font-mono font-semibold text-[var(--gray-12)] truncate'>
              /api/v6/payments/process
            </span>
          </div>
        </div>

        {/* Headers */}
        <div className='space-y-2'>
          <h4 className='text-[10px] font-bold text-[var(--gray-11)] uppercase tracking-wider'>Headers</h4>
          <div className='overflow-hidden rounded-lg border border-[var(--gray-3)] text-xs bg-surface'>
            <div className='grid grid-cols-3 border-b border-[var(--gray-3)] bg-[var(--gray-1)] px-3 py-1.5 font-bold text-[var(--gray-11)] uppercase text-[9px] tracking-wider'>
              <span>Header</span>
              <span className='col-span-2'>Value</span>
            </div>
            <div className='grid grid-cols-3 border-b border-[var(--gray-3)] px-3 py-2 font-mono text-[11px]'>
              <span className='font-bold text-[var(--gray-12)]'>Content-Type</span>
              <span className='col-span-2 text-[var(--gray-11)]'>application/json</span>
            </div>
            <div className='grid grid-cols-3 px-3 py-2 font-mono text-[11px]'>
              <span className='font-bold text-[var(--gray-12)]'>Authorization</span>
              <span className='col-span-2 text-[var(--gray-11)]'>Bearer &lt;YOUR_API_TOKEN&gt;</span>
            </div>
          </div>
        </div>

        {/* Live Payload Snippet */}
        <div className='space-y-2 relative'>
          <div className='flex items-center justify-between'>
            <h4 className='text-[10px] font-bold text-[var(--gray-11)] uppercase tracking-wider'>Live Request Payload</h4>
            <button
              onClick={() => copyToClipboard(JSON.stringify(requestPayload, null, 2))}
              className='flex items-center gap-1 text-[10px] font-bold text-[var(--primary-9)] hover:text-[var(--primary-10)] cursor-pointer transition-colors border-none bg-transparent'
            >
              <Icon className='h-3.5 w-3.5' name={copiedCode ? 'tabler:check' : 'tabler:copy'} />
              <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <pre className='bg-[var(--gray-13)] p-3 rounded-lg border border-gray-12 overflow-x-auto scrollbar text-[var(--green-9)] font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-all'>
            {JSON.stringify(requestPayload, null, 2)}
          </pre>
        </div>

        {/* cURL Snippet */}
        <div className='space-y-2 relative'>
          <div className='flex items-center justify-between'>
            <h4 className='text-[10px] font-bold text-[var(--gray-11)] uppercase tracking-wider'>cURL Request Code</h4>
            <button
              onClick={() => copyToClipboard(curlCode)}
              className='flex items-center gap-1 text-[10px] font-bold text-[var(--primary-9)] hover:text-[var(--primary-10)] cursor-pointer transition-colors border-none bg-transparent'
            >
              <Icon className='h-3.5 w-3.5' name={copiedCode ? 'tabler:check' : 'tabler:copy'} />
              <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <pre className='bg-[var(--gray-13)] p-3 rounded-lg border border-gray-12 overflow-x-auto scrollbar text-[var(--blue-9)] font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-all'>
            {curlCode}
          </pre>
        </div>

        {/* Response Snippet */}
        <div className='space-y-2 relative'>
          <h4 className='text-[10px] font-bold text-[var(--gray-11)] uppercase tracking-wider'>Expected Response Payload</h4>
          <pre className='bg-[var(--gray-13)] p-3 rounded-lg border border-gray-12 overflow-x-auto scrollbar text-[var(--orange-9)] font-mono text-[11px] leading-relaxed whitespace-pre-wrap'>
            {responseSnippet}
          </pre>
        </div>

      </div>
    </div>
  )
}

export default ApiPlayground
