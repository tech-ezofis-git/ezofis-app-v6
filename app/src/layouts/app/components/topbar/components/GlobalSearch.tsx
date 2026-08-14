import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Menu from '@/components/base/menu/Menu'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import useAskAiActionStore from '@/components/common/ask-ai/stores/useAskAiActionStore'
import cn from '@/utils/cn'

import {
  fetchGlobalSearch,
  formatSearchDate,
  getSearchHitTitle,
  type GlobalSearchHit,
} from './globalSearchApi'

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getMatchSourceLabel = (source?: string) => {
  switch (source?.trim().toLowerCase()) {
    case 'field':
      return 'Matched in document fields'

    case 'filename':
      return 'Matched by file name'

    case 'content':
      return 'Matched in document content'

    case 'repository':
      return 'Matched in repository'

    case 'workflow':
      return 'Matched in workflow'

    case 'semantic':
      return 'AI semantic match'

    default:
      return 'Search match'
  }
}

const normalizeScore = (score?: number) => {
  if (score === undefined || score === null) {
    return null
  }

  return score <= 1 ? score * 100 : score
}

const getScoreLabel = (score?: number) => {
  const value = normalizeScore(score)

  if (value === null) {
    return null
  }

  return `${Math.round(value)}%`
}

const getScoreWidth = (score?: number) => {
  const value = normalizeScore(score)

  if (value === null) {
    return '0%'
  }

  return `${Math.max(0, Math.min(100, value))}%`
}

const getStatusClassName = (status?: string) => {
  const normalized = status?.trim().toLowerCase()

  if (normalized === 'exact' || normalized === 'in range') {
    return 'bg-emerald-50 text-emerald-700'
  }

  return 'bg-gray-3 text-gray-10'
}

/* -------------------------------------------------------------------------- */
/* Temporary sample match data                                                */
/* -------------------------------------------------------------------------- */

/**
 * TEMPORARY
 *
 * Search results still come from your real fetchGlobalSearch API.
 * This only injects matchInfo until the API starts returning it.
 *
 * Once backend supports matchInfo:
 *
 * remove addSampleMatchInfo()
 *
 * and change:
 *
 * setResults(addSampleMatchInfo(hits))
 *
 * to:
 *
 * setResults(hits)
 */
const addSampleMatchInfo = (
  hits: GlobalSearchHit[],
): GlobalSearchHit[] => {
  const samples = [
    {
      score: 92,
      matchedFields: [
        {
          fieldName: 'Supplier Name',
          fieldValue: 'Kaltech Industries',
          status: 'exact',
        },
        {
          fieldName: 'Invoice Amount',
          fieldValue: '84,500.00 AED',
          status: '> 50,000',
        },
        {
          fieldName: 'Invoice Date',
          fieldValue: '18 May 2026',
          status: 'in range',
        },
        {
          fieldName: 'PO Number',
          fieldValue: 'PO-2026-991',
        },
      ],
      aiExplanation:
        'Supplier name, invoice amount and invoice date strongly align with the search criteria. The PO reference also supports this result.',
    },

    {
      score: 87,
      matchedFields: [
        {
          fieldName: 'Supplier Name',
          fieldValue: 'Kaltech Industries',
          status: 'exact',
        },
        {
          fieldName: 'Invoice Amount',
          fieldValue: '62,300.00 AED',
        },
        {
          fieldName: 'Payment Terms',
          fieldValue: 'Net 45',
        },
      ],
      aiExplanation:
        'This invoice was identified because the supplier information and invoice amount are closely related to the current search.',
    },

    {
      score: 74,
      matchedFields: [
        {
          fieldName: 'Supplier Name',
          fieldValue: 'Kaltech Industries',
        },
        {
          fieldName: 'Open Balance',
          fieldValue: '71,900.00 AED',
        },
      ],
      aiExplanation:
        'The supplier and balance information are relevant to the current search, although fewer fields matched than the higher-ranked results.',
    },

    {
      score: 81,
      matchedFields: [
        {
          fieldName: 'Invoice Number',
          fieldValue: 'INV-2026-5001',
          status: 'exact',
        },
        {
          fieldName: 'Invoice Date',
          fieldValue: '22 Jul 2026',
        },
      ],
      aiExplanation:
        'The invoice number matched exactly and the invoice date provides additional supporting context.',
    },
  ]

  return hits.map((hit, index) => {
    if (hit.matchInfo) {
      return hit
    }

    return {
      ...hit,
      matchInfo: samples[index % samples.length],
    }
  })
}

