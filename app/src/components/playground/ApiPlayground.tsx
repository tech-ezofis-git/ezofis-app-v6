import { useState } from 'react'
import { getV6ApiBaseUrl } from '@/api/axios'
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

interface ApiPlaygroundProps {
  context?: ApiPlaygroundContext | null
  onClose: () => void
}

const DEFAULT_PLAYGROUND_URL =
  'https://demo.ezofis.com/V6Playground/apikey.html'

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

/** Show start + end of token, mask the middle */
const maskApiKey = (key: string) => {
  if (!key) return ''
  if (key.length <= 12) return `${key.slice(0, 4)}${'•'.repeat(6)}`
  return `${key.slice(0, 10)}${'•'.repeat(8)}${key.slice(-4)}`
}

/** Shared typography — matches app filter / chip standard */
const TEXT_MUTED = 'text-12 font-medium text-text-muted'
const TEXT_SECONDARY = 'text-12 font-medium text-text-secondary'
const TEXT_PRIMARY = 'text-12 font-medium text-text-primary'
const TEXT_SECTION = 'text-12 font-medium text-text-secondary'
const TEXT_CODE = 'font-mono text-12 font-medium'
/** HTTP method chips only (GET / POST / …) */
const TEXT_METHOD = 'text-11 font-medium uppercase tracking-wide'
/** Status chips — same size as method, normal casing */
const TEXT_STATUS = 'text-11 font-medium'
const BTN_PRIMARY =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-primary-9 px-3 py-1.5 text-12 font-medium text-white shadow-sm transition-all hover:bg-primary-10 active:scale-95'
const BTN_SECONDARY =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-gray-2 px-3 py-1.5 text-12 font-medium text-text-primary shadow-sm transition-all hover:bg-gray-3 active:scale-95'

