import { useLingui } from '@lingui/react/macro'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import InputText from '@/components/base/inputs/InputText'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import { resolveAskAiPageContext } from '@/components/common/ask-ai/chatbotApi'
import useAskAiActionStore from '@/components/common/ask-ai/stores/useAskAiActionStore'
import {
  fetchGlobalSearch,
  getSearchHitDate,
  getSearchHitIcon,
  getSearchHitTitle,
  type GlobalSearchHit,
} from '@/layouts/app/components/topbar/components/globalSearchApi'
import {
  mergeSearchHits,
  searchAllLocalData,
  searchLocalAppData,
} from '@/layouts/app/components/topbar/components/localAppSearch'
import {
  foundLine,
  hl,
} from '@/layouts/app/components/topbar/components/mockSearch'
import cn from '@/utils/cn'

const CACHE_EMPTY_API_DEBOUNCE_MS = 450
const ENABLE_LOCAL_CACHE = false

export default function SearchPage() {
  const { t } = useLingui()
  const navigate = useNavigate()
  // @ts-ignore
  const searchParams = useSearch({ from: '/_app/search' }) as { q?: string }
  const pageContext = useAskAiActionStore((state) => state.pageContext)
  const setPending = useAskAiActionStore((state) => state.setPending)

  const [query, setQuery] = useState(searchParams.q || '')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GlobalSearchHit[]>([])
  const [resultsSource, setResultsSource] = useState<'cache' | 'api'>('cache')
  const [activeTab, setActiveTab] = useState<
    'all' | 'documents' | 'forms' | 'workflows' | 'folders' | 'requests'
  >('all')

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
    if (!ENABLE_LOCAL_CACHE) return

    setResults(searchAllLocalData(trimmed))
    setResultsSource('cache')
  }

  const runApiSearch = async (searchText?: string) => {
    const trimmed = (searchText ?? inputRef.current?.value ?? query).trim()
    if (!trimmed) {
      inputRef.current?.focus()
      return
    }

    const requestId = ++requestIdRef.current
    apiInFlightRef.current = true
    lastApiQueryRef.current = ''
    setLoading(true)

    applyCacheResults(trimmed)

    const resolvedContext = resolveAskAiPageContext('/search', pageContext)
    try {
      const hits = await fetchGlobalSearch({
        actionFrom: resolvedContext.actionFrom,
        query: trimmed,
        specificId: resolvedContext.specificId || '',
      })
      if (requestId !== requestIdRef.current) return
      setResults(
        ENABLE_LOCAL_CACHE
          ? mergeSearchHits(hits, searchLocalAppData(trimmed))
          : hits,
      )
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

  useEffect(() => {
    if (searchParams.q) {
      setQuery(searchParams.q)
      if (
        lastApiQueryRef.current.toLowerCase() !== searchParams.q.toLowerCase()
      ) {
        void runApiSearch(searchParams.q)
      }
    } else {
      setQuery('')
      setResults([])
    }
  }, [searchParams.q])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      if (!loading && !apiInFlightRef.current) setResults([])
      return
    }

    if (apiInFlightRef.current) return
    if (
      lastApiQueryRef.current &&
      lastApiQueryRef.current.toLowerCase() === trimmed.toLowerCase()
    ) {
      return
    }

    // Instant local/cache filter while typing
    applyCacheResults(trimmed)
  }, [query, loading])

  // Call the API after typing settles if cache has no hits
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) return
    if (apiInFlightRef.current) return
    if (
      lastApiQueryRef.current &&
      lastApiQueryRef.current.toLowerCase() === trimmed.toLowerCase()
    ) {
      return
    }

    // Do not block API call on the dedicated search page if there are local hits
    // The user expects full API search results here.

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
  }, [query])

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const openHit = (hit: GlobalSearchHit) => {
    const rawRepoId =
      typeof hit.id === 'object' && hit.id !== null
        ? hit.id.repositoryId
        : undefined
    const rawItemId =
      typeof hit.id === 'object' && hit.id !== null ? hit.id.itemId : undefined
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

    if (
      type.includes('request') ||
      (instanceId &&
        workflowId &&
        !type.includes('document') &&
        !type.includes('file'))
    ) {
      if (workflowId && instanceId) {
        void navigate({
          search: { processId: instanceId, workflowId },
          to: '/requests',
        })
      } else {
        void navigate({ to: '/requests' })
      }
      return
    }

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
      return
    }

    if (type.includes('workflow') || type.includes('process')) {
      if (workflowId) {
        void navigate({
          params: { workflowId },
          to: '/workflow-builder/$workflowId',
        })
      } else {
        void navigate({ to: '/workflows' })
      }
      return
    }

    const isFolder = type.includes('folder') || type.includes('repository')
    const repositoryLabel =
      hit.folder ||
      hit.id?.repositoryName ||
      (isFolder ? title : '') ||
      hit.name ||
      'Repository'

    setPending({
      fileSearch: undefined,
      filters: {},
      itemName: itemId ? title : undefined,
      openItemId: itemId || undefined,
      repositoryId: repositoryId || undefined,
      repositoryLabel,
      target: 'Repository',
    })
    void navigate({
      search: {
        ...(repositoryId ? { repositoryId } : {}),
        ...(itemId ? { itemId } : {}),
        ...(itemId && title ? { itemName: title } : {}),
      },
      to: '/folders',
    })
  }

  const tabs = useMemo(() => {
    const counts = {
      all: results.length,
      documents: 0,
      folders: 0,
      forms: 0,
      requests: 0,
      workflows: 0,
    }
    results.forEach((hit) => {
      const type = String(hit.type || hit.entity_type || '').toLowerCase()
      const workflowId =
        typeof hit.id === 'object' && hit.id !== null
          ? String(hit.id.workflowId || '').trim()
          : ''
      const instanceId =
        typeof hit.id === 'object' && hit.id !== null
          ? String(hit.id.instanceId || '').trim()
          : ''

      if (
        type.includes('request') ||
        (instanceId &&
          workflowId &&
          !type.includes('document') &&
          !type.includes('file'))
      )
        counts.requests++
      else if (type.includes('document') || type.includes('file'))
        counts.documents++
      else if (type.includes('form') || type.includes('master')) counts.forms++
      else if (type.includes('workflow') || type.includes('process'))
        counts.workflows++
      else if (type.includes('folder') || type.includes('repository'))
        counts.folders++
    })

    const availableTabs = [{ count: counts.all, id: 'all', label: t`All` }]
    if (counts.documents > 0)
      availableTabs.push({
        count: counts.documents,
        id: 'documents',
        label: t`Documents`,
      })
    if (counts.forms > 0)
      availableTabs.push({ count: counts.forms, id: 'forms', label: t`Forms` })
    if (counts.workflows > 0)
      availableTabs.push({
        count: counts.workflows,
        id: 'workflows',
        label: t`Workflows`,
      })
    if (counts.folders > 0)
      availableTabs.push({
        count: counts.folders,
        id: 'folders',
        label: t`Folders`,
      })
    if (counts.requests > 0)
      availableTabs.push({
        count: counts.requests,
        id: 'requests',
        label: t`Requests`,
      })

    return availableTabs
  }, [results, t])

  const filteredResults = useMemo(() => {
    if (activeTab === 'all') return results
    return results.filter((hit) => {
      const type = String(hit.type || hit.entity_type || '').toLowerCase()
      const workflowId =
        typeof hit.id === 'object' && hit.id !== null
          ? String(hit.id.workflowId || '').trim()
          : ''
      const instanceId =
        typeof hit.id === 'object' && hit.id !== null
          ? String(hit.id.instanceId || '').trim()
          : ''

      if (activeTab === 'requests')
        return (
          type.includes('request') ||
          (instanceId &&
            workflowId &&
            !type.includes('document') &&
            !type.includes('file'))
        )
      if (activeTab === 'documents')
        return type.includes('document') || type.includes('file')
      if (activeTab === 'forms')
        return type.includes('form') || type.includes('master')
      if (activeTab === 'workflows')
        return type.includes('workflow') || type.includes('process')
      if (activeTab === 'folders')
        return type.includes('folder') || type.includes('repository')

      return true
    })
  }, [results, activeTab])

  // Reset tab to all if the current tab disappears
  useEffect(() => {
    if (!tabs.find((t) => t.id === activeTab)) {
      setActiveTab('all')
    }
  }, [tabs, activeTab])

  // Reset tab when query is emptied
  useEffect(() => {
    if (!query.trim()) {
      setActiveTab('all')
    }
  }, [query])

  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface'>
      <div className='bg-surface px-6 pt-8 pb-4'>
        <div className='mx-auto flex max-w-4xl flex-col items-start'>
          <div className='w-full'>
            <InputText
              leftSectionWidth={48}
              placeholder='Search for documents, workflows, folders...'
              ref={inputRef}
              rightSectionWidth={loading && query.length > 0 ? 80 : 48}
              value={query}
              classNames={{
                input:
                  'rounded-xl border border-gray-4 bg-surface py-6 pr-12 pl-12 text-lg text-gray-12 shadow-sm transition-all focus:border-primary-9 focus:ring-2 focus:ring-primary-9/20',
              }}
              leftSection={
                <Icon className='size-5 text-gray-9' name='lucide:search' />
              }
              rightSection={
                <div className='flex items-center gap-2 pr-2'>
                  {loading && (
                    <Icon
                      className='size-5 animate-spin text-primary-9'
                      name='lucide:loader-2'
                    />
                  )}
                  {query.length > 0 && !loading && (
                    <button
                      className='flex size-6 items-center justify-center rounded-full text-gray-9 transition-colors hover:bg-gray-3 hover:text-gray-12'
                      onClick={() => {
                        setQuery('')
                        inputRef.current?.focus()
                      }}
                    >
                      <Icon className='size-4' name='lucide:x' />
                    </button>
                  )}
                </div>
              }
              onChange={setQuery}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void navigate({ search: { q: query }, to: '/search' })
                  void runApiSearch(query)
                }
              }}
            />
          </div>

          {results.length > 0 && query.trim() && (
            <div className='mt-6 flex flex-wrap items-center gap-2'>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary-2 text-primary-9'
                      : 'border border-gray-4 bg-surface text-gray-11 hover:bg-gray-2',
                  )}
                  onClick={() => setActiveTab(tab.id as any)}
                >
                  {tab.label}
                  <span
                    className={cn(
                      'text-[11px]',
                      activeTab === tab.id
                        ? 'text-primary-9/70'
                        : 'text-gray-9',
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className='ez-scrollbar mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-6 pt-0 pb-6'>
        {!query.trim() && !loading && (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <div className='mb-6 flex items-center justify-center'>
              <AiBrandIcon className='size-10 shrink-0' />
            </div>
            <h3 className='mb-3 text-[22px] font-medium text-gray-13'>
              Start typing to search
            </h3>
            <p className='max-w-sm text-[16px] leading-relaxed text-gray-11'>
              Type to search the data. To find the
              Request,Document,Workflows,Folders,
            </p>
          </div>
        )}

        {query.trim() && results.length === 0 && !loading && (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <div className='mb-6 flex size-[72px] items-center justify-center rounded-full bg-gray-2 text-gray-9'>
              <Icon className='size-8' name='lucide:search' />
            </div>
            <h3 className='mb-4 text-[22px] font-medium text-gray-13'>
              No matching results found
            </h3>
            <p className='max-w-md text-[16px] leading-relaxed text-gray-11'>
              We couldn't find any records matching "{query}".
              <br />
              Try searching with different keywords or check spelling.
            </p>
          </div>
        )}

        {results.length > 0 && query.trim() && (
          <div className='flex flex-col gap-4'>
            <div className='mb-2 text-[13px] text-gray-11'>
              {filteredResults.length}{' '}
              {filteredResults.length === 1 ? 'result' : 'results'} for "{query}
              "
            </div>

            <div className='flex flex-col gap-3'>
              {filteredResults.map((hit, index) => {
                const title = getSearchHitTitle(hit)
                const titleHtml =
                  hit.needles && hit.needles.length > 0
                    ? hl(title, hit.needles)
                    : title
                const iconName = getSearchHitIcon(hit.type)
                const hitType = (hit.type || '').toLowerCase()
                const isDocumentHit =
                  hitType.includes('document') || hitType.includes('file')
                const badges = (hit.badges || []).filter(
                  (b) => b.label.toLowerCase() !== 'document',
                )

                return (
                  <div
                    className='group flex w-full cursor-pointer items-start gap-4 rounded-xl border border-gray-4 bg-surface p-4 text-left transition hover:border-primary-7 hover:shadow-[0_6px_18px_rgba(124,58,237,0.12)] focus-visible:ring-2 focus-visible:ring-primary-7 focus-visible:outline-none active:scale-[0.995]'
                    key={
                      hit.id?.itemId ||
                      hit.id?.formEntryId ||
                      hit.id?.instanceId ||
                      hit.entity_id ||
                      hit.id?.repositoryId ||
                      `${title}-${index}`
                    }
                    onClick={() => openHit(hit)}
                  >
                    <div className='flex size-10 shrink-0 items-center justify-center rounded-xl border border-gray-5 bg-primary-2 text-primary-9 transition-all'>
                      <Icon className='size-5' name={iconName} />
                    </div>

                    <div className='min-w-0 flex-1'>
                      <div className='mb-1 flex flex-wrap items-center gap-2'>
                        <span
                          className='truncate text-[15px] font-medium text-primary-9'
                          dangerouslySetInnerHTML={{ __html: titleHtml }}
                        />
                        {hit.subtitle && (
                          <span className='text-[13.5px] text-gray-11'>
                            {hit.subtitle}
                          </span>
                        )}
                        {hit.folder && (
                          <span className='shrink-0 rounded-full border border-gray-4 bg-gray-3 px-2.5 py-0.5 text-[11px] font-medium text-gray-11'>
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
                                  : 'bg-primary-2 text-primary-9 border-transparent'
                          return (
                            <span
                              key={i}
                              className={cn(
                                'shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                                colorCls,
                              )}
                            >
                              {b.label}
                            </span>
                          )
                        })}
                      </div>

                      {hit?.matchSource && (
                        <div className='mt-2 flex items-center gap-2'>
                          <div className='size-[5px] shrink-0 rounded-full bg-secondary-9' />

                          <div className='text-gray-9 line-clamp-1 text-[12.5px] hover:line-clamp-none'>
                            <span className='font-medium text-gray-11'>
                              {query}
                            </span>{' '}
                            Matched in{' '}
                            <span className='font-semibold text-primary-9'>
                              {hit.matchSource}
                            </span>
                          </div>
                        </div>
                      )}

                      {hit.found && hit.found.length > 0 && (
                        <div className='mt-1 flex flex-col gap-1.5'>
                          <div className='flex items-center gap-1.5'>
                            <div className='size-[4px] shrink-0 rounded-full bg-primary-9' />
                            <div
                              className='line-clamp-1 text-[13px] leading-relaxed text-gray-11 transition-all group-hover:line-clamp-none'
                              dangerouslySetInnerHTML={{
                                __html: foundLine(hit.found[0], hit.needles),
                              }}
                            />
                          </div>
                          {hit.found.length > 1 && (
                            <div className='mt-1 cursor-pointer text-[12px] font-medium text-primary-9 hover:underline'>
                              + {hit.found.length - 1} more place
                              {hit.found.length - 1 === 1 ? '' : 's'} it matched
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
