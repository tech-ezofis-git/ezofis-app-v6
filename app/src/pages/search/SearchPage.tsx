import { useLingui } from '@lingui/react/macro'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useRef, useMemo } from 'react'
import { fetchGlobalSearch, type GlobalSearchHit, getSearchHitTitle, getSearchHitIcon, getSearchHitDate } from '@/layouts/app/components/topbar/components/globalSearchApi'
import { mergeSearchHits, searchLocalAppData, searchAllLocalData } from '@/layouts/app/components/topbar/components/localAppSearch'
import { resolveAskAiPageContext } from '@/components/common/ask-ai/chatbotApi'
import useAskAiActionStore from '@/components/common/ask-ai/stores/useAskAiActionStore'
import cn from '@/utils/cn'
import Icon from '@/components/base/icon/Icon'
import InputText from '@/components/base/inputs/InputText'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import { hl, foundLine } from '@/layouts/app/components/topbar/components/mockSearch'

const CACHE_EMPTY_API_DEBOUNCE_MS = 450

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
  const [activeTab, setActiveTab] = useState<'all' | 'documents' | 'forms' | 'workflows'>('all')

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

  useEffect(() => {
    if (searchParams.q) {
      setQuery(searchParams.q)
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
  }, [query])

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const openHit = (hit: GlobalSearchHit) => {
    const rawRepoId = typeof hit.id === 'object' && hit.id !== null ? hit.id.repositoryId : undefined
    const rawItemId = typeof hit.id === 'object' && hit.id !== null ? hit.id.itemId : undefined
    const formId = typeof hit.id === 'object' && hit.id !== null ? String(hit.id.formId || hit.id.masterFormId || '').trim() : ''
    const formEntryId = typeof hit.id === 'object' && hit.id !== null ? String(hit.id.formEntryId || '').trim() : ''
    const workflowId = typeof hit.id === 'object' && hit.id !== null ? String(hit.id.workflowId || '').trim() : ''
    const instanceId = typeof hit.id === 'object' && hit.id !== null ? String(hit.id.instanceId || '').trim() : ''
    const repositoryId = String(rawRepoId || '').trim()
    const itemId = String(rawItemId || '').trim()
    const title = getSearchHitTitle(hit)
    const type = String(hit.type || hit.entity_type || '').toLowerCase()

    if (type.includes('request') || (instanceId && workflowId && !type.includes('document'))) {
      if (workflowId && instanceId) {
        void navigate({ search: { processId: instanceId, workflowId }, to: '/requests' })
      } else {
        void navigate({ to: '/requests' })
      }
      return
    }

    if (type.includes('form') || type.includes('master') || formId) {
      if (formId) {
        void navigate({ params: { formId }, search: formEntryId ? { entryId: formEntryId } : {}, to: '/forms/$formId/entries' })
      } else {
        void navigate({ to: '/forms' })
      }
      return
    }

    if (type.includes('workflow') || type.includes('process')) {
      if (workflowId) {
        void navigate({ params: { workflowId }, to: '/workflow-builder/$workflowId' })
      } else {
        void navigate({ to: '/workflows' })
      }
      return
    }

    const isFolder = type.includes('folder') || type.includes('repository')
    const repositoryLabel = hit.folder || hit.id?.repositoryName || (isFolder ? title : '') || hit.name || 'Repository'

    setPending({
      fileSearch: isFolder ? undefined : title,
      filters: {},
      openItemId: itemId || undefined,
      repositoryId: repositoryId || undefined,
      repositoryLabel,
      target: 'Repository',
    })
    void navigate({
      search: { ...(repositoryId ? { repositoryId } : {}), ...(itemId ? { itemId } : {}) },
      to: '/folders',
    })
  }

  const tabs = useMemo(() => {
    const counts = { all: results.length, documents: 0, forms: 0, workflows: 0 }
    results.forEach((hit) => {
      const type = String(hit.type || hit.entity_type || '').toLowerCase()
      if (type.includes('document') || type.includes('file')) counts.documents++
      else if (type.includes('form') || type.includes('master')) counts.forms++
      else if (type.includes('workflow') || type.includes('process')) counts.workflows++
    })

    const availableTabs = [{ id: 'all', label: t`All`, count: counts.all }]
    if (counts.documents > 0) availableTabs.push({ id: 'documents', label: t`Documents`, count: counts.documents })
    if (counts.forms > 0) availableTabs.push({ id: 'forms', label: t`Forms`, count: counts.forms })
    if (counts.workflows > 0) availableTabs.push({ id: 'workflows', label: t`Workflows`, count: counts.workflows })

    return availableTabs
  }, [results, t])

  const filteredResults = useMemo(() => {
    if (activeTab === 'all') return results
    return results.filter((hit) => {
      const type = String(hit.type || hit.entity_type || '').toLowerCase()
      if (activeTab === 'documents') return type.includes('document') || type.includes('file')
      if (activeTab === 'forms') return type.includes('form') || type.includes('master')
      if (activeTab === 'workflows') return type.includes('workflow') || type.includes('process')
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
              ref={inputRef}
              classNames={{
                input: 'rounded-xl border border-gray-4 bg-surface py-6 pl-12 pr-12 text-lg text-gray-12 shadow-sm focus:border-primary-9 focus:ring-2 focus:ring-primary-9/20 transition-all',
              }}
              leftSection={<Icon name='lucide:search' className='size-5 text-gray-9' />}
              leftSectionWidth={48}
              placeholder='Search for documents, workflows, folders...'
              rightSection={
                <div className='flex items-center gap-2 pr-2'>
                  {loading && <Icon name='lucide:loader-2' className='size-5 animate-spin text-primary-9' />}
                  {query.length > 0 && !loading && (
                    <button
                      onClick={() => {
                        setQuery('')
                        inputRef.current?.focus()
                      }}
                      className='flex size-6 items-center justify-center rounded-full text-gray-9 hover:bg-gray-3 hover:text-gray-12 transition-colors'
                    >
                      <Icon name='lucide:x' className='size-4' />
                    </button>
                  )}
                </div>
              }
              rightSectionWidth={loading && query.length > 0 ? 80 : 48}
              value={query}
              onChange={setQuery}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void navigate({ to: '/search', search: { q: query } })
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
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary-2 text-primary-9'
                      : 'border border-gray-4 bg-white text-gray-11 hover:bg-gray-2'
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      'text-[11px]',
                      activeTab === tab.id ? 'text-primary-9/70' : 'text-gray-9'
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

      <div className='ez-scrollbar mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-6 pb-6 pt-0'>
        {!query.trim() && !loading && (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <div className='mb-6 flex items-center justify-center'>
              <AiBrandIcon className='size-10 shrink-0' />
            </div>
            <h3 className='mb-3 text-[22px] font-medium text-[#1B326D]'>Start typing to search</h3>
            <p className='max-w-sm text-[16px] leading-relaxed text-gray-11'>
              Type to search the data. To find the Request,Document,Workflows,Folders,
            </p>
          </div>
        )}

        {query.trim() && results.length === 0 && !loading && (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <div className='mb-6 flex size-[72px] items-center justify-center rounded-full bg-gray-2 text-gray-9'>
              <Icon name='lucide:search' className='size-8' />
            </div>
            <h3 className='mb-4 text-[22px] font-medium text-[#1B326D]'>No matching results found</h3>
            <p className='max-w-md text-[16px] leading-relaxed text-gray-11'>
              We couldn't find any records matching "{query}".<br />
              Try searching with different keywords or check spelling.
            </p>
          </div>
        )}

        {results.length > 0 && query.trim() && (
          <div className='flex flex-col gap-4'>
            <div className='mb-2 text-[13px] text-gray-11'>
              {filteredResults.length} {filteredResults.length === 1 ? 'result' : 'results'} for "{query}"
            </div>

            <div className='flex flex-col gap-3'>
              {filteredResults.map((hit, index) => {
                const title = getSearchHitTitle(hit)
                const titleHtml = hit.needles && hit.needles.length > 0 ? hl(title, hit.needles) : title
                const iconName = getSearchHitIcon(hit.type)
                const hitType = String(hit.type || hit.entity_type || '').toLowerCase()
                const isDocumentHit = hitType.includes('document') || hitType.includes('file')
                const badges = (hit.badges || []).filter((b) => b.label.toLowerCase() !== 'document')

                const subtitleLine = hit.line
                  ? hit.line
                  : isDocumentHit
                    ? 'Updated from Document'
                    : [hit.name ? `Updated from ${hit.name}` : '', getSearchHitDate(hit)]
                      .filter(Boolean)
                      .join(', ') ||
                    hit.type ||
                    'Result'

                return (
                  <div
                    key={hit.id?.itemId || hit.id?.formEntryId || hit.id?.instanceId || hit.entity_id || hit.id?.repositoryId || `${title}-${index}`}
                    className='group flex w-full cursor-pointer items-start gap-4 rounded-xl border border-gray-4 bg-white p-4 text-left transition hover:border-primary-7 hover:shadow-[0_6px_18px_rgba(124,58,237,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-7 active:scale-[0.995]'
                    onClick={() => openHit(hit)}
                  >
                    <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-2 text-primary-9 transition-all border border-gray-5'>
                      <Icon className='size-5' name={iconName} />
                    </div>

                    <div className='min-w-0 flex-1'>
                      <div className='mb-1 flex flex-wrap items-center gap-2'>
                        <span
                          className='truncate text-[15px] font-medium text-primary-9'
                          dangerouslySetInnerHTML={{ __html: titleHtml }}
                        />
                        {hit.subtitle && (
                          <span className='text-[13.5px] text-gray-11'>{hit.subtitle}</span>
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
                              className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium', colorCls)}
                            >
                              {b.label}
                            </span>
                          )
                        })}
                      </div>

                      <div className='mb-1 line-clamp-1 text-[13px] text-gray-10 transition-all group-hover:line-clamp-none'>
                        {subtitleLine}
                      </div>

                      {hit.found && hit.found.length > 0 && (
                        <div className='mt-1 flex flex-col gap-1.5'>
                          <div className='flex items-center gap-1.5'>
                            <div className='size-[4px] shrink-0 rounded-full bg-primary-9' />
                            <div
                              className='line-clamp-1 text-[13px] leading-relaxed text-gray-11 transition-all group-hover:line-clamp-none'
                              dangerouslySetInnerHTML={{ __html: foundLine(hit.found[0], hit.needles) }}
                            />
                          </div>
                          {hit.found.length > 1 && (
                            <div className='mt-1 cursor-pointer text-[12px] font-medium text-primary-9 hover:underline'>
                              + {hit.found.length - 1} more place{hit.found.length - 1 === 1 ? '' : 's'} it matched
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
