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
  getSearchHitDate,
  getSearchHitIcon,
  getSearchHitTitle,
  type GlobalSearchHit,
} from './globalSearchApi'
import { foundLine, hl, lineFor, searchMock } from './mockSearch'

const GlobalSearch = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const pageContext = useAskAiActionStore((state) => state.pageContext)
  const setPending = useAskAiActionStore((state) => state.setPending)

  const [opened, setOpened] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [useDummyData, setUseDummyData] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!opened) {
      setQuery('')
      setDebouncedQuery('')
      setLoading(false)
      setResults([])
      return
    }

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 30)

    return () => window.clearTimeout(focusTimer)
  }, [opened])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setDebouncedQuery('')
      setLoading(false)
      setResults([])
      return
    }

    setLoading(true)
    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmed)
    }, 400)

    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([])
      setLoading(false)
      return
    }

    const requestId = ++requestIdRef.current
    setLoading(true)

    if (useDummyData) {
      setTimeout(() => {
        if (requestId !== requestIdRef.current) return
        const hits = searchMock(debouncedQuery)
        setResults(hits)
        setLoading(false)
      }, 400)
    } else {
      void fetchGlobalSearch({
        actionFrom: pageContext?.actionFrom || 'Repository',
        query: debouncedQuery,
        specificId: pageContext?.specificId || '',
      })
        .then((hits) => {
          if (requestId !== requestIdRef.current) return
          setResults(hits)
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return
          setResults([])
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false)
        })
    }
  }, [
    debouncedQuery,
    useDummyData,
    pageContext?.actionFrom,
    pageContext?.specificId,
  ])

  const openAllResults = () => {
    const searchText = query.trim() || debouncedQuery
    if (!searchText) return

    setPending({
      fileSearch: searchText,
      filters: {},
      repositoryId: pageContext?.specificId || undefined,
      repositoryLabel: 'Repository',
      target: 'Repository',
    })
    void navigate({ to: '/folders' })
    setOpened(false)
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
    const repositoryId = String(rawRepoId || '').trim()
    const itemId = String(rawItemId || '').trim()
    const title = getSearchHitTitle(hit)
    const type = String(hit.type || '').toLowerCase()
    const isFolder = type.includes('folder') || type.includes('repository')
    const repositoryLabel =
      hit.folder || (isFolder ? title : '') || hit.name || 'Repository'

    if (type.includes('workflow') || type.includes('process')) {
      const workflowId =
        typeof hit.id === 'object' && hit.id !== null
          ? String(hit.id.workflowId || '')
          : ''
      setPending({
        filters: {},
        target: 'Workflow',
        workflowId,
      })
      void navigate({ to: '/workflows' })
    } else {
      setPending({
        fileSearch: isFolder ? undefined : title,
        filters: {},
        openItemId: itemId || undefined,
        repositoryId: repositoryId || undefined,
        repositoryLabel,
        target: 'Repository',
      })
      void navigate({ to: '/folders' })
    }

    setOpened(false)
  }

  const showIdle = !query.trim() && !loading
  const showResults = !loading && Boolean(debouncedQuery)
  const searchLabel = query.trim() || debouncedQuery

  return (
    <Menu
      className='!p-0'
      closeOnItemClick={false}
      offset={8}
      opened={opened}
      position='bottom-end'
      width={460}
      target={
        opened ? (
          <div
            className={cn(
              'relative flex h-9 w-[460px] items-center gap-2 rounded-lg border px-2.5 transition-colors',
              query.trim()
                ? 'border-primary-6 bg-primary-2'
                : 'border-gray-4 bg-gray-2',
            )}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              className='min-w-0 flex-1 bg-transparent text-[13.5px] text-gray-13 outline-none placeholder:text-gray-9'
              placeholder={t`Search...`}
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Escape') {
                  setOpened(false)
                  return
                }
                if (e.key === 'Enter' && searchLabel) {
                  e.preventDefault()
                  openAllResults()
                }
              }}
            />
            <button
              type='button'
              aria-label={
                useDummyData
                  ? t`Switch to Original Data`
                  : t`Switch to Dummy Data`
              }
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-md transition-colors',
                useDummyData
                  ? 'bg-primary-9 text-white'
                  : 'text-gray-11 hover:bg-gray-4 hover:text-gray-13',
              )}
              title={
                useDummyData
                  ? t`Switch to Original Data`
                  : t`Switch to Dummy Data`
              }
              onClick={(e) => {
                e.stopPropagation()
                setUseDummyData(!useDummyData)
              }}
            >
              <Icon name={useDummyData ? 'lucide:database' : 'lucide:search'} />
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
        className='overflow-hidden rounded-xl bg-surface-raised'
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
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
                  {t`Search documents, folders, requests, and more across your workspace.`}
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
                className='flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center'
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
                  {t`We couldn't find any records matching “${debouncedQuery}”. Try searching with different keywords or check spelling.`}
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
                <ul className='ez-scrollbar min-h-0 flex-1 divide-y divide-gray-3 overflow-y-auto pb-1'>
                  {results.map((hit, index) => {
                    const isDummy = useDummyData

                    const title = getSearchHitTitle(hit)
                    const titleHtml =
                      hit.needles && hit.needles.length > 0
                        ? hl(title, hit.needles)
                        : title

                    const iconName = getSearchHitIcon(hit.type)
                    const badges = hit.badges || []

                    return (
                      <motion.li
                        animate={{ opacity: 1, y: 0 }}
                        initial={{ opacity: 0, y: 8 }}
                        key={hit.id?.itemId || hit.id?.repositoryId || hit.id || index}
                        transition={{
                          delay: Math.min(index, 12) * 0.03,
                          duration: 0.2,
                        }}
                      >
                        <div
                          className='group flex w-full cursor-pointer items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-gray-2'
                          onClick={() => openHit(hit)}
                        >
                          {/* Icon Container */}
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
                            {/* Title & Badge */}
                            <div className='mb-1 flex flex-wrap items-center gap-2'>
                              <span
                                className='truncate text-[14.5px] font-semibold text-gray-12'
                                dangerouslySetInnerHTML={{ __html: titleHtml }}
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

                              {badges.map((b: any, i: number) => {
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

                            {/* Meta */}
                            <div className='mb-2 line-clamp-1 hover:line-clamp-none text-[12.5px] text-slate-500'>
                              {hit.line
                                ? hit.line
                                : isDummy
                                  ? lineFor(hit)
                                  : [
                                      hit.name ? t`Updated from ${hit.name}` : '',
                                      getSearchHitDate(hit),
                                    ].filter(Boolean).join(', ') || hit.type || t`Result`}
                            </div>

                            {/* Found snippets */}
                            {hit.found && hit.found.length > 0 && (
                              <div className='flex flex-col gap-1.5'>
                                <div className='flex items-start gap-2'>
                                  <div className='bg-[#00bcd4] mt-[7px] size-[5px] shrink-0 rounded-full' />
                                  <div
                                    className='text-[12.5px] leading-relaxed text-slate-600 line-clamp-1 hover:line-clamp-none'
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
                                    {hit.found.length - 1 === 1 ? '' : 's'} it
                                    matched
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Found snippets (Fallback when matchSource is present without found array) */}
                            {!hit.found?.length && hit.matchSource && (
                              <div className='flex flex-col gap-1.5 mt-2'>
                                <div className='flex items-start gap-2'>
                                  <div className='bg-[#00bcd4] mt-[7px] size-[5px] shrink-0 rounded-full' />
                                  <div className='text-[12.5px] leading-relaxed text-slate-600 line-clamp-1 hover:line-clamp-none'>
                                    {t`Matched in:`} <span className='capitalize font-medium'>{hit.matchSource}</span>
                                  </div>
                                </div>
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
                  onClick={openAllResults}
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
      </div>
    </Menu>
  )
}

GlobalSearch.displayName = 'GlobalSearch'
export default GlobalSearch
