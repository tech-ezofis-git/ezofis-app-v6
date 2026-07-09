import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface ApiPlaygroundProps {
  context?: {
    actionName?: string
    document?: {
      amount: number
      currency: string
      invoiceNumber: string
      poNumber: string
      requestNo: string
      vendor: string
    }
    endpoint?: string
    model?: string
    provider?: string
  }
  onClose: () => void
}

export const ApiPlayground = ({ context, onClose }: ApiPlaygroundProps) => {
  const [copiedCode, setCopiedCode] = useState(false)
  const [activeTab, setActiveTab] = useState<'config' | 'playground'>('config')
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
      <div className='flex items-center justify-between border-b border-[var(--gray-3)] bg-[var(--gray-1)] px-4 py-3'>
        <div className='flex items-center gap-2'>
          <Icon
            className='h-4 w-4 text-[var(--primary-9)]'
            name='tabler:file-description'
          />
          <span className='text-xs font-bold tracking-wider text-[var(--gray-12)] uppercase'>
            API Documentation
          </span>
        </div>
        <button
          className='cursor-pointer rounded-md border-none bg-transparent p-1 text-[var(--gray-11)] transition-colors hover:bg-[var(--gray-2)] hover:text-[var(--gray-13)]'
          title='Close Panel'
          onClick={onClose}
        >
          <Icon className='h-4 w-4' name='tabler:x' />
        </button>
      </div>

      {/* Main Content Area */}
      <div className='scrollbar flex-1 space-y-6 overflow-y-auto p-4'>
        {/* Intro */}
        <div className='space-y-2'>
          {/* <h3 className='text-xs font-extrabold tracking-wider text-[var(--gray-11)] uppercase'>
            Disbursement
          </h3> */}
          <p className='text-xs leading-relaxed text-[var(--gray-11)]'>
            This API integration executes when a transaction moves to the
            configured status, updating the corresponding external system
            accordingly.
          </p>
        </div>

        {/* Tabs */}
        <div className='flex items-center gap-4 border-b border-[var(--gray-3)]'>
          <button
            className={cn(
              'cursor-pointer border-b-2 px-1 py-2 text-xs font-bold transition-all',
              activeTab === 'config'
                ? 'border-[var(--primary-9)] text-[var(--primary-9)]'
                : 'border-transparent text-[var(--gray-11)] hover:text-[var(--gray-13)]',
            )}
            onClick={() => setActiveTab('config')}
          >
            API Details
          </button>
          <button
            className={cn(
              'cursor-pointer border-b-2 px-1 py-2 text-xs font-bold transition-all',
              activeTab === 'playground'
                ? 'border-[var(--primary-9)] text-[var(--primary-9)]'
                : 'border-transparent text-[var(--gray-11)] hover:text-[var(--gray-13)]',
            )}
            onClick={() => setActiveTab('playground')}
          >
            API Playground
          </button>
        </div>

        {activeTab === 'playground' && (
          <div className='space-y-3.5 rounded-xl border border-[var(--primary-3)] bg-[var(--primary-1)]/10 p-4 text-center'>
            <div className='text-xs leading-normal text-[var(--gray-12)]'>
              Need to test prompts or explore models in a sandbox environment?
            </div>
            <a
              className='decoration-none inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-[var(--primary-9)] px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-[var(--primary-10)] active:scale-95'
              rel='noopener noreferrer'
              target='_blank'
              href={
                context?.endpoint ||
                'https://ezagentplayground.onrender.com/apikey.html?id=2'
              }
            >
              <Icon className='h-4 w-4' name='tabler:external-link' />
              Open API Playground
            </a>
          </div>
        )}

        {activeTab === 'config' && (
          <div className='space-y-6'>
            {/* Endpoint Details */}
            <div className='space-y-2.5'>
              <h4 className='text-[10px] font-bold tracking-wider text-[var(--gray-11)] uppercase'>
                Request Specification
              </h4>
              <div className='flex items-center gap-2 rounded-lg border border-[var(--gray-3)] bg-[var(--gray-1)] px-3 py-2 text-xs'>
                <span className='rounded border border-[var(--green-3)] bg-[var(--green-1)] px-1.5 py-0.5 text-[10px] font-extrabold text-[var(--green-9)] uppercase'>
                  POST
                </span>
                <span className='truncate font-mono font-semibold text-[var(--gray-12)]'>
                  /api/v6/payments/process
                </span>
              </div>
            </div>

            {/* Headers */}
            <div className='space-y-2'>
              <h4 className='text-[10px] font-bold tracking-wider text-[var(--gray-11)] uppercase'>
                Headers
              </h4>
              <div className='overflow-hidden rounded-lg border border-[var(--gray-3)] bg-surface text-xs'>
                <div className='grid grid-cols-3 border-b border-[var(--gray-3)] bg-[var(--gray-1)] px-3 py-1.5 text-[9px] font-bold tracking-wider text-[var(--gray-11)] uppercase'>
                  <span>Header</span>
                  <span className='col-span-2'>Value</span>
                </div>
                <div className='grid grid-cols-3 border-b border-[var(--gray-3)] px-3 py-2 font-mono text-[11px]'>
                  <span className='font-bold text-[var(--gray-12)]'>
                    Content-Type
                  </span>
                  <span className='col-span-2 text-[var(--gray-11)]'>
                    application/json
                  </span>
                </div>
                <div className='grid grid-cols-3 px-3 py-2 font-mono text-[11px]'>
                  <span className='font-bold text-[var(--gray-12)]'>
                    Authorization
                  </span>
                  <span className='col-span-2 text-[var(--gray-11)]'>
                    Bearer &lt;YOUR_API_TOKEN&gt;
                  </span>
                </div>
              </div>
            </div>

            {/* Live Payload Snippet */}
            <div className='relative space-y-2'>
              <div className='flex items-center justify-between'>
                <h4 className='text-[10px] font-bold tracking-wider text-[var(--gray-11)] uppercase'>
                  Live Request Payload
                </h4>
                <button
                  className='flex cursor-pointer items-center gap-1 border-none bg-transparent text-[10px] font-bold text-[var(--primary-9)] transition-colors hover:text-[var(--primary-10)]'
                  onClick={() =>
                    copyToClipboard(JSON.stringify(requestPayload, null, 2))
                  }
                >
                  <Icon
                    className='h-3.5 w-3.5'
                    name={copiedCode ? 'tabler:check' : 'tabler:copy'}
                  />
                  <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <pre className='scrollbar select-all overflow-x-auto whitespace-pre-wrap rounded-lg border border-[var(--gray-12)] bg-[var(--gray-13)] p-3 font-mono text-[11px] leading-relaxed text-[var(--green-9)]'>
                {JSON.stringify(requestPayload, null, 2)}
              </pre>
            </div>

            {/* cURL Snippet */}
            <div className='relative space-y-2'>
              <div className='flex items-center justify-between'>
                <h4 className='text-[10px] font-bold tracking-wider text-[var(--gray-11)] uppercase'>
                  cURL Request Code
                </h4>
                <button
                  className='flex cursor-pointer items-center gap-1 border-none bg-transparent text-[10px] font-bold text-[var(--primary-9)] transition-colors hover:text-[var(--primary-10)]'
                  onClick={() => copyToClipboard(curlCode)}
                >
                  <Icon
                    className='h-3.5 w-3.5'
                    name={copiedCode ? 'tabler:check' : 'tabler:copy'}
                  />
                  <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <pre className='scrollbar select-all overflow-x-auto whitespace-pre-wrap rounded-lg border border-[var(--gray-12)] bg-[var(--gray-13)] p-3 font-mono text-[11px] leading-relaxed text-[var(--blue-9)]'>
                {curlCode}
              </pre>
            </div>

            {/* Response Snippet */}
            <div className='relative space-y-2'>
              <h4 className='text-[10px] font-bold tracking-wider text-[var(--gray-11)] uppercase'>
                Expected Response Payload
              </h4>
              <pre className='scrollbar overflow-x-auto whitespace-pre-wrap rounded-lg border border-[var(--gray-12)] bg-[var(--gray-13)] p-3 font-mono text-[11px] leading-relaxed text-[var(--orange-9)]'>
                {responseSnippet}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ApiPlayground
