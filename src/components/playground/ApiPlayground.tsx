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

export interface ApiEndpointConfig {
  id: string
  title: string
  description?: string
  method: string
  apiPath: string
  apiEndpoint?: string
  headers?: Record<string, string>
  requestPayload?: Record<string, unknown> | null
  responsePayload?: Record<string, unknown>
}

export interface ApiPlaygroundContext {
  actionName?: string
  description?: string
  playgroundUrl?: string
  endpoints?: ApiEndpointConfig[]
  provider?: string
  model?: string
  // Legacy fields for backward compatibility
  apiEndpoint?: string
  apiPath?: string
  document?: ApiPlaygroundDocument
  endpoint?: string
  headers?: Record<string, string>
  method?: string
  payload?: Record<string, unknown>
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
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  const config = { ...context, ...props }
  const playgroundUrl =
    config.playgroundUrl || config.endpoint || DEFAULT_PLAYGROUND_URL

  // Fallback to legacy single-endpoint if `endpoints` is not provided
  const endpoints: ApiEndpointConfig[] = config.endpoints || [
    {
      id: 'default',
      title: config.actionName || 'API Endpoint',
      description: 'Interact with the primary API endpoint.',
      method: config.method || 'POST',
      apiPath: config.apiPath || '/api/v6/payments/process',
      apiEndpoint: config.apiEndpoint || config.endpoint,
      headers: config.headers,
      requestPayload: config.requestPayload || config.payload || {
        ...DEFAULT_DOCUMENT,
        ...(config.document || {})
      },
      responsePayload: config.responsePayload || {
        success: true,
        message: 'Action completed successfully'
      }
    }
  ]

  // Default to expanding the first endpoint
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({
    [endpoints[0]?.id]: true
  })