export const ApiPlayground = ({ context, onClose }: ApiPlaygroundProps) => {
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

  const config = context || {}
  const playgroundUrl =
    config.playgroundUrl || config.endpoint || DEFAULT_PLAYGROUND_URL

  // No context registered for the current page — only show key generation.
  const hasContext = Boolean(context)

  // Fallback to legacy single-endpoint if `endpoints` is not provided
  const endpoints: ApiEndpointConfig[] = !hasContext
    ? []
    : config.endpoints || [
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
              ...config.document,
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

  const displayToken = showKey ? apiKey : maskApiKey(apiKey)

  const tokenRow = apiKey ? (
    <div className='flex max-w-full items-center gap-2 overflow-hidden rounded-md border border-border-default bg-surface px-2 py-1.5'>
      <span className={cn(TEXT_MUTED, 'shrink-0 select-none')}>Token:</span>
      <span
        title={showKey ? apiKey : undefined}
        className={cn(
          TEXT_CODE,
          'min-w-0 flex-1 truncate break-all text-text-primary',
        )}
      >
        {displayToken}
      </span>
      <div className='flex shrink-0 items-center gap-0.5'>
        <button
          className='flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-1 text-text-muted transition-colors hover:bg-gray-2 hover:text-text-primary'
          title={showKey ? 'Hide token' : 'Show token'}
          type='button'
          onClick={() => setShowKey((prev) => !prev)}
        >
          <Icon
            className='h-3.5 w-3.5'
            name={showKey ? 'tabler:eye-off' : 'tabler:eye'}
          />
        </button>
        <button
          className='flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-1 text-text-muted transition-colors hover:bg-gray-2 hover:text-text-primary'
          title='Copy token'
          type='button'
          onClick={() => copyToClipboard(apiKey, 'generated-api-key')}
        >
          <Icon
            className='h-3.5 w-3.5'
            name={
              copiedId === 'generated-api-key' ? 'tabler:check' : 'tabler:copy'
            }
          />
        </button>
      </div>
    </div>
  ) : null

  return (
    <div className='flex h-full flex-col bg-surface font-sans text-text-primary'>
      {/* Top Header */}
      <div className='flex items-center justify-between border-b border-border-default bg-gray-1 px-3 py-2'>
        <div className='flex items-center gap-1.5'>
          <Icon
            className='h-4 w-4 text-primary-9'
            name='tabler:file-description'
          />
          <span className={TEXT_PRIMARY}>API Docs</span>
        </div>
        <div className='flex items-center gap-2'>
          <a
            className={BTN_PRIMARY}
            href={playgroundUrl}
            rel='noopener noreferrer'
            target='_blank'
          >
            <Icon className='h-3.5 w-3.5' name='tabler:external-link' />
            Try Playground
          </a>
          <button
            className='cursor-pointer rounded-md border-none bg-transparent p-1 text-text-secondary transition-colors hover:bg-gray-2 hover:text-text-primary'
            title='Close Panel'
            type='button'
            onClick={onClose}
          >
            <Icon className='h-4 w-4' name='tabler:x' />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className='scrollbar flex-1 space-y-3 overflow-y-auto p-3'>
        {/* Intro */}
        <p className={cn(TEXT_SECONDARY, 'leading-snug')}>
          {config.description ||
            (endpoints.length > 0
              ? `This API documentation details how to ${new Intl.ListFormat(
                  'en',
                ).format(
                  endpoints.map((e) => e.title.toLowerCase()),
                )}. You can use this interactive sandbox to test these endpoints.`
              : hasContext
                ? 'This API documentation details the available endpoints, required payloads, and interactive sandbox testing environments.'
                : 'Generate a sandbox API key to authenticate your requests to the EzoFis API. Open this panel from a request to see endpoint-specific documentation and examples.')}
        </p>

        {/* API Authentication Setup Card */}
        <div
          className={cn(
            'rounded-lg border shadow-sm transition-all',
            isKeyGenerated
              ? 'border-green-3 bg-green-1 text-green-9'
              : 'border-dashed border-orange-3 bg-orange-1 text-orange-9',
            isKeyGenerated && !isKeyGeneratedNow
              ? 'px-2.5 py-2'
              : 'flex flex-col gap-2 p-3',
          )}
        >
          {isKeyGenerated && !isKeyGeneratedNow ? (
            <div className='flex flex-col gap-1.5'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex min-w-0 items-center gap-2'>
                  <div className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-green-9 bg-white text-green-9'>
                    <Icon className='h-3 w-3' name='tabler:check' />
                  </div>
                  <div className='flex min-w-0 flex-col gap-0.5'>
                    <span className={TEXT_PRIMARY}>API Key</span>
                    {/* <span
                      className={cn(
                        TEXT_STATUS,
                        'inline-flex w-fit items-center rounded border border-green-9 bg-white px-1.5 py-0.5 text-green-9',
                      )}
                    >
                      Setup completed
                    </span> */}
                  </div>
                </div>
                <button
                  className={cn(BTN_SECONDARY, 'shrink-0 px-2.5')}
                  type='button'
                  onClick={generateApiKey}
                >
                  <Icon className='h-3.5 w-3.5' name='tabler:refresh' />
                  Regenerate
                </button>
              </div>
              {tokenRow}
            </div>
          ) : (
            <div className='flex items-start gap-2.5'>
              <div
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-white font-medium',
                  isKeyGenerated
                    ? 'border-green-9 text-green-9'
                    : 'border-orange-9 text-orange-9',
                )}
              >
                <Icon
                  className='h-3.5 w-3.5'
                  name={isKeyGenerated ? 'tabler:check' : 'tabler:key'}
                />
              </div>
              <div className='min-w-0 flex-1 space-y-1.5'>
                <div className='flex flex-wrap items-center justify-between gap-1.5'>
                  <h4 className={TEXT_PRIMARY}>
                    {isKeyGenerated
                      ? 'Authentication setup active'
                      : 'Authentication required'}
                  </h4>
                  {isKeyGenerated && (
                    <span
                      className={cn(
                        TEXT_STATUS,
                        'inline-flex items-center gap-1 rounded border border-green-9 bg-white px-1.5 py-0.5 text-green-9',
                      )}
                    >
                      <Icon className='h-3 w-3' name='tabler:check' />
                      Step completed
                    </span>
                  )}
                </div>
                <p className={cn(TEXT_SECONDARY, 'leading-snug')}>
                  {isKeyGenerated
                    ? 'Your sandbox API key is ready. The token is partially masked — use Show to reveal it, or Copy to use it as a Bearer token.'
                    : 'You must generate a sandbox API key to authorize the interactive sandbox. This token will act as a Bearer authorization token.'}
                </p>

                {isKeyGenerated && tokenRow}

                <div className='flex items-center gap-2'>
                  <button
                    className={isKeyGenerated ? BTN_SECONDARY : BTN_PRIMARY}
                    type='button'
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

        {hasContext && (
          <div className='space-y-2'>
            {endpoints.map((endpoint) => {
              const isExpanded = expandedEndpoints[endpoint.id]

              const requestHeaders = {
                'Authorization': apiKey
                  ? `Bearer ${apiKey}`
                  : 'Bearer <YOUR_API_TOKEN>',
                'Content-Type': 'application/json',
                ...endpoint.headers,
              }

              const baseHost = getV6ApiBaseUrl()
              const fullApiEndpoint =
                endpoint.apiEndpoint ||
                (endpoint.apiPath.startsWith('http')
                  ? endpoint.apiPath
                  : `${baseHost}${endpoint.apiPath.startsWith('/') ? '' : '/'}${endpoint.apiPath}`)

              const headerLines = Object.entries(requestHeaders)
                .map(([key, value]) => `  -H "${key}: ${value}" \\`)
                .join('\n')

              const curlCode = endpoint.requestPayload
                ? `curl -X ${endpoint.method} ${fullApiEndpoint} \\\n${headerLines}\n  -d '${stringifyJson(endpoint.requestPayload).replace(/\n/g, '\n  ')}'`
                : `curl -X ${endpoint.method} ${fullApiEndpoint} \\\n${headerLines}`

              return (
                <div
                  className='overflow-hidden rounded-lg border border-border-default bg-surface'
                  key={endpoint.id}
                >
                  {/* Accordion Header */}
                  <button
                    className='flex w-full cursor-pointer items-center justify-between border-none bg-gray-1 px-3 py-2 text-left transition-colors hover:bg-gray-2'
                    type='button'
                    onClick={() => toggleEndpoint(endpoint.id)}
                  >
                    <div className='flex min-w-0 flex-1 flex-col gap-0.5 pr-2'>
                      <div className='flex items-center gap-1.5'>
                        <span
                          className={cn(
                            TEXT_METHOD,
                            'shrink-0 rounded border bg-white px-1.5 py-0.5',
                            endpoint.method === 'GET'
                              ? 'border-blue-9 text-blue-9'
                              : endpoint.method === 'POST'
                                ? 'border-green-9 text-green-9'
                                : endpoint.method === 'PUT'
                                  ? 'border-orange-9 text-orange-9'
                                  : endpoint.method === 'DELETE'
                                    ? 'border-red-9 text-red-9'
                                    : 'border-border-default text-text-secondary',
                          )}
                        >
                          {endpoint.method}
                        </span>
                        <span className={cn(TEXT_PRIMARY, 'truncate')}>
                          {endpoint.title}
                        </span>
                      </div>
                      {!isExpanded && endpoint.description && (
                        <span className={cn(TEXT_MUTED, 'truncate')}>
                          {endpoint.description}
                        </span>
                      )}
                    </div>
                    <div className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-border-default'>
                      <Icon
                        name='tabler:chevron-down'
                        className={cn(
                          'h-3.5 w-3.5 text-text-secondary transition-transform duration-200',
                          isExpanded ? 'rotate-180' : 'rotate-0',
                        )}
                      />
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className='space-y-3 border-t border-border-default p-3'>
                      {endpoint.description && (
                        <p className={cn(TEXT_SECONDARY, 'leading-snug')}>
                          {endpoint.description}
                        </p>
                      )}

                      {/* Full Endpoint Details */}
                      <div className='space-y-1.5'>
                        <div className='flex items-center justify-between gap-2'>
                          <h4 className={TEXT_SECTION}>Endpoint URL</h4>
                          <a
                            className={BTN_PRIMARY}
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
                        <div className='flex items-start gap-1.5 rounded-md border border-border-default bg-gray-1 px-2.5 py-1.5'>
                          <span
                            className={cn(
                              TEXT_CODE,
                              'flex-1 break-all text-text-primary',
                            )}
                          >
                            {fullApiEndpoint}
                          </span>
                          <button
                            className='flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-0.5 text-text-muted transition-colors hover:bg-gray-3 hover:text-text-primary'
                            title='Copy Endpoint'
                            type='button'
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
                      <div className='space-y-1.5'>
                        <h4 className={TEXT_SECTION}>Headers</h4>
                        <div className='overflow-hidden rounded-md border border-border-default bg-surface'>
                          <div
                            className={cn(
                              TEXT_SECTION,
                              'grid grid-cols-3 border-b border-border-default bg-gray-1 px-2.5 py-1',
                            )}
                          >
                            <span>Header</span>
                            <span className='col-span-2'>Value</span>
                          </div>
                          {Object.entries(requestHeaders).map(
                            ([key, value], index) => (
                              <div
                                key={key}
                                className={cn(
                                  TEXT_CODE,
                                  'grid grid-cols-3 px-2.5 py-1.5',
                                  index <
                                    Object.entries(requestHeaders).length - 1 &&
                                    'border-b border-border-default',
                                )}
                              >
                                <span className='text-text-primary'>{key}</span>
                                <span className='col-span-2 text-text-secondary'>
                                  {value}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      {/* Request Payload */}
                      {endpoint.requestPayload && (
                        <div className='space-y-1.5'>
                          <div className='flex items-center justify-between gap-2'>
                            <h4 className={TEXT_SECTION}>Request Payload</h4>
                            <button
                              className='flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-0.5 text-text-muted transition-colors hover:bg-gray-3 hover:text-text-primary'
                              type='button'
                              title={
                                copiedId === `payload-${endpoint.id}`
                                  ? 'Copied!'
                                  : 'Copy'
                              }
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
                            </button>
                          </div>
                          <pre
                            className={cn(
                              TEXT_CODE,
                              'scrollbar overflow-x-auto rounded-md border border-gray-12 bg-gray-13 p-2.5 leading-snug whitespace-pre-wrap text-green-9 select-all',
                            )}
                          >
                            {stringifyJson(endpoint.requestPayload)}
                          </pre>
                        </div>
                      )}

                      {/* cURL Snippet */}
                      <div className='space-y-1.5'>
                        <div className='flex items-center justify-between gap-2'>
                          <h4 className={TEXT_SECTION}>cURL Example</h4>
                          <button
                            className='flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-0.5 text-text-muted transition-colors hover:bg-gray-3 hover:text-text-primary'
                            type='button'
                            title={
                              copiedId === `curl-${endpoint.id}`
                                ? 'Copied!'
                                : 'Copy'
                            }
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
                          </button>
                        </div>
                        <pre
                          className={cn(
                            TEXT_CODE,
                            'scrollbar overflow-x-auto rounded-md border border-gray-12 bg-gray-13 p-2.5 leading-snug whitespace-pre-wrap text-blue-9 select-all',
                          )}
                        >
                          {curlCode}
                        </pre>
                      </div>

                      {/* Response Snippet */}
                      {endpoint.responsePayload && (
                        <div className='space-y-1.5'>
                          <h4 className={TEXT_SECTION}>Response Payload</h4>
                          <pre
                            className={cn(
                              TEXT_CODE,
                              'scrollbar overflow-x-auto rounded-md border border-gray-12 bg-gray-13 p-2.5 leading-snug whitespace-pre-wrap text-orange-9',
                            )}
                          >
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
        )}
      </div>
    </div>
  )
}

export default ApiPlayground
