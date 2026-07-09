import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

export interface ApiPlaygroundDocument {
  amount?: number | string
  currency?: string
  invoiceNumber?: string
  poNumber?: string
  requestNo?: string
  vendor?: string
  [key: string]: unknown
}

export interface ApiPlaygroundContext {
  actionName?: string
  apiEndpoint?: string
  apiPath?: string
  document?: ApiPlaygroundDocument
  endpoint?: string
  headers?: Record<string, string>
  method?: string
  model?: string
  payload?: Record<string, unknown>
  playgroundUrl?: string
  provider?: string
  requestPayload?: Record<string, unknown>
  responsePayload?: Record<string, unknown>
}

interface ApiPlaygroundProps extends ApiPlaygroundContext {
  context?: ApiPlaygroundContext
  onClose: () => void
}

const DEFAULT_PLAYGROUND_URL =
  'https://ezagentplayground.onrender.com/apikey.html?id=2'
const DEFAULT_API_HOST = 'https://api.ezofis.com'
const DEFAULT_API_PATH = '/api/v6/payments/process'

const DEFAULT_DOCUMENT: Required<
  Pick<
    ApiPlaygroundDocument,
    'amount' | 'currency' | 'invoiceNumber' | 'poNumber' | 'requestNo' | 'vendor'
  >
> = {
  amount: 3057.78,
  currency: 'USD',
  invoiceNumber: 'INV-2001',
  poNumber: 'PO-1001',
  requestNo: 'REQ-1',
  vendor: 'Silverline Auto Parts',
}

const stringifyJson = (value: unknown) => JSON.stringify(value, null, 2) || ''

export const ApiPlayground = ({
  context,
  onClose,
  ...props
}: ApiPlaygroundProps) => {
  const [copiedCode, setCopiedCode] = useState(false)
  const [activeTab, setActiveTab] = useState<'config' | 'playground'>('config')
  const config = { ...context, ...props }
  const requestMethod = config.method || 'POST'
  const apiPath = config.apiPath || DEFAULT_API_PATH
  const apiEndpoint =
    config.apiEndpoint ||
    (apiPath.startsWith('http') ? apiPath : `${DEFAULT_API_HOST}${apiPath}`)
  const displayEndpoint = config.apiEndpoint || apiPath
  const playgroundUrl =
    config.playgroundUrl || config.endpoint || DEFAULT_PLAYGROUND_URL
  const requestHeaders = {
    Authorization: 'Bearer <YOUR_API_TOKEN>',
    'Content-Type': 'application/json',
    ...config.headers,
  }
  const documentPayload = {
    ...DEFAULT_DOCUMENT,
    ...(config.document || {}),
  }
  const requestPayload =
    config.requestPayload || config.payload || documentPayload
  const headerLines = Object.entries(requestHeaders)
    .map(([key, value]) => `  -H "${key}: ${value}" \\`)
    .join('\n')

  const curlCode = `curl -X ${requestMethod} ${apiEndpoint} \\
${headerLines}
  -d '${stringifyJson(requestPayload).replace(/\n/g, '\n  ')}'`

  const responsePayload =
    config.responsePayload || {
      processedAt: new Date().toISOString(),
      status: 'Processed',
      success: true,
      transactionId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
    }

  const contextRows = [
    { label: 'Action', value: config.actionName },
    { label: 'Provider', value: config.provider },
    { label: 'Model', value: config.model },
  ].filter((row) => row.value)

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
              href={playgroundUrl}
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
                  {requestMethod}
                </span>
                <span className='truncate font-mono font-semibold text-[var(--gray-12)]'>
                  {displayEndpoint}
                </span>
              </div>
            </div>

            {contextRows.length > 0 && (
              <div className='space-y-2'>
                <h4 className='text-[10px] font-bold tracking-wider text-[var(--gray-11)] uppercase'>
                  Integration Context
                </h4>
                <div className='overflow-hidden rounded-lg border border-[var(--gray-3)] bg-surface text-xs'>
                  {contextRows.map((row, index) => (
                    <div
                      className={cn(
                        'grid grid-cols-3 px-3 py-2 font-mono text-[11px]',
                        index < contextRows.length - 1 &&
                        'border-b border-[var(--gray-3)]',
                      )}
                      key={row.label}
                    >
                      <span className='font-bold text-[var(--gray-12)]'>
                        {row.label}
                      </span>
                      <span className='col-span-2 truncate text-[var(--gray-11)]'>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                {Object.entries(requestHeaders).map(([key, value], index) => (
                  <div
                    className={cn(
                      'grid grid-cols-3 px-3 py-2 font-mono text-[11px]',
                      index < Object.entries(requestHeaders).length - 1 &&
                      'border-b border-[var(--gray-3)]',
                    )}
                    key={key}
                  >
                    <span className='font-bold text-[var(--gray-12)]'>
                      {key}
                    </span>
                    <span className='col-span-2 text-[var(--gray-11)]'>
                      {value}
                    </span>
                  </div>
                ))}
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
                  onClick={() => copyToClipboard(stringifyJson(requestPayload))}
                >
                  <Icon
                    className='h-3.5 w-3.5'
                    name={copiedCode ? 'tabler:check' : 'tabler:copy'}
                  />
                  <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <pre className='scrollbar select-all overflow-x-auto whitespace-pre-wrap rounded-lg border border-[var(--gray-12)] bg-[var(--gray-13)] p-3 font-mono text-[11px] leading-relaxed text-[var(--green-9)]'>
                {stringifyJson(requestPayload)}
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
                {stringifyJson(responsePayload)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ApiPlayground