  const toggleEndpoint = (id: string) => {
    setExpandedEndpoints(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
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
            API Docs
          </span>
        </div>
        <div className='flex items-center gap-3'>
          <a
            className='decoration-none inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-[var(--primary-9)] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-[var(--primary-10)] active:scale-95'
            rel='noopener noreferrer'
            target='_blank'
            href={playgroundUrl}
          >
            <Icon className='h-3.5 w-3.5' name='tabler:external-link' />
            Try Playground
          </a>
          <button
            className='cursor-pointer rounded-md border-none bg-transparent p-1 text-[var(--gray-11)] transition-colors hover:bg-[var(--gray-2)] hover:text-[var(--gray-13)]'
            title='Close Panel'
            onClick={onClose}
          >
            <Icon className='h-4 w-4' name='tabler:x' />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className='scrollbar flex-1 space-y-6 overflow-y-auto p-4'>
        {/* Intro */}
        <div className='space-y-2'>
          <p className='text-xs leading-relaxed text-[var(--gray-11)]'>
            {config.description ||
              (endpoints.length > 0
                ? `This API documentation details how to ${new Intl.ListFormat('en').format(
                    endpoints.map((e) => e.title.toLowerCase())
                  )}. You can use this interactive sandbox to test these endpoints.`
                : 'This API documentation details the available endpoints, required payloads, and interactive sandbox testing environments.')}
          </p>
        </div>

        <div className='space-y-4'>
            {endpoints.map((endpoint) => {
              const isExpanded = expandedEndpoints[endpoint.id]
              
              const requestHeaders = {
                Authorization: 'Bearer <YOUR_API_TOKEN>',
                'Content-Type': 'application/json',
                ...endpoint.headers,
              }
              
              const fullApiEndpoint = endpoint.apiEndpoint || (endpoint.apiPath.startsWith('http') ? endpoint.apiPath : `${DEFAULT_API_HOST}${endpoint.apiPath}`)
              
              const headerLines = Object.entries(requestHeaders)
                .map(([key, value]) => `  -H "${key}: ${value}" \\`)
                .join('\n')

              const curlCode = endpoint.requestPayload
                ? `curl -X ${endpoint.method} ${fullApiEndpoint} \\\n${headerLines}\n  -d '${stringifyJson(endpoint.requestPayload).replace(/\n/g, '\n  ')}'`
                : `curl -X ${endpoint.method} ${fullApiEndpoint} \\\n${headerLines}`

              return (
                <div key={endpoint.id} className='overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface shadow-sm'>
                  {/* Accordion Header */}
                  <button
                    className='flex w-full cursor-pointer items-center justify-between border-none bg-[var(--gray-1)] px-4 py-3 text-left transition-colors hover:bg-[var(--gray-2)]'
                    onClick={() => toggleEndpoint(endpoint.id)}
                  >
                    <div className='flex flex-1 min-w-0 flex-col gap-1 pr-4'>
                      <div className='flex items-center gap-2'>
                        <span className={cn(
                          'rounded border px-1.5 py-0.5 text-[10px] font-extrabold uppercase shrink-0',
                          endpoint.method === 'GET' ? 'border-[var(--blue-3)] bg-[var(--blue-1)] text-[var(--blue-9)]' :
                          endpoint.method === 'POST' ? 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-9)]' :
                          endpoint.method === 'PUT' ? 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]' :
                          endpoint.method === 'DELETE' ? 'border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]' :
                          'border-[var(--gray-3)] bg-[var(--gray-2)] text-[var(--gray-11)]'
                        )}>
                          {endpoint.method}
                        </span>
                        <span className='font-bold text-[var(--gray-13)] text-xs truncate'>
                          {endpoint.title}
                        </span>
                      </div>
                      {!isExpanded && endpoint.description && (
                        <span className='text-[10px] text-[var(--gray-11)] truncate hover:whitespace-normal hover:overflow-visible'>
                          {endpoint.description}
                        </span>
                      )}
                    </div>
                    <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[var(--gray-3)]'>
                      <Icon
                        className={cn('h-4 w-4 text-[var(--gray-11)] transition-transform duration-300', isExpanded ? 'rotate-180' : 'rotate-0')}
                        name='tabler:chevron-down'
                      />
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className='animate-in slide-in-from-top-2 fade-in space-y-6 border-t border-[var(--gray-3)] p-4 duration-300'>
                      
                      {endpoint.description && (
                        <p className='text-xs leading-relaxed text-[var(--gray-11)]'>
                          {endpoint.description}
                        </p>
                      )}

                      {/* Full Endpoint Details */}
                      <div className='space-y-2.5'>
                        <div className='flex items-center justify-between'>
                          <h4 className='text-[10px] font-bold tracking-wider text-[var(--gray-11)] uppercase'>
                            Endpoint URL
                          </h4>
                          <a
                            className='decoration-none inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-[var(--primary-9)] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-[var(--primary-10)] active:scale-95'
                            rel='noopener noreferrer'
                            target='_blank'
                            href={playgroundUrl}
                          >
                            <Icon className='h-3.5 w-3.5' name='tabler:external-link' />
                            Try it out
                          </a>
                        </div>
                        <div className='flex items-start gap-2 rounded-lg border border-[var(--gray-3)] bg-[var(--gray-1)] px-3 py-2 text-xs'>
                          <span className='flex-1 break-all font-mono font-semibold text-[var(--gray-12)] mt-0.5'>
                            {fullApiEndpoint}
                          </span>
                          <button
                            className='flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-1 text-[var(--gray-9)] transition-colors hover:bg-[var(--gray-3)] hover:text-[var(--gray-12)]'
                            onClick={() => copyToClipboard(fullApiEndpoint, `endpoint-${endpoint.id}`)}
                            title='Copy Endpoint'
                          >
                            <Icon
                              className='h-3.5 w-3.5'
                              name={copiedId === `endpoint-${endpoint.id}` ? 'tabler:check' : 'tabler:copy'}
                            />
                          </button>
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

                      {/* Request Payload */}
                      {endpoint.requestPayload && (
                        <div className='relative space-y-2'>
                          <div className='flex items-center justify-between'>
                            <h4 className='text-[10px] font-bold tracking-wider text-[var(--gray-11)] uppercase'>
                              Request Payload
                            </h4>
                            <button
                              className='flex cursor-pointer items-center gap-1 border-none bg-transparent text-[10px] font-bold text-[var(--primary-9)] transition-colors hover:text-[var(--primary-10)]'
                              onClick={() => copyToClipboard(stringifyJson(endpoint.requestPayload), `payload-${endpoint.id}`)}
                            >
                              <Icon
                                className='h-3.5 w-3.5'
                                name={copiedId === `payload-${endpoint.id}` ? 'tabler:check' : 'tabler:copy'}
                              />
                              <span>{copiedId === `payload-${endpoint.id}` ? 'Copied!' : 'Copy'}</span>
                            </button>
                          </div>
                          <pre className='scrollbar select-all overflow-x-auto whitespace-pre-wrap rounded-lg border border-[var(--gray-12)] bg-[var(--gray-13)] p-3 font-mono text-[11px] leading-relaxed text-[var(--green-9)]'>
                            {stringifyJson(endpoint.requestPayload)}
                          </pre>
                        </div>
                      )}

                      {/* cURL Snippet */}
                      <div className='relative space-y-2'>
                        <div className='flex items-center justify-between'>
                          <h4 className='text-[10px] font-bold tracking-wider text-[var(--gray-11)] uppercase'>
                            cURL Example
                          </h4>
                          <button
                            className='flex cursor-pointer items-center gap-1 border-none bg-transparent text-[10px] font-bold text-[var(--primary-9)] transition-colors hover:text-[var(--primary-10)]'
                            onClick={() => copyToClipboard(curlCode, `curl-${endpoint.id}`)}
                          >
                            <Icon
                              className='h-3.5 w-3.5'
                              name={copiedId === `curl-${endpoint.id}` ? 'tabler:check' : 'tabler:copy'}
                            />
                            <span>{copiedId === `curl-${endpoint.id}` ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                        <pre className='scrollbar select-all overflow-x-auto whitespace-pre-wrap rounded-lg border border-[var(--gray-12)] bg-[var(--gray-13)] p-3 font-mono text-[11px] leading-relaxed text-[var(--blue-9)]'>
                          {curlCode}
                        </pre>
                      </div>

                      {/* Response Snippet */}
                      {endpoint.responsePayload && (
                        <div className='relative space-y-2'>
                          <h4 className='text-[10px] font-bold tracking-wider text-[var(--gray-11)] uppercase'>
                            Response Payload
                          </h4>
                          <pre className='scrollbar overflow-x-auto whitespace-pre-wrap rounded-lg border border-[var(--gray-12)] bg-[var(--gray-13)] p-3 font-mono text-[11px] leading-relaxed text-[var(--orange-9)]'>
                            {stringifyJson(endpoint.responsePayload)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
      </div>
    </div>
  )
}

export default ApiPlayground
