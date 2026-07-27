import { AnimatePresence, motion } from 'motion/react'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Menu from '@/components/base/menu/Menu'
import useAskAiActionStore from '@/components/common/ask-ai/stores/useAskAiActionStore'
import cn from '@/utils/cn'
import {
  fetchGlobalSearch,
  getSearchHitDate,
  getSearchHitIcon,
  getSearchHitTitle,
  type GlobalSearchHit,
} from './globalSearchApi'

const GlobalSearch = () => {
  const navigate = useNavigate()
  const pageContext = useAskAiActionStore((state) => state.pageContext)
  const setPending = useAskAiActionStore((state) => state.setPending)

  const [opened, setOpened] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GlobalSearchHit[]>([])
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!opened) {
      setQuery('')
      setDebouncedQuery('')
      setLoading(false)
      setResults([])
      setError('')
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
      setError('')
      return
    }

    setLoading(true)
    setError('')
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

    void fetchGlobalSearch({
      actionFrom: pageContext?.actionFrom || 'Repository',
      query: debouncedQuery,
      specificId: pageContext?.specificId || '',
    })
      .then((hits) => {
        if (requestId !== requestIdRef.current) return
        setResults(hits)
        setError('')
      })
      .catch((err: unknown) => {
        if (requestId !== requestIdRef.current) return
        setResults([])
        setError(
          err instanceof Error ? err.message : 'Could not complete search.',
        )
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false)
      })
  }, [debouncedQuery, pageContext?.actionFrom, pageContext?.specificId])

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
    const repositoryId = String(hit.id?.repositoryId || '').trim()
    const itemId = String(hit.id?.itemId || '').trim()
    const title = getSearchHitTitle(hit)
    const type = String(hit.type || '').toLowerCase()

    if (type.includes('workflow') || type.includes('process')) {
      setPending({
        filters: {},
        target: 'Workflow',
        workflowId: String(hit.id?.workflowId || ''),
      })
      void navigate({ to: '/workflows' })
    } else {
      setPending({
        fileSearch: title,
        filters: {},
        openItemId: itemId || undefined,
        repositoryId: repositoryId || undefined,
        repositoryLabel: 'Repository',
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
              placeholder='Search...'
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
              aria-label='Search'
              className='grid size-7 shrink-0 place-items-center rounded-md text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-13'
              type='button'
              onClick={(e) => {
                e.stopPropagation()
                if (searchLabel) openAllResults()
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
        ) : (
          <IconButton
            ariaLabel='Search'
            className='text-gray-11 hover:text-gray-13'
            color='gray'
            icon='lucide:search'
            tooltip='Search'
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
                  alt='Search AI'
                  className='size-[22px] opacity-80'
                />
                <p className='text-sm font-medium text-gray-12'>
                  Start typing to search
                </p>
                <p className='max-w-[280px] text-xs leading-5 text-gray-10'>
                  Search documents, folders, requests, and more across your
                  workspace.
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
                  animate={{
                    opacity: [0.55, 1, 0.55],
                    rotate: [0, 8, -8, 0],
                    scale: [0.92, 1.1, 0.92],
                  }}
                  className='text-primary-9'
                  transition={{
                    duration: 1.4,
                    ease: 'easeInOut',
                    repeat: Infinity,
                  }}
                >
                  <AiBrandIcon
                    alt='Searching AI'
                    className='size-[24px]'
                  />
                </motion.div>
                <p className='text-xs font-medium text-gray-11'>Searching…</p>
                <div className='h-1 w-44 overflow-hidden rounded-full bg-primary-3'>
                  <div className='global-search-bar h-full w-1/2 rounded-full bg-primary-9' />
                </div>
              </motion.div>
            )}

            {showResults && error && (
              <motion.div
                animate={{ opacity: 1 }}
                className='px-4 py-12 text-center text-sm text-gray-10'
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key='error'
              >
                {error}
              </motion.div>
            )}

            {showResults && !error && results.length === 0 && (
              <motion.div
                animate={{ opacity: 1 }}
                className='px-4 py-12 text-center text-sm text-gray-10'
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key='empty'
              >
                No results for “{debouncedQuery}”.
              </motion.div>
            )}

            {showResults && !error && results.length > 0 && (
              <motion.div
                animate={{ opacity: 1 }}
                className='flex min-h-0 flex-1 flex-col'
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key='list'
              >
                <ul className='ez-scrollbar min-h-0 flex-1 overflow-y-auto divide-y divide-gray-3 px-1 py-1'>
                  {results.map((hit, index) => {
                    const title = getSearchHitTitle(hit)
                    const date = getSearchHitDate(hit)
                    const icon = getSearchHitIcon(hit.type)
                    const isLatest = false
                    const key =
                      hit.id?.itemId ||
                      `${hit.type}-${title}-${date}-${index}`

                    return (
                      <motion.li
                        animate={{ opacity: 1, y: 0 }}
                        initial={{ opacity: 0, y: 8 }}
                        key={key}
                        transition={{
                          delay: Math.min(index, 12) * 0.03,
                          duration: 0.2,
                        }}
                      >
                        <button
                          className='flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-primary-2'
                          type='button'
                          onClick={() => openHit(hit)}
                        >
                          <span
                            className={cn(
                              'flex size-9 shrink-0 items-center justify-center rounded-[10px]',
                              isLatest
                                ? 'bg-primary-3 text-primary-10'
                                : 'bg-gray-3 text-gray-11',
                            )}
                          >
                            <Icon className='size-4' name={icon} />
                          </span>

                          <span className='min-w-0 flex-1'>
                            <span className='block truncate text-[13.5px] leading-5 font-semibold text-gray-13'>
                              {title}
                            </span>
                            <span className='mt-0.5 block truncate text-[12px] text-gray-10'>
                              {date || hit.type || 'Result'}
                            </span>
                          </span>

                          {isLatest ? (
                            <span className='shrink-0 rounded-full bg-primary-3 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary-10 lowercase'>
                              latest
                            </span>
                          ) : null}

                          <Icon
                            className='size-4 shrink-0 text-gray-8'
                            name='lucide:chevron-right'
                          />
                        </button>
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
                    All search results for “{searchLabel}”
                  </span>
                  <span className='shrink-0 text-[12px] text-gray-9'>
                    Press ENTER
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
