import { useLingui } from '@lingui/react/macro'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { getFormsListQueryOptions } from '@/api/form/queries'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import { resolveAskAiPageContext } from '@/components/common/ask-ai/chatbotApi'
import useAskAiActionStore from '@/components/common/ask-ai/stores/useAskAiActionStore'
import { queryClient } from '@/lib/tanstack-query/queryClient'
import cn from '@/utils/cn'
import {
  fetchGlobalSearch,
  getSearchHitDate,
  getSearchHitIcon,
  getSearchHitTitle,
  type GlobalSearchHit,
} from './globalSearchApi'
import {
  mergeSearchHits,
  searchAllLocalData,
  searchLocalAppData,
} from './localAppSearch'
import { foundLine, hl, lineFor, searchMock } from './mockSearch'

const CACHE_EMPTY_API_DEBOUNCE_MS = 450

const GlobalSearch = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const pageContext = useAskAiActionStore((state) => state.pageContext)
  const setPending = useAskAiActionStore((state) => state.setPending)

  const [opened, setOpened] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GlobalSearchHit[]>([])
  const [resultsSource, setResultsSource] = useState<'cache' | 'api' | 'dummy'>(
    'cache',
  )
  const [useDummyData] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestIdRef = useRef(0)
  const apiInFlightRef = useRef(false)
  const lastApiQueryRef = useRef('')

  const applyCacheResults = (searchText: string) => {
    const trimmed = searchText.trim()
    if (!trimmed) {
      setResults([])
      return
    }

    // API cache + already-loaded folders/workflows/forms/requests.
    setResults(searchAllLocalData(trimmed))
    setResultsSource('cache')
  }

  const closeSearch = () => {
    setOpened(false)
    setQuery('')
    setLoading(false)
    setResults([])
    setResultsSource('cache')
    if (!apiInFlightRef.current) {
      lastApiQueryRef.current = ''
    }
  }

  useEffect(() => {
    if (!opened) return

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 30)

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        closeSearch()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)

    // Warm Forms list so form names are searchable without visiting /forms first.
    void queryClient
      .ensureQueryData(getFormsListQueryOptions(1, 100, '', []))
      .then(() => {
        if (!apiInFlightRef.current) {
          const current = inputRef.current?.value?.trim() || ''
          if (current) {
            setResults(searchAllLocalData(current))
            setResultsSource('cache')
          }
        }
      })
      .catch(() => {
        // Forms prefetch is best-effort for local search.
      })

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [opened])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      if (!loading && !apiInFlightRef.current) setResults([])
      return
    }

    // Don't clobber in-flight / just-returned API results with a stale cache read.
    if (apiInFlightRef.current) return
    if (
      lastApiQueryRef.current &&
      lastApiQueryRef.current.toLowerCase() === trimmed.toLowerCase()
    ) {
      return
    }

    if (useDummyData) {
      const timer = window.setTimeout(() => {
        setResults(searchMock(trimmed))
        setResultsSource('dummy')
        setLoading(false)
      }, 200)
      return () => window.clearTimeout(timer)
    }

    // Instant local/cache filter while typing.
    applyCacheResults(trimmed)
  }, [query, useDummyData, loading])

  const runApiSearch = async (searchText?: string) => {
    const trimmed = (searchText ?? inputRef.current?.value ?? query).trim()
    if (!trimmed) {
      inputRef.current?.focus()
      return
    }

    const requestId = ++requestIdRef.current
    apiInFlightRef.current = true
    lastApiQueryRef.current = ''
    setOpened(true)
    setLoading(true)
    setQuery(trimmed)

    if (useDummyData) {
      const hits = searchMock(trimmed)
      if (requestId === requestIdRef.current) {
        setResults(hits)
        setResultsSource('dummy')
        lastApiQueryRef.current = trimmed
        apiInFlightRef.current = false
        setLoading(false)
      }
      return
    }

    // Show cache immediately while the API loads.
    applyCacheResults(trimmed)

    const resolvedContext = resolveAskAiPageContext(pathname, pageContext)
    try {
      const hits = await fetchGlobalSearch({
        actionFrom: resolvedContext.actionFrom,
        query: trimmed,
        specificId: resolvedContext.specificId || '',
      })
      if (requestId !== requestIdRef.current) return
      // Keep already-loaded app hits alongside API results.
      setResults(mergeSearchHits(hits, searchLocalAppData(trimmed)))
      setResultsSource('api')
      lastApiQueryRef.current = trimmed
    } catch {
      if (requestId !== requestIdRef.current) return
      applyCacheResults(trimmed)
    } finally {
      if (requestId === requestIdRef.current) {
        apiInFlightRef.current = false
        setLoading(false)
      }
    }
  }

  // When local/cache has no hits, call the API after typing settles.
  useEffect(() => {
    if (!opened || useDummyData) return
    const trimmed = query.trim()
    if (!trimmed) return
    if (apiInFlightRef.current) return
    if (
      lastApiQueryRef.current &&
      lastApiQueryRef.current.toLowerCase() === trimmed.toLowerCase()
    ) {
      return
    }

    const localHits = searchAllLocalData(trimmed)
    if (localHits.length > 0) return

    const timer = window.setTimeout(() => {
      if (apiInFlightRef.current) return
      const current = (inputRef.current?.value || '').trim()
      if (!current || current.toLowerCase() !== trimmed.toLowerCase()) return
      if (
        lastApiQueryRef.current &&
        lastApiQueryRef.current.toLowerCase() === current.toLowerCase()
      ) {
        return
      }
      void runApiSearch(current)
    }, CACHE_EMPTY_API_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [query, opened, useDummyData])

  const openAllResults = () => {
    const searchText = query.trim()
    if (!searchText) return

    void navigate({ to: '/search', search: { q: searchText } })
    closeSearch()
  }

  const openHit = (hit: GlobalSearchHit) => {
    const rawRepoId =
      typeof hit.id === 'object' && hit.id !== null
        ? hit.id.repositoryId
        : undefined
    const rawItemId =
      typeof hit.id === 'object' && hit.id !== null
        ? hit.id.itemId
        : undefined
    const formId =
      typeof hit.id === 'object' && hit.id !== null
        ? String(hit.id.formId || hit.id.masterFormId || '').trim()
        : ''
    const formEntryId =
      typeof hit.id === 'object' && hit.id !== null
        ? String(hit.id.formEntryId || '').trim()
        : ''
    const workflowId =
      typeof hit.id === 'object' && hit.id !== null
        ? String(hit.id.workflowId || '').trim()
        : ''
    const instanceId =
      typeof hit.id === 'object' && hit.id !== null
        ? String(hit.id.instanceId || '').trim()
        : ''
    const repositoryId = String(rawRepoId || '').trim()
    const itemId = String(rawItemId || '').trim()
    const title = getSearchHitTitle(hit)
    const type = String(hit.type || hit.entity_type || '').toLowerCase()

    // Requests → /requests deep-link (workflow + process)
    if (
      type.includes('request') ||
      (instanceId && workflowId && !type.includes('document'))
    ) {
      if (workflowId && instanceId) {
        void navigate({
          search: {
            processId: instanceId,
            workflowId,
          },
          to: '/requests',
        })
      } else {
        void navigate({ to: '/requests' })
      }
      closeSearch()
      return
    }

    // Forms → form entries (or forms list)
    if (type.includes('form') || type.includes('master') || formId) {
      if (formId) {
        void navigate({
          params: { formId },
          search: formEntryId ? { entryId: formEntryId } : {},
          to: '/forms/$formId/entries',
        })
      } else {
        void navigate({ to: '/forms' })
      }
      closeSearch()
      return
    }

    // Workflows → builder when id known, otherwise workflows list
    if (type.includes('workflow') || type.includes('process')) {
      if (workflowId) {
        void navigate({
          params: { workflowId },
          to: '/workflow-builder/$workflowId',
        })
      } else {
        void navigate({ to: '/workflows' })
      }
      closeSearch()
      return
    }

    // Folders / documents / repositories
    const isFolder = type.includes('folder') || type.includes('repository')
    const repositoryLabel =
      hit.folder ||
      hit.id?.repositoryName ||
      (isFolder ? title : '') ||
      hit.name ||
      'Repository'

    setPending({
      fileSearch: isFolder ? undefined : title,
      filters: {},
      openItemId: itemId || undefined,
      repositoryId: repositoryId || undefined,
      repositoryLabel,
      target: 'Repository',
    })
    void navigate({
      search: {
        ...(repositoryId ? { repositoryId } : {}),
        ...(itemId ? { itemId } : {}),
      },
      to: '/folders',
    })

    closeSearch()
  }

  const showIdle = !query.trim() && !loading
  const showResults = !loading && Boolean(query.trim())
  const searchLabel = query.trim()

  return (
    <div className='relative inline-flex' ref={rootRef}>
      {!opened ? (
        <IconButton
          ariaLabel={t`Search`}
          className='text-gray-11 hover:text-gray-13'
          color='gray'
          icon='lucide:search'
          tooltip={t`Search`}
          variant='ghost'
          onClick={() => setOpened(true)}
        />
      ) : (
        <div
          className={cn(
            'relative flex h-9 w-[460px] items-center gap-2 rounded-lg border px-2.5 transition-colors',
            query.trim()
              ? 'border-primary-6 bg-primary-2'
              : 'border-gray-4 bg-gray-2',
          )}
        >
          <input
            className='min-w-0 flex-1 bg-transparent text-[13.5px] text-gray-13 outline-none placeholder:text-gray-9'
            placeholder={t`Search...`}
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                closeSearch()
                return
              }
              if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                openAllResults()
              }
            }}
          />
          <button
            type='button'
            aria-label={t`Search`}
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-md transition-colors',
              'text-gray-11 hover:bg-gray-4 hover:text-gray-13',
            )}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void runApiSearch()
            }}
          >
            <Icon name='lucide:search' />
          </button>
          {loading && (
            <div className='absolute right-0 bottom-0 left-0 h-0.5 overflow-hidden rounded-b-lg bg-primary-3'>
              <div className='global-search-bar h-full w-1/3 bg-primary-9' />
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {opened && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className='absolute top-[calc(100%+8px)] right-0 z-[100000] w-[460px] overflow-hidden rounded-xl border border-gray-3 bg-surface-raised shadow-xl'
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <style>{`
              @keyframes global-search-bar {
                0% { transform: translateX(-120%); }
                100% { transform: translateX(420%); }
              }
              .global-search-bar {
                animation: global-search-bar 1s ease-in-out infinite;
              }
            `}</style>

            <div className='flex max-h-[420px] min-h-[200px] flex-col overflow-hidden'>
              <AnimatePresence mode='wait'>
                {showIdle && (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className='flex flex-1 flex-col items-center justify-center gap-2 px-6 py-14 text-center'
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key='idle'
                  >
                    <AiBrandIcon
                      alt={t`Search AI`}
                      className='size-[22px] opacity-80'
                      variant='outline-purple'
                    />
                    <p className='text-sm font-medium text-gray-12'>
                      {t`Start typing to search`}
                    </p>
                    <p className='max-w-[280px] text-xs leading-5 text-gray-10'>
                      {t`Type to search the data. To find the Request,Document,Workflows,Folders, `}
                    </p>
                  </motion.div>
                )}

                {loading && (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className='flex flex-col items-center justify-center gap-3 px-4 py-14'
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key='loading'
                  >
                    <motion.div
                      className='text-primary-9'
                      animate={{
                        opacity: [0.55, 1, 0.55],
                        rotate: [0, 8, -8, 0],
                        scale: [0.92, 1.1, 0.92],
                      }}
                      transition={{
                        duration: 1.4,
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
                    <p className='text-xs font-medium text-gray-11'>{t`Searching…`}</p>
                    <div className='h-1 w-44 overflow-hidden rounded-full bg-primary-3'>
                      <div className='global-search-bar h-full w-1/2 rounded-full bg-primary-9' />
                    </div>
                  </motion.div>
                )}

                {showResults && results.length === 0 && (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className='flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center'
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key='empty'
                  >
                    <div className='flex size-10 items-center justify-center rounded-full bg-gray-3 text-gray-10'>
                      <Icon className='size-5' name='lucide:search' />
                    </div>
                    <p className='text-sm font-medium text-gray-12'>
                      {t`No matching results found`}
                    </p>
                    <p className='max-w-[300px] text-xs leading-5 text-gray-10'>
                      {t`We couldn't find any records matching “${searchLabel}”. Try searching with different keywords or check spelling.`}
                    </p>
                  </motion.div>
                )}

                {showResults && results.length > 0 && (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className='flex min-h-0 flex-1 flex-col'
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    key='list'
                  >
                    <div className='flex shrink-0 items-center justify-between border-b border-gray-3 px-3.5 py-2'>
                      <span className='text-[11px] font-semibold tracking-wide text-gray-9 uppercase'>
                        {/* {resultsSource === 'api'
                          ? t`API results`
                          : resultsSource === 'dummy'
                            ? t`Dummy results`
                            : t`Cached results`} */}
                      </span>
                      <span className='text-[11px] text-gray-9'>
                        {results.length} {t`found`}
                      </span>
                    </div>
                    <ul className='ez-scrollbar min-h-0 flex-1 divide-y divide-gray-3 overflow-y-auto pb-1'>
                      {results.map((hit, index) => {
                        const isDummy =
                          useDummyData || resultsSource === 'dummy'

                        const title = getSearchHitTitle(hit)
                        const titleHtml =
                          hit.needles && hit.needles.length > 0
                            ? hl(title, hit.needles)
                            : title

                        const iconName = getSearchHitIcon(hit.type)
                        const hitType = String(
                          hit.type || hit.entity_type || '',
                        ).toLowerCase()
                        const isDocumentHit =
                          hitType.includes('document') ||
                          hitType.includes('file')
                        const badges = (hit.badges || []).filter(
                          (b) => b.label.toLowerCase() !== 'document',
                        )

                        return (
                          <motion.li
                            animate={{ opacity: 1, y: 0 }}
                            initial={{ opacity: 0, y: 8 }}
                            key={
                              hit.id?.itemId ||
                              hit.id?.formEntryId ||
                              hit.id?.instanceId ||
                              hit.entity_id ||
                              hit.id?.repositoryId ||
                              `${title}-${index}`
                            }
                            transition={{
                              delay: Math.min(index, 12) * 0.03,
                              duration: 0.2,
                            }}
                          >
                            <div
                              className='group flex w-full cursor-pointer items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-gray-2'
                              onClick={() => openHit(hit)}
                            >
                              <div
                                className={cn(
                                  'flex size-8 shrink-0 items-center justify-center rounded-lg border border-gray-4 bg-surface shadow-sm transition-all',
                                  hit.pinned
                                    ? 'border-primary-4 bg-white text-primary-9'
                                    : 'text-gray-11 group-hover:border-gray-6 group-hover:bg-white',
                                )}
                              >
                                <Icon className='size-4' name={iconName} />
                              </div>

                              <div className='min-w-0 flex-1'>
                                <div className='mb-1 flex flex-wrap items-center gap-2'>
                                  <span
                                    className='truncate text-[14.5px] font-semibold text-gray-12'
                                    dangerouslySetInnerHTML={{
                                      __html: titleHtml,
                                    }}
                                  />
                                  {hit.subtitle && (
                                    <span className='text-[13.5px] text-gray-11'>
                                      {hit.subtitle}
                                    </span>
                                  )}
                                  {hit.folder && (
                                    <span className='shrink-0 rounded-full border border-gray-4 bg-gray-3 px-2 py-0.5 text-[11px] font-medium text-gray-11'>
                                      {hit.folder}
                                    </span>
                                  )}

                                  {badges.map((b, i) => {
                                    const colorCls =
                                      b.tone === 'ok'
                                        ? 'bg-green-2 text-green-11 border-transparent'
                                        : b.tone === 'warn'
                                          ? 'bg-amber-2 text-amber-11 border-transparent'
                                          : b.tone === 'err'
                                            ? 'bg-red-2 text-red-11 border-transparent'
                                            : 'bg-gray-3 border-gray-4 text-gray-11'
                                    return (
                                      <span
                                        key={i}
                                        className={cn(
                                          'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                                          colorCls,
                                        )}
                                      >
                                        {b.label}
                                      </span>
                                    )
                                  })}
                                </div>
                                {hit?.matchSource && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="size-[5px] shrink-0 rounded-full bg-[#00bcd4]" />

                                    <div className="line-clamp-1 text-[12.5px] text-slate-500 hover:line-clamp-none">
                                      <span className="font-medium text-gray-11">{query}</span>
                                      {" "}Matched in{" "}
                                      <span className="font-semibold text-primary-9">
                                        {hit.matchSource}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {hit.found && hit.found.length > 0 && (
                                  <div className='flex flex-col gap-1.5'>
                                    <div className='flex items-start gap-2'>
                                      <div className='bg-[#00bcd4] mt-[7px] size-[5px] shrink-0 rounded-full' />
                                      <div
                                        className='line-clamp-1 text-[12.5px] leading-relaxed text-slate-600 hover:line-clamp-none'
                                        dangerouslySetInnerHTML={{
                                          __html: foundLine(
                                            hit.found[0],
                                            hit.needles,
                                          ),
                                        }}
                                      />
                                    </div>
                                    {hit.found.length > 1 && (
                                      <div className='mt-1 cursor-pointer text-[11.5px] font-medium text-primary-9 hover:underline'>
                                        + {hit.found.length - 1} more place
                                        {hit.found.length - 1 === 1
                                          ? ''
                                          : 's'}{' '}
                                        it matched
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.li>
                        )
                      })}
                    </ul>

                    <button
                      className='flex w-full shrink-0 items-center gap-2.5 border-t border-gray-3 bg-surface-raised px-3.5 py-3 text-left transition-colors hover:bg-gray-2'
                      type='button'
                      onClick={() => {
                        if (resultsSource === 'cache' && searchLabel) {
                          void runApiSearch(searchLabel)
                          return
                        }
                        openAllResults()
                      }}
                    >
                      <Icon
                        className='size-4 shrink-0 text-gray-10'
                        name='lucide:search'
                      />
                      <span className='min-w-0 flex-1 truncate text-[13px] text-gray-12'>
                        {t`All search results for “${searchLabel}”`}
                      </span>
                      <span className='shrink-0 text-[12px] text-gray-9'>
                        {t`Press`} <span>ENTER</span>
                      </span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

GlobalSearch.displayName = 'GlobalSearch'
export default GlobalSearch