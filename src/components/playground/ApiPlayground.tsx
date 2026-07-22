import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

export interface ApiEndpointConfig {
  apiPath: string
  id: string
  method: string
  title: string
  apiEndpoint?: string
  description?: string
  headers?: Record<string, string>
  requestPayload?: Record<string, unknown> | null
  responsePayload?: Record<string, unknown>
}

export interface ApiPlaygroundContext {
  actionName?: string
  // Legacy fields for backward compatibility
  apiEndpoint?: string
  apiPath?: string
  description?: string
  document?: ApiPlaygroundDocument
  endpoint?: string
  endpoints?: ApiEndpointConfig[]
  headers?: Record<string, string>
  method?: string
  model?: string
  payload?: Record<string, unknown>
  playgroundUrl?: string
  provider?: string
  requestPayload?: Record<string, unknown>
  responsePayload?: Record<string, unknown>
}

export interface ApiPlaygroundDocument {
  [key: string]: unknown
  amount?: number | string
  currency?: string
  invoiceNumber?: string
  poNumber?: string
  requestNo?: string
  vendor?: string
}

interface ApiPlaygroundProps extends ApiPlaygroundContext {
  context?: ApiPlaygroundContext
  onClose: () => void
}

const DEFAULT_PLAYGROUND_URL =
  'https://demo.ezofis.com/V6Playground/apikey.html'
const DEFAULT_API_HOST = 'https://api.ezofis.com'

const DEFAULT_DOCUMENT: Required<
  Pick<
    ApiPlaygroundDocument,
    | 'amount'
    | 'currency'
    | 'invoiceNumber'
    | 'poNumber'
    | 'requestNo'
    | 'vendor'
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

  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('playground_api_key') || ''
  })
  const [isKeyGenerated, setIsKeyGenerated] = useState<boolean>(() => {
    return localStorage.getItem('playground_api_key_status') === 'created'
  })
  const [showKey, setShowKey] = useState<boolean>(false)
  const [isKeyGeneratedNow, setIsKeyGeneratedNow] = useState<boolean>(false)

  const generateApiKey = () => {
    const randomHex = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('')
    const newKey = `ez_live_${randomHex}`
    localStorage.setItem('playground_api_key', newKey)
    localStorage.setItem('playground_api_key_status', 'created')
    setApiKey(newKey)
    setIsKeyGenerated(true)
    setIsKeyGeneratedNow(true)
  }

  const config = { ...context, ...props }
  const playgroundUrl =
    config.playgroundUrl || config.endpoint || DEFAULT_PLAYGROUND_URL

  // Fallback to legacy single-endpoint if `endpoints` is not provided
  const endpoints: ApiEndpointConfig[] = config.endpoints || [
    {
      apiEndpoint: config.apiEndpoint || config.endpoint,
      apiPath: config.apiPath || '/api/v6/payments/process',
      description: 'Interact with the primary API endpoint.',
      headers: config.headers,
      id: 'default',
      method: config.method || 'POST',
      requestPayload: config.requestPayload ||
        config.payload || {
          ...DEFAULT_DOCUMENT,
          ...(config.document || {}),
        },
      responsePayload: config.responsePayload || {
        message: 'Action completed successfully',
        success: true,
      },
      title: config.actionName || 'API Endpoint',
    },
  ]

  // Default to expanding the first endpoint only if there is exactly one
  const [expandedEndpoints, setExpandedEndpoints] = useState<
    Record<string, boolean>
  >(endpoints.length === 1 && endpoints[0] ? { [endpoints[0].id]: true } : {})

  const toggleEndpoint = (id: string) => {
    setExpandedEndpoints((prev) => ({
      ...prev,
      [id]: !prev[id],
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
            href={playgroundUrl}
            rel='noopener noreferrer'
            target='_blank'
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
        <div className='animate-in fade-in slide-in-from-top-4 space-y-2 duration-300'>
          <p className='text-xs leading-relaxed text-[var(--gray-11)]'>
            {config.description ||
              (endpoints.length > 0
                ? `This API documentation details how to ${new Intl.ListFormat(
                    'en',
                  ).format(
                    endpoints.map((e) => e.title.toLowerCase()),
                  )}. You can use this interactive sandbox to test these endpoints.`
                : 'This API documentation details the available endpoints, required payloads, and interactive sandbox testing environments.')}
          </p>
        </div>

        {/* API Authentication Setup Card */}
        <div
          className={cn(
            'animate-in fade-in slide-in-from-top-4 rounded-xl border shadow-sm transition-all duration-300',
            isKeyGenerated
              ? 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-9)]'
              : 'border-dashed border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]',
            isKeyGenerated && !isKeyGeneratedNow
              ? 'p-2 px-3'
              : 'flex flex-col gap-3.5 p-4',
          )}
        >
          {isKeyGenerated && !isKeyGeneratedNow ? (
            <div className='flex items-center justify-between gap-3'>
              <div className='flex min-w-0 items-start gap-2.5'>
                <div className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--green-2)] font-bold text-[var(--green-9)] shadow-sm'>
                  <Icon className='h-3 w-3' name='tabler:check' />
                </div>
                <div className='flex min-w-0 flex-col gap-0.5'>
                  <span className='text-xs font-bold tracking-wider text-[var(--gray-12)]'>
                    API Key
                  </span>
                  <span className='inline-flex w-fit items-center gap-1 rounded border border-[var(--green-3)] bg-[var(--green-2)] px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-[var(--green-9)] uppercase shadow-sm'>
                    Setup Completed
                  </span>
                </div>
              </div>
              <button
                className='inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded border-none bg-[var(--gray-2)] px-2.5 py-1.5 text-[9px] font-extrabold text-[var(--gray-12)] uppercase shadow-sm transition-all duration-200 hover:bg-[var(--gray-3)] hover:text-[var(--gray-13)] active:scale-95'
                onClick={generateApiKey}
              >
                <Icon className='h-3 w-3' name='tabler:refresh' />
                Regenerate
              </button>
            </div>
          ) : (
            <div className='flex items-start gap-3'>
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold shadow-sm',
                  isKeyGenerated
                    ? 'bg-[var(--green-2)] text-[var(--green-9)]'
                    : 'bg-[var(--orange-2)] text-[var(--orange-9)]',
                )}
              >
                <Icon
                  className='h-4 w-4'
                  name={isKeyGenerated ? 'tabler:circle-check' : 'tabler:key'}
                />
              </div>
              <div className='min-w-0 flex-1 space-y-2'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <h4 className='text-[11px] font-extrabold tracking-wider text-[var(--gray-12)] uppercase'>
                    {isKeyGenerated
                      ? 'Authentication Setup Active'
                      : 'Authentication Required'}
                  </h4>
                  {isKeyGenerated && (
                    <span className='inline-flex items-center gap-1 rounded border border-[var(--green-3)] bg-[var(--green-2)] px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-[var(--green-9)] uppercase shadow-sm'>
                      <Icon className='h-3 w-3' name='tabler:check' />
                      Step Completed
                    </span>
                  )}
                </div>
                <p className='text-xs leading-relaxed text-[var(--gray-11)]'>
                  {isKeyGenerated
                    ? 'Your sandbox API key has been created successfully. Copy it now, as it will be hidden for security once you close this panel.'
                    : 'You must generate a sandbox API key to authorize the interactive sandbox. This token will act as a Bearer authorization token.'}
                </p>

                {isKeyGenerated && (
                  <div className='flex flex-col gap-1.5'>
                    <div className='mt-1 flex max-w-full items-center gap-2 overflow-hidden rounded-lg border border-[var(--gray-3)] bg-surface px-2.5 py-1.5 font-mono text-[11px] shadow-inner'>
                      <span className='shrink-0 font-bold text-[var(--gray-10)] select-none'>
                        Token:
                      </span>
                      <span className='flex-1 truncate font-semibold break-all text-[var(--gray-13)]'>
                        {showKey ? apiKey : 'ez_live_••••••••••••••••'}
                      </span>
                      <div className='flex shrink-0 items-center gap-1'>
                        <button
                          className='flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-1 text-[var(--gray-9)] transition-colors hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)]'
                          title={showKey ? 'Hide Key' : 'Show Key'}
                          onClick={() => setShowKey(!showKey)}
                        >
                          <Icon
                            className='h-3.5 w-3.5'
                            name={showKey ? 'tabler:eye-off' : 'tabler:eye'}
                          />
                        </button>
                        <button
                          className='flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-1 text-[var(--gray-9)] transition-colors hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)]'
                          title='Copy API Key'
                          onClick={() =>
                            copyToClipboard(apiKey, 'generated-api-key')
                          }
                        >
                          <Icon
                            className='h-3.5 w-3.5'
                            name={
                              copiedId === 'generated-api-key'
                                ? 'tabler:check'
                                : 'tabler:copy'
                            }
                          />
                        </button>
                      </div>
                    </div>
                    <span className='flex items-center gap-1 text-[10px] font-medium text-[var(--orange-9)]'>
                      <Icon
                        className='h-3.5 w-3.5'
                        name='tabler:alert-triangle'
                      />
                      For security, you cannot view or copy this key after
                      closing this view.
                    </span>
                  </div>
                )}

                <div className='flex items-center gap-2 pt-1.5'>
                  <button
                    className={cn(
                      'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none px-3.5 py-1.5 text-[11px] font-bold shadow-sm transition-all duration-200 active:scale-95',
                      isKeyGenerated
                        ? 'bg-[var(--gray-2)] text-[var(--gray-12)] hover:bg-[var(--gray-3)] hover:text-[var(--gray-13)]'
                        : 'bg-[var(--primary-9)] text-white hover:bg-[var(--primary-10)]',
                    )}
                    onClick={generateApiKey}
                  >
                    <Icon
                      className='h-3.5 w-3.5'
                      name={isKeyGenerated ? 'tabler:refresh' : 'tabler:key'}
                    />
                    {isKeyGenerated ? 'Regenerate API Key' : 'Generate API Key'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className='space-y-4'>
          {endpoints.map((endpoint) => {
            const isExpanded = expandedEndpoints[endpoint.id]

            const requestHeaders = {
              'Authorization': apiKey
                ? `Bearer ${apiKey}`
                : 'Bearer <YOUR_API_TOKEN>',
              'Content-Type': 'application/json',
              ...endpoint.headers,
            }

            const fullApiEndpoint =
              endpoint.apiEndpoint ||
              (endpoint.apiPath.startsWith('http')
                ? endpoint.apiPath
                : `${DEFAULT_API_HOST}${endpoint.apiPath}`)

            const headerLines = Object.entries(requestHeaders)
              .map(([key, value]) => `  -H "${key}: ${value}" \\`)
              .join('\n')

            const curlCode = endpoint.requestPayload
              ? `curl -X ${endpoint.method} ${fullApiEndpoint} \\\n${headerLines}\n  -d '${stringifyJson(endpoint.requestPayload).replace(/\n/g, '\n  ')}'`
              : `curl -X ${endpoint.method} ${fullApiEndpoint} \\\n${headerLines}`

            return (
              <div
                className='overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface shadow-sm'
                key={endpoint.id}
              >
                {/* Accordion Header */}
                <button
                  className='flex w-full cursor-pointer items-center justify-between border-none bg-[var(--gray-1)] px-4 py-3 text-left transition-colors hover:bg-[var(--gray-2)]'
                  onClick={() => toggleEndpoint(endpoint.id)}
                >
                  <div className='flex min-w-0 flex-1 flex-col gap-1 pr-4'>
                    <div className='flex items-center gap-2'>
                      <span
                        className={cn(
                          'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-extrabold uppercase',
                          endpoint.method === 'GET'
                            ? 'border-[var(--blue-3)] bg-[var(--blue-1)] text-[var(--blue-9)]'
                            : endpoint.method === 'POST'
                              ? 'border-[var(--green-3)] bg-[var(--green-1)] text-[var(--green-9)]'
                              : endpoint.method === 'PUT'
                                ? 'border-[var(--orange-3)] bg-[var(--orange-1)] text-[var(--orange-9)]'
                                : endpoint.method === 'DELETE'
                                  ? 'border-[var(--red-3)] bg-[var(--red-1)] text-[var(--red-9)]'
                                  : 'border-[var(--gray-3)] bg-[var(--gray-2)] text-[var(--gray-11)]',
                        )}
                      >
                        {endpoint.method}
                      </span>
                      <span className='truncate text-xs font-bold text-[var(--gray-13)]'>
                        {endpoint.title}
                      </span>
                    </div>
                    {!isExpanded && endpoint.description && (
                      <span className='truncate text-[10px] text-[var(--gray-11)] hover:overflow-visible hover:whitespace-normal'>
                        {endpoint.description}
                      </span>
                    )}
                  </div>
                  <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[var(--gray-3)]'>
                    <Icon
                      name='tabler:chevron-down'
                      className={cn(
                        'h-4 w-4 text-[var(--gray-11)] transition-transform duration-300',
                        isExpanded ? 'rotate-180' : 'rotate-0',
                      )}
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
                          href={playgroundUrl}
                          rel='noopener noreferrer'
                          target='_blank'
                        >
                          <Icon
                            className='h-3.5 w-3.5'
                            name='tabler:external-link'
                          />
                          Try it out
                        </a>
                      </div>
                      <div className='flex items-start gap-2 rounded-lg border border-[var(--gray-3)] bg-[var(--gray-1)] px-3 py-2 text-xs'>
                        <span className='mt-0.5 flex-1 font-mono font-semibold break-all text-[var(--gray-12)]'>
                          {fullApiEndpoint}
                        </span>
                        <button
                          className='flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-1 text-[var(--gray-9)] transition-colors hover:bg-[var(--gray-3)] hover:text-[var(--gray-12)]'
                          title='Copy Endpoint'
                          onClick={() =>
                            copyToClipboard(
                              fullApiEndpoint,
                              `endpoint-${endpoint.id}`,
                            )
                          }
                        >
                          <Icon
                            className='h-3.5 w-3.5'
                            name={
                              copiedId === `endpoint-${endpoint.id}`
                                ? 'tabler:check'
                                : 'tabler:copy'
                            }
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
                        {Object.entries(requestHeaders).map(
                          ([key, value], index) => (
                            <div
                              key={key}
                              className={cn(
                                'grid grid-cols-3 px-3 py-2 font-mono text-[11px]',
                                index <
                                  Object.entries(requestHeaders).length - 1 &&
                                  'border-b border-[var(--gray-3)]',
                              )}
                            >
                              <span className='font-bold text-[var(--gray-12)]'>
                                {key}
                              </span>
                              <span className='col-span-2 text-[var(--gray-11)]'>
                                {value}
                              </span>
                            </div>
                          ),
                        )}
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
                            onClick={() =>
                              copyToClipboard(
                                stringifyJson(endpoint.requestPayload),
                                `payload-${endpoint.id}`,
                              )
                            }
                          >
                            <Icon
                              className='h-3.5 w-3.5'
                              name={
                                copiedId === `payload-${endpoint.id}`
                                  ? 'tabler:check'
                                  : 'tabler:copy'
                              }
                            />
                            <span>
                              {copiedId === `payload-${endpoint.id}`
                                ? 'Copied!'
                                : 'Copy'}
                            </span>
                          </button>
                        </div>
                        <pre className='scrollbar overflow-x-auto rounded-lg border border-[var(--gray-12)] bg-[var(--gray-13)] p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[var(--green-9)] select-all'>
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
                          onClick={() =>
                            copyToClipboard(curlCode, `curl-${endpoint.id}`)
                          }
                        >
                          <Icon
                            className='h-3.5 w-3.5'
                            name={
                              copiedId === `curl-${endpoint.id}`
                                ? 'tabler:check'
                                : 'tabler:copy'
                            }
                          />
                          <span>
                            {copiedId === `curl-${endpoint.id}`
                              ? 'Copied!'
                              : 'Copy'}
                          </span>
                        </button>
                      </div>
                      <pre className='scrollbar overflow-x-auto rounded-lg border border-[var(--gray-12)] bg-[var(--gray-13)] p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[var(--blue-9)] select-all'>
                        {curlCode}
                      </pre>
                    </div>

                    {/* Response Snippet */}
                    {endpoint.responsePayload && (
                      <div className='relative space-y-2'>
                        <h4 className='text-[10px] font-bold tracking-wider text-[var(--gray-11)] uppercase'>
                          Response Payload
                        </h4>
                        <pre className='scrollbar overflow-x-auto rounded-lg border border-[var(--gray-12)] bg-[var(--gray-13)] p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[var(--orange-9)]'>
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