const getMatchSummary = (hit: GlobalSearchHit) => {
  const fields = hit.matchInfo?.matchedFields

  if (fields?.length) {
    const firstField = fields[0]

    if (firstField.fieldName && firstField.fieldValue) {
      return `Matched in ${firstField.fieldName}: ${firstField.fieldValue}`
    }

    if (firstField.fieldName) {
      return `Matched in ${firstField.fieldName}`
    }
  }

  if (hit.matchInfo?.fieldName) {
    if (hit.matchInfo.fieldValue) {
      return `Matched in ${hit.matchInfo.fieldName}: ${hit.matchInfo.fieldValue}`
    }

    return `Matched in ${hit.matchInfo.fieldName}`
  }

  return (
    hit.matchInfo?.label ||
    getMatchSourceLabel(hit.matchSource)
  )
}

/* -------------------------------------------------------------------------- */
/* Global Search                                                              */
/* -------------------------------------------------------------------------- */

const GlobalSearch = () => {
  const { t } = useLingui()
  const navigate = useNavigate()

  const pageContext = useAskAiActionStore(
    (state) => state.pageContext,
  )

  const setPending = useAskAiActionStore(
    (state) => state.setPending,
  )

  const [opened, setOpened] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GlobalSearchHit[]>([])
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const requestIdRef = useRef(0)

  /* ------------------------------------------------------------------------ */
  /* Open / close                                                             */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!opened) {
      setQuery('')
      setDebouncedQuery('')
      setLoading(false)
      setResults([])
      setError('')
      setExpandedId(null)

      return
    }

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 30)

    return () => {
      window.clearTimeout(focusTimer)
    }
  }, [opened])

  /* ------------------------------------------------------------------------ */
  /* Debounce                                                                 */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const trimmed = query.trim()

    if (!trimmed) {
      setDebouncedQuery('')
      setLoading(false)
      setResults([])
      setError('')
      setExpandedId(null)

      return
    }

    setLoading(true)
    setError('')

    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmed)
    }, 400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [query])

  /* ------------------------------------------------------------------------ */
  /* API search                                                               */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([])
      setLoading(false)

      return
    }

    const requestId = ++requestIdRef.current

    setLoading(true)

    void fetchGlobalSearch({
      actionFrom:
        pageContext?.actionFrom ||
        'Repository',

      query: debouncedQuery,

      specificId:
        pageContext?.specificId ||
        '',
    })
      .then((hits) => {
        if (requestId !== requestIdRef.current) {
          return
        }

        const enrichedHits = addSampleMatchInfo(hits)

        setResults(enrichedHits)
        setError('')
        setExpandedId(null)
      })
      .catch((err: unknown) => {
        if (requestId !== requestIdRef.current) {
          return
        }

        setResults([])

        setError(
          err instanceof Error
            ? err.message
            : t`Could not complete search.`,
        )
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      })
  }, [
    debouncedQuery,
    pageContext?.actionFrom,
    pageContext?.specificId,
    t,
  ])

  /* ------------------------------------------------------------------------ */
  /* Open all                                                                 */
  /* ------------------------------------------------------------------------ */

  const openAllResults = () => {
    const searchText =
      query.trim() ||
      debouncedQuery

    if (!searchText) {
      return
    }

    setPending({
      fileSearch: searchText,

      filters: {},

      repositoryId:
        pageContext?.specificId ||
        undefined,

      repositoryLabel: 'Repository',

      target: 'Repository',
    })

    void navigate({
      to: '/folders',
    })

    setOpened(false)
  }

  /* ------------------------------------------------------------------------ */
  /* Open document                                                            */
  /* ------------------------------------------------------------------------ */

  const openHit = (
    hit: GlobalSearchHit,
  ) => {
    const repositoryId = String(
      hit.id?.repositoryId || '',
    ).trim()

    const itemId = String(
      hit.id?.itemId || '',
    ).trim()

    const fileName =
      hit.ifileName?.trim() ||
      getSearchHitTitle(hit) ||
      'Untitled document'

    const type = String(
      hit.type || '',
    ).toLowerCase()

    if (
      type.includes('workflow') ||
      type.includes('process')
    ) {
      setPending({
        filters: {},

        target: 'Workflow',

        workflowId: String(
          hit.id?.workflowId || '',
        ),
      })

      void navigate({
        to: '/workflows',
      })
    } else {
      setPending({
        fileSearch: fileName,

        filters: {},

        openItemId:
          itemId ||
          undefined,

        repositoryId:
          repositoryId ||
          undefined,

        repositoryLabel:
          hit.name?.trim() ||
          'Repository',

        target: 'Repository',
      })

      void navigate({
        to: '/folders',
      })
    }

    setOpened(false)
  }

  /* ------------------------------------------------------------------------ */
  /* Expand                                                                   */
  /* ------------------------------------------------------------------------ */

  const toggleExpanded = (
    key: string,
  ) => {
    setExpandedId((current) =>
      current === key
        ? null
        : key,
    )
  }

  const showIdle =
    !query.trim() &&
    !loading

  const showResults =
    !loading &&
    Boolean(debouncedQuery)

  const searchLabel =
    query.trim() ||
    debouncedQuery

  return (
    <Menu
      className='!p-0'
      closeOnItemClick={false}
      offset={8}
      opened={opened}
      position='bottom-end'
      width={560}
      target={
        opened ? (
          <div
            className={cn(
              'relative flex h-9 w-[560px] items-center gap-2 rounded-lg border px-2.5 transition-colors',
              query.trim()
                ? 'border-primary-6 bg-primary-2'
                : 'border-gray-4 bg-gray-2',
            )}
            onClick={(event) => {
              event.stopPropagation()
            }}
            onMouseDown={(event) => {
              event.stopPropagation()
            }}
          >
            <input
              ref={inputRef}
              value={query}
              className='min-w-0 flex-1 bg-transparent text-[13.5px] text-gray-13 outline-none placeholder:text-gray-9'
              placeholder={t`Search...`}
              onChange={(event) => {
                setQuery(event.target.value)
              }}
              onKeyDown={(event) => {
                event.stopPropagation()

                if (event.key === 'Escape') {
                  setOpened(false)
                  return
                }

                if (
                  event.key === 'Enter' &&
                  searchLabel
                ) {
                  event.preventDefault()

                  openAllResults()
                }
              }}
            />

            <button
              aria-label={t`Search`}
              className='grid size-7 shrink-0 place-items-center rounded-md text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-13'
              type='button'
              onClick={(event) => {
                event.stopPropagation()

                if (searchLabel) {
                  openAllResults()
                }
              }}
            >
              <Icon
                className='size-4'
                name='lucide:search'
              />
            </button>

            {loading && (
              <div className='absolute right-0 bottom-0 left-0 h-0.5 overflow-hidden rounded-b-lg bg-primary-3'>
                <div className='global-search-bar h-full w-1/3 bg-primary-9' />
              </div>
            )}
          </div>
        ) : (
          <IconButton
            ariaLabel={t`Search`}
            className='text-gray-11 hover:text-gray-13'
            color='gray'
            icon='lucide:search'
            tooltip={t`Search`}
            variant='ghost'
          />
        )
      }
      onChange={setOpened}
    >
      <div
        className='overflow-hidden rounded-xl border border-gray-3 bg-surface-raised shadow-lg'
        onClick={(event) => {
          event.stopPropagation()
        }}
        onMouseDown={(event) => {
          event.stopPropagation()
        }}
      >
        <style>{`
          @keyframes global-search-bar {
            0% {
              transform: translateX(-120%);
            }

            100% {
              transform: translateX(420%);
            }
          }

          .global-search-bar {
            animation:
              global-search-bar
              1s
              ease-in-out
              infinite;
          }
        `}</style>

        <div className='flex max-h-[620px] min-h-[200px] flex-col overflow-hidden'>
          <AnimatePresence mode='wait'>

            {/* ============================================================ */}
            {/* IDLE                                                         */}
            {/* ============================================================ */}

            {showIdle && (
              <motion.div
                key='idle'
                animate={{
                  opacity: 1,
                }}
                initial={{
                  opacity: 0,
                }}
                exit={{
                  opacity: 0,
                }}
                className='flex flex-1 flex-col items-center justify-center gap-2 px-6 py-14 text-center'
              >
                <AiBrandIcon
                  alt={t`Search AI`}
                  className='size-[22px] opacity-80'
                  variant='outline-purple'
                />

                <p className='text-sm font-medium text-gray-12'>
                  {t`Start typing to search`}
                </p>

                <p className='max-w-[300px] text-xs leading-5 text-gray-10'>
                  {t`Search documents, folders, requests, and more across your workspace.`}
                </p>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* LOADING                                                      */}
            {/* ============================================================ */}

            {loading && (
              <motion.div
                key='loading'
                animate={{
                  opacity: 1,
                }}
                initial={{
                  opacity: 0,
                }}
                exit={{
                  opacity: 0,
                }}
                className='flex flex-col items-center justify-center gap-3 px-4 py-14'
              >
                <motion.div
                  animate={{
                    opacity: [
                      0.55,
                      1,
                      0.55,
                    ],

                    scale: [
                      0.92,
                      1.08,
                      0.92,
                    ],
                  }}
                  transition={{
                    duration: 1.3,
                    ease: 'easeInOut',
                    repeat: Infinity,
                  }}
                >
                  <AiBrandIcon
                    alt={t`Searching AI`}
                    className='size-[24px]'
                    variant='outline-purple'
                  />
                </motion.div>

                <p className='text-xs font-medium text-gray-11'>
                  {t`Searching…`}
                </p>

                <div className='h-1 w-44 overflow-hidden rounded-full bg-primary-3'>
                  <div className='global-search-bar h-full w-1/2 rounded-full bg-primary-9' />
                </div>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* ERROR                                                        */}
            {/* ============================================================ */}

            {showResults && error && (
              <motion.div
                key='error'
                animate={{
                  opacity: 1,
                }}
                initial={{
                  opacity: 0,
                }}
                exit={{
                  opacity: 0,
                }}
                className='px-4 py-12 text-center'
              >
                <Icon
                  className='mx-auto mb-2 size-5 text-gray-8'
                  name='lucide:triangle-alert'
                />

                <p className='text-sm text-gray-10'>
                  {error}
                </p>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* EMPTY                                                        */}
            {/* ============================================================ */}

            {showResults &&
              !error &&
              results.length === 0 && (
                <motion.div
                  key='empty'
                  animate={{
                    opacity: 1,
                  }}
                  initial={{
                    opacity: 0,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className='px-4 py-12 text-center'
                >
                  <Icon
                    className='mx-auto mb-2 size-5 text-gray-8'
                    name='lucide:search-x'
                  />

                  <p className='text-sm font-medium text-gray-11'>
                    {t`No results found`}
                  </p>

                  <p className='mt-1 text-xs text-gray-9'>
                    {t`No results for “${debouncedQuery}”.`}
                  </p>
                </motion.div>
              )}

            {/* ============================================================ */}
            {/* RESULTS                                                      */}
            {/* ============================================================ */}

            {showResults &&
              !error &&
              results.length > 0 && (
                <motion.div
                  key='results'
                  animate={{
                    opacity: 1,
                  }}
                  initial={{
                    opacity: 0,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  className='flex min-h-0 flex-1 flex-col'
                >
                  <ul className='ez-scrollbar min-h-0 flex-1 overflow-y-auto'>
                    {results.map((hit, index) => {
                      const fileName =
                        hit.ifileName?.trim() ||
                        'Untitled document'

                      const repositoryName =
                        hit.name?.trim()

                      const modifiedDate =
                        formatSearchDate(
                          hit.modifiedDateandtime,
                        )

                      const key = String(
                        hit.id?.itemId ||
                          `${hit.type}-${fileName}-${index}`,
                      )

                      const isExpanded =
                        expandedId === key

                      const matchInfo =
                        hit.matchInfo

                      const matchedFields =
                        matchInfo?.matchedFields ||
                        []

                      const matchSummary =
                        getMatchSummary(hit)

                      const score =
                        getScoreLabel(
                          matchInfo?.score,
                        )

                      const scoreWidth =
                        getScoreWidth(
                          matchInfo?.score,
                        )

                      const hasDetails =
                        Boolean(
                          matchedFields.length ||
                            matchInfo?.aiExplanation ||
                            matchInfo?.snippet ||
                            matchInfo?.fieldName,
                        )

                      return (
                        <motion.li
                          key={key}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          initial={{
                            opacity: 0,
                            y: 4,
                          }}
                          transition={{
                            delay:
                              Math.min(
                                index,
                                8,
                              ) * 0.02,

                            duration: 0.16,
                          }}
                          className='border-b border-gray-3 last:border-b-0'
                        >
                          {/* ================================================== */}
                          {/* RESULT HEADER                                      */}
                          {/* ================================================== */}

                          <div
                            className={cn(
                              'group flex items-start gap-3 px-3.5 py-3 transition-colors cursor-pointer',

                              isExpanded
                                ? 'border-b border-gray-3 bg-gray-2'
                                : 'hover:bg-gray-2',
                            )}
                            onClick={() =>
                                  openHit(hit)
                                }
                          >
                            {/* FILE ICON */}

                            <button
                              aria-label={t`Open document`}
                              type='button'
                              className='mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-2 text-primary-10 transition-colors hover:bg-primary-3'
                              onClick={() =>
                                openHit(hit)
                              }
                            >
                              <Icon
                                className='size-[17px]'
                                name='lucide:file-text'
                              />
                            </button>

                            {/* INFORMATION */}

                            <div className='min-w-0 flex-1'>
                              {/* FILE NAME */}

                              <button
                                type='button'
                                className='block max-w-full text-left'
                                onClick={() =>
                                  openHit(hit)
                                }
                              >
                                <span
                                  title={fileName}
                                  className='block truncate text-[13.5px] font-semibold leading-5 text-gray-13 transition-colors hover:text-primary-10'
                                >
                                  {fileName}
                                </span>
                              </button>

                              {/* REPOSITORY / DATE */}

                              <div className='mt-0.5 flex min-w-0 items-center gap-1.5'>
                                {repositoryName && (
                                  <span
                                    title={repositoryName}
                                    className='max-w-[220px] truncate text-[11.5px] font-medium text-gray-10'
                                  >
                                    {repositoryName}
                                  </span>
                                )}

                                {repositoryName &&
                                  modifiedDate && (
                                    <span className='size-[3px] shrink-0 rounded-full bg-gray-6' />
                                  )}

                                {modifiedDate && (
                                  <span className='shrink-0 text-[11.5px] text-gray-9'>
                                    {modifiedDate}
                                  </span>
                                )}
                              </div>

                              {/* MATCH SUMMARY */}

                              {hit.matchSource && (
                                <div className='mt-1 flex min-w-0 items-center gap-1.5'>
                                  <AiBrandIcon
                                    alt={t`Search match`}
                                    className='size-3 shrink-0'
                                    variant='outline-purple'
                                  />

                                  <span className='min-w-0 truncate text-[11.5px] leading-4 text-primary-10'>
                                    {matchSummary}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* SCORE */}

                            {score &&false&& (
                              <div className='mt-1 flex shrink-0 items-center gap-2'>
                                <div className='h-1 w-8 overflow-hidden rounded-full bg-gray-4'>
                                  <div
                                    className='h-full rounded-full bg-primary-9'
                                    style={{
                                      width:
                                        scoreWidth,
                                    }}
                                  />
                                </div>

                                <span className='min-w-[32px] text-[11.5px] font-semibold text-gray-12'>
                                  {score}
                                </span>
                              </div>
                            )}

                            {/* EXPAND */}

                            {hasDetails &&false&&  (
                              <button
                                aria-label={
                                  isExpanded
                                    ? t`Hide match details`
                                    : t`Show match details`
                                }
                                type='button'
                                className='mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-gray-8 transition-colors hover:bg-gray-3 hover:text-gray-12'
                                onClick={() =>
                                  toggleExpanded(
                                    key,
                                  )
                                }
                              >
                                <Icon
                                  className={cn(
                                    'size-4 transition-transform duration-200',
                                    isExpanded &&
                                      'rotate-180',
                                  )}
                                  name='lucide:chevron-down'
                                />
                              </button>
                            )}
                          </div>

                          {/* ================================================== */}
                          {/* EXPANDED CONTENT                                   */}
                          {/* ================================================== */}

                          <AnimatePresence initial={false}>
                            {isExpanded &&
                              hasDetails && (
                                <motion.div
                                  initial={{
                                    height: 0,
                                    opacity: 0,
                                  }}
                                  animate={{
                                    height: 'auto',
                                    opacity: 1,
                                  }}
                                  exit={{
                                    height: 0,
                                    opacity: 0,
                                  }}
                                  transition={{
                                    duration: 0.18,
                                    ease: 'easeOut',
                                  }}
                                  className='overflow-hidden bg-surface-raised'
                                >
                                  <div className='px-3.5 py-3.5'>
                                    {/* Align with title/content */}

                                    <div className='ml-12 border-l-2 border-primary-4 pl-4 pr-2'>
                                      {/* ====================================== */}
                                      {/* WHY THIS MATCHED                       */}
                                      {/* ====================================== */}

                                      <div>
                                        <div className='flex items-center gap-1.5'>
                                          <AiBrandIcon
                                            alt={t`Why this matched`}
                                            className='size-3.5 shrink-0'
                                            variant='outline-purple'
                                          />

                                          <span className='text-[10.5px] font-semibold uppercase tracking-[0.07em] text-gray-9'>
                                            {t`Why this matched`}
                                          </span>
                                        </div>

                                        {/* Matched field information */}

                                        {matchedFields.length >
                                        0 ? (
                                          <div className='mt-3 space-y-2.5'>
                                            {matchedFields.map(
                                              (
                                                field,
                                                fieldIndex,
                                              ) => (
                                                <div
                                                  key={`${field.fieldName}-${fieldIndex}`}
                                                  className='grid grid-cols-[132px_minmax(0,1fr)_auto] items-center gap-x-3'
                                                >
                                                  {/* FIELD NAME */}

                                                  <span
                                                    title={
                                                      field.fieldName
                                                    }
                                                    className='truncate text-[11.5px] text-gray-9'
                                                  >
                                                    {
                                                      field.fieldName
                                                    }
                                                  </span>

                                                  {/* VALUE */}

                                                  <span
                                                    title={
                                                      field.fieldValue
                                                    }
                                                    className='min-w-0 truncate text-[11.5px] font-medium text-gray-12'
                                                  >
                                                    {
                                                      field.fieldValue
                                                    }
                                                  </span>

                                                  {/* STATUS */}

                                                  {field.status ? (
                                                    <span
                                                      className={cn(
                                                        'shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-medium',
                                                        getStatusClassName(
                                                          field.status,
                                                        ),
                                                      )}
                                                    >
                                                      {
                                                        field.status
                                                      }
                                                    </span>
                                                  ) : (
                                                    <span />
                                                  )}
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        ) : (
                                          <>
                                            {/* Fallback single field */}

                                            {matchInfo?.fieldName && (
                                              <div className='mt-3 grid grid-cols-[132px_minmax(0,1fr)] items-center gap-x-3'>
                                                <span className='text-[11.5px] text-gray-9'>
                                                  {
                                                    matchInfo.fieldName
                                                  }
                                                </span>

                                                <span className='truncate text-[11.5px] font-medium text-gray-12'>
                                                  {
                                                    matchInfo.fieldValue
                                                  }
                                                </span>
                                              </div>
                                            )}

                                            {/* Fallback snippet */}

                                            {matchInfo?.snippet && (
                                              <p className='mt-2 text-[11.5px] leading-5 text-gray-10'>
                                                {
                                                  matchInfo.snippet
                                                }
                                              </p>
                                            )}
                                          </>
                                        )}
                                      </div>

                                      {/* ====================================== */}
                                      {/* AI INSIGHT                             */}
                                      {/* ====================================== */}

                                      {matchInfo?.aiExplanation && (
                                        <div className='mt-4 border-t border-gray-3 pt-3.5'>
                                          <div className='flex items-center gap-1.5'>
                                            <AiBrandIcon
                                              alt={t`AI insight`}
                                              className='size-3.5 shrink-0'
                                              variant='outline-purple'
                                            />

                                            <span className='text-[10.5px] font-semibold uppercase tracking-[0.07em] text-gray-9'>
                                              {t`AI insight`}
                                            </span>
                                          </div>

                                          <p className='mt-2 max-w-[430px] text-[11.5px] leading-[18px] text-gray-10'>
                                            {
                                              matchInfo.aiExplanation
                                            }
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                          </AnimatePresence>
                        </motion.li>
                      )
                    })}
                  </ul>

                  {/* ======================================================== */}
                  {/* ALL SEARCH RESULTS                                       */}
                  {/* ======================================================== */}

                  <button
                    type='button'
                    className='flex w-full shrink-0 items-center gap-2.5 border-t border-gray-3 bg-surface-raised px-3.5 py-3 text-left transition-colors hover:bg-gray-2'
                    onClick={openAllResults}
                  >
                    <span className='flex size-7 shrink-0 items-center justify-center rounded-md bg-gray-3 text-gray-10'>
                      <Icon
                        className='size-3.5'
                        name='lucide:search'
                      />
                    </span>

                    <span className='min-w-0 flex-1 truncate text-[12.5px] font-medium text-gray-12'>
                      {t`All search results for “${searchLabel}”`}
                    </span>

                    <Icon
                      className='size-4 shrink-0 text-gray-8'
                      name='lucide:arrow-right'
                    />
                  </button>
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>
    </Menu>
  )
}

GlobalSearch.displayName = 'GlobalSearch'

export default GlobalSearch