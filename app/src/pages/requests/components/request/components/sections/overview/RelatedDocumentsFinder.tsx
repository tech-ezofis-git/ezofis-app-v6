import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import fileApi from '@/api/file/file'
import { getRepositoriesQueryOptions } from '@/api/folders/queries'
import { workflowsApiV6 } from '@/api/v6/workflows'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import {
  fetchGlobalSearch,
  getSearchHitDate,
  getSearchHitTitle,
  type GlobalSearchHit,
} from '@/layouts/app/components/topbar/components/globalSearchApi'
import cn from '@/utils/cn'
import { formatUtcToLocalDate, parseUtcDate } from '@/utils/utcDate'
import {
  getExt,
  getFileIcon,
  getFileIconClasses,
} from '../attachment/Attachments'

type Props = {
  attachedIds: Set<string>
  instanceId?: number | string
  invoiceAmount?: string
  invoiceNumber?: string
  poNumber?: string
  repositoryId?: number | string
  supplierName?: string
  workflowId?: number
  onAttached: () => void
}

const RESULTS_PREVIEW_COUNT = 6
const RECENT_WINDOW_MS = 90 * 24 * 60 * 60 * 1000

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const hitKey = (hit: GlobalSearchHit): string =>
  String(hit.id?.itemId || hit.id?.repositoryId || getSearchHitTitle(hit))

const RelatedDocumentsFinder = ({
  attachedIds,
  instanceId,
  invoiceAmount,
  invoiceNumber,
  poNumber,
  repositoryId,
  supplierName,
  workflowId,
  onAttached,
}: Props) => {
  const { t } = useLingui()

  const [stage, setStage] = useState<'intro' | 'search'>('intro')
  const [keyword, setKeyword] = useState('')
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<GlobalSearchHit[]>([])
  const [showAll, setShowAll] = useState(false)
  const [recentOnly, setRecentOnly] = useState(false)

  const [folderQuery, setFolderQuery] = useState('')
  const [folderPopoverOpen, setFolderPopoverOpen] = useState(false)
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])

  const [attachingKey, setAttachingKey] = useState<string | null>(null)
  const [localAttached, setLocalAttached] = useState<Set<string>>(new Set())

  const keywordRef = useRef<HTMLInputElement>(null)
  const folderWrapRef = useRef<HTMLDivElement>(null)

  const { data: repositories = [] } = useQuery(getRepositoriesQueryOptions())

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!folderWrapRef.current?.contains(e.target as Node)) {
        setFolderPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const folderNameById = useMemo(() => {
    const map = new Map<string, string>()
    repositories.forEach((repo: { id: string; name: string }) =>
      map.set(String(repo.id), repo.name),
    )
    return map
  }, [repositories])

  const filteredFolders = useMemo(() => {
    const q = folderQuery.trim().toLowerCase()
    if (!q) return repositories
    return repositories.filter((repo: { id: string; name: string }) =>
      repo.name.toLowerCase().includes(q),
    )
  }, [repositories, folderQuery])

  const seeds = useMemo(() => {
    const list: { key: string; label: string; value?: string }[] = []
    if (poNumber)
      list.push({ key: 'po', label: t`PO ${poNumber}`, value: poNumber })
    if (supplierName && supplierName !== 'the supplier') {
      list.push({ key: 'vendor', label: supplierName, value: supplierName })
    }
    if (invoiceAmount) {
      list.push({
        key: 'amount',
        label: t`Same value ${invoiceAmount}`,
        value: invoiceAmount,
      })
    }
    list.push({ key: 'recent', label: t`Last 90 days` })
    return list
  }, [poNumber, supplierName, invoiceAmount, t])

  const runSearch = async (overrideKeyword?: string) => {
    const q = (overrideKeyword ?? keyword).trim()
    if (!q) return
    setLoading(true)
    setError('')
    setShowAll(false)
    try {
      const hits = await fetchGlobalSearch({
        actionFrom: 'Repository',
        query: q,
        specificId: selectedFolderIds.length ? selectedFolderIds : null,
      })
      setResults(hits)
      setSearched(true)
    } catch (err) {
      setResults([])
      setSearched(true)
      setError(
        err instanceof Error ? err.message : t`Could not complete search.`,
      )
    } finally {
      setLoading(false)
    }
  }

  const applyKeyword = (nextKeyword: string) => {
    setKeyword(nextKeyword)
    void runSearch(nextKeyword)
  }

  const isSeedTermActive = (value: string) =>
    keyword.trim().toLowerCase().includes(value.trim().toLowerCase())

  const toggleSeedTerm = (value: string) => {
    const trimmedValue = value.trim()
    const prevTrimmed = keyword.trim()
    let next: string
    if (isSeedTermActive(trimmedValue)) {
      const re = new RegExp(escapeRegExp(trimmedValue), 'ig')
      next = prevTrimmed.replace(re, '').replace(/\s+/g, ' ').trim()
    } else {
      next = prevTrimmed ? `${prevTrimmed} ${trimmedValue}` : trimmedValue
    }
    applyKeyword(next)
  }

  const handleSeedClick = (seed: { key: string; value?: string }) => {
    if (seed.key === 'recent') {
      setRecentOnly((prev) => !prev)
      return
    }
    if (seed.value) toggleSeedTerm(seed.value)
  }

  const toggleFolder = (id: string) => {
    setSelectedFolderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const openSearch = () => {
    setStage('search')
    window.setTimeout(() => keywordRef.current?.focus(), 30)
  }

  const closeSearch = () => {
    setStage('intro')
    setKeyword('')
    setSearched(false)
    setResults([])
    setError('')
    setShowAll(false)
  }

  const displayResults = useMemo(() => {
    if (!recentOnly) return results
    const cutoff = Date.now() - RECENT_WINDOW_MS
    return results.filter((hit) => {
      const date = parseUtcDate(getSearchHitDate(hit))
      return date ? date.getTime() >= cutoff : false
    })
  }, [results, recentOnly])

  const visibleResults = showAll
    ? displayResults
    : displayResults.slice(0, RESULTS_PREVIEW_COUNT)
  const matchCount = displayResults.length

  const isAttached = (hit: GlobalSearchHit) => {
    const itemId = String(hit.id?.itemId || '')
    return (itemId && attachedIds.has(itemId)) || localAttached.has(hitKey(hit))
  }

  const handleAttach = async (hit: GlobalSearchHit) => {
    const repoId = String(hit.id?.repositoryId || '').trim()
    const itemId = String(hit.id?.itemId || '').trim()
    const key = hitKey(hit)
    const title = getSearchHitTitle(hit)

    if (!repoId || !itemId) {
      showToast({
        message: t`This result cannot be attached.`,
        variant: 'error',
      })
      return
    }
    if (!workflowId || !instanceId || !repositoryId) {
      showToast({
        message: t`Cannot attach: this request has no attachment context yet.`,
        variant: 'error',
      })
      return
    }

    setAttachingKey(key)
    try {
      const response = await fileApi.viewBinaryV6(repoId, itemId)
      if (!(response?.data instanceof Blob)) {
        throw new Error(t`File content could not be retrieved.`)
      }

      const blob = response.data
      const file = new File([blob], title, {
        type: blob.type || 'application/octet-stream',
      })
      const formData = new FormData()
      formData.append('file', file)
      formData.append('repositoryId', String(repositoryId))
      formData.append('repositoryld', String(repositoryId))

      const res = await workflowsApiV6.addInstanceAttachment(
        workflowId,
        instanceId,
        formData,
      )
      if (res.error) throw new Error(String(res.error))

      setLocalAttached((prev) => new Set(prev).add(key))
      showToast({
        message: t`Added ${title} to attachments.`,
        variant: 'success',
      })
      onAttached()
    } catch (err) {
      showToast({
        message:
          err instanceof Error ? err.message : t`Failed to attach document.`,
        variant: 'error',
      })
    } finally {
      setAttachingKey(null)
    }
  }

  const subtitleParts = [invoiceNumber, supplierName, poNumber].filter(Boolean)

  return (
    <div className='animate-in fade-in zoom-in-95 fill-mode-both mb-4 overflow-hidden rounded-xl border border-l-4 border-[var(--primary-3)] border-l-[var(--primary-9)] bg-[var(--surface-primary)] shadow-xs transition-all duration-400'>
      {stage === 'intro' ? (
        <div className='flex flex-col gap-2.5 p-3 sm:flex-row sm:items-center'>
          <AiBrandIcon
            className='size-[18px] shrink-0 text-[var(--primary-9)]'
            variant='outline-purple'
          />
          <div className='min-w-0 flex-1'>
            <h4 className='text-[13.5px] font-bold text-[var(--gray-13)]'>{t`Find related documents`}</h4>
            <p className='mt-0.5 text-[11.5px] text-[var(--gray-10)]'>
              {t`Look for the purchase order, receipt, contract or any file that belongs with this invoice.`}
            </p>
          </div>
          <button
            className='inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--primary-4)] bg-[var(--primary-2)] px-3 py-1.5 text-xs font-bold text-[var(--primary-9)] shadow-xs transition-all hover:scale-[1.02] hover:bg-[var(--primary-3)] hover:text-[var(--primary-10)] active:scale-95'
            type='button'
            onClick={openSearch}
          >
            <Icon className='h-3.5 w-3.5' name='tabler:search' />
            {t`Start search`}
          </button>
        </div>
      ) : (
        <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
          {/* Header */}
          <div className='flex items-center gap-2.5 px-3.5 pt-3'>
            <AiBrandIcon
              className='size-4 shrink-0 text-[var(--primary-9)]'
              variant='outline-purple'
            />
            <div className='min-w-0 flex-1'>
              <div className='text-[13.5px] font-bold text-[var(--gray-13)]'>{t`Find related documents`}</div>
              {subtitleParts.length > 0 && (
                <div className='truncate text-[11.5px] text-[var(--gray-10)]'>
                  {subtitleParts.join(' · ')}
                </div>
              )}
            </div>
            {searched && !loading && (
              <span className='shrink-0 rounded-full bg-[var(--primary-1)] px-2.5 py-1 text-xs font-bold text-[var(--primary-9)]'>
                {t`${matchCount} matches`}
              </span>
            )}
            <button
              className='shrink-0 rounded-md px-2 py-1 text-[11.5px] font-medium text-[var(--gray-10)] transition-colors hover:bg-[var(--primary-1)] hover:text-[var(--primary-9)]'
              type='button'
              onClick={closeSearch}
            >
              {t`Close`}
            </button>
          </div>

          {/* Keyword + folder + search row */}
          <div className='grid grid-cols-1 gap-2 px-3.5 pt-3 sm:grid-cols-[1fr_200px_auto]'>
            <div
              className={cn(
                'flex h-9 items-center gap-2 rounded-lg border border-[var(--gray-4)] bg-surface px-2.5 transition-all',
                'focus-within:border-[var(--primary-6)] focus-within:ring-2 focus-within:ring-[var(--primary-4)]/25',
              )}
            >
              <Icon
                className='h-3.5 w-3.5 shrink-0 text-[var(--gray-9)]'
                name='tabler:search'
              />
              <input
                className='min-w-0 flex-1 border-none bg-transparent text-xs font-medium text-[var(--gray-13)] placeholder:text-[var(--gray-9)] focus:ring-0 focus:outline-none'
                placeholder={t`File name, PO number, vendor, amount or words inside the file`}
                ref={keywordRef}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void runSearch()
                }}
              />
              {keyword && (
                <button
                  aria-label={t`Clear`}
                  className='shrink-0 text-[var(--gray-8)] hover:text-[var(--gray-11)]'
                  type='button'
                  onClick={() => setKeyword('')}
                >
                  <Icon className='h-3.5 w-3.5' name='tabler:x' />
                </button>
              )}
            </div>

            <div className='relative' ref={folderWrapRef}>
              <div
                className={cn(
                  'flex h-9 cursor-text items-center gap-2 rounded-lg border border-[var(--gray-4)] bg-surface px-2.5 transition-all',
                  'focus-within:border-[var(--primary-6)] focus-within:ring-2 focus-within:ring-[var(--primary-4)]/25',
                )}
                onClick={() => setFolderPopoverOpen(true)}
              >
                <Icon
                  className='h-3.5 w-3.5 shrink-0 text-[var(--gray-9)]'
                  name='tabler:folder'
                />
                <input
                  className='min-w-0 flex-1 border-none bg-transparent text-xs font-medium text-[var(--gray-13)] placeholder:text-[var(--gray-9)] focus:ring-0 focus:outline-none'
                  placeholder={t`Type a folder name`}
                  value={folderQuery}
                  onChange={(e) => setFolderQuery(e.target.value)}
                  onFocus={() => setFolderPopoverOpen(true)}
                />
              </div>

              {folderPopoverOpen && (
                <div className='animate-in fade-in slide-in-from-top-1 absolute top-10 right-0 left-0 z-40 max-h-[210px] overflow-y-auto rounded-lg border border-[var(--gray-4)] bg-surface-raised shadow-md duration-150'>
                  {filteredFolders.length === 0 ? (
                    <div className='px-3 py-2.5 text-[11.5px] text-[var(--gray-9)]'>
                      {t`No folder by that name`}
                    </div>
                  ) : (
                    filteredFolders.map(
                      (repo: { id: string; name: string }) => {
                        const on = selectedFolderIds.includes(String(repo.id))
                        return (
                          <div
                            key={repo.id}
                            className={cn(
                              'flex cursor-pointer items-center gap-2 px-3 py-2 text-[12.5px] transition-colors hover:bg-[var(--gray-1)]',
                            )}
                            onClick={() => toggleFolder(String(repo.id))}
                          >
                            <span
                              className={cn(
                                'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border',
                                on
                                  ? 'border-[var(--primary-9)] bg-[var(--primary-9)] text-white'
                                  : 'border-[var(--gray-6)]',
                              )}
                            >
                              {on && (
                                <Icon
                                  className='h-2.5 w-2.5'
                                  name='tabler:check'
                                />
                              )}
                            </span>
                            <span className='truncate text-[var(--gray-13)]'>
                              {repo.name}
                            </span>
                          </div>
                        )
                      },
                    )
                  )}
                </div>
              )}
            </div>

            <button
              className='inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--primary-9)] px-4 text-xs font-bold text-white transition-all hover:bg-[var(--primary-10)] active:scale-95 disabled:opacity-50'
              disabled={!keyword.trim() || loading}
              type='button'
              onClick={() => void runSearch()}
            >
              {t`Search`}
            </button>
          </div>

          {/* Looking in chips */}
          <div className='flex items-start gap-2.5 px-3.5 pt-2.5'>
            <span className='w-[76px] shrink-0 pt-1 text-[11px] text-[var(--gray-9)]'>{t`Looking in`}</span>
            <div className='flex flex-1 flex-wrap gap-1.5'>
              {selectedFolderIds.length === 0 ? (
                <span className='rounded-full border border-[var(--primary-4)] bg-[var(--primary-1)] px-2.5 py-1 text-[11px] font-medium text-[var(--primary-9)]'>
                  {t`All folders you can access`}
                </span>
              ) : (
                selectedFolderIds.map((id) => (
                  <button
                    className='inline-flex items-center gap-1.5 rounded-full border border-[var(--primary-4)] bg-[var(--primary-1)] px-2.5 py-1 text-[11px] font-medium text-[var(--primary-9)] transition-colors hover:bg-[var(--primary-2)]'
                    key={id}
                    type='button'
                    onClick={() => toggleFolder(id)}
                  >
                    {folderNameById.get(id) || id}
                    <Icon className='h-2.5 w-2.5 opacity-60' name='tabler:x' />
                  </button>
                ))
              )}
              {selectedFolderIds.length > 0 && (
                <button
                  className='rounded-full border border-dashed border-[var(--gray-5)] px-2.5 py-1 text-[11px] text-[var(--gray-9)] hover:border-[var(--primary-4)] hover:text-[var(--primary-9)]'
                  type='button'
                  onClick={() => setSelectedFolderIds([])}
                >
                  {t`Clear`}
                </button>
              )}
            </div>
          </div>

          {/* From this invoice seed chips */}
          <div className='flex items-start gap-2.5 px-3.5 pt-2 pb-3'>
            <span className='w-[76px] shrink-0 pt-1 text-[11px] text-[var(--gray-9)]'>{t`From this invoice`}</span>
            <div className='flex flex-1 flex-wrap gap-1.5'>
              {seeds.map((seed) => {
                const active =
                  seed.key === 'recent'
                    ? recentOnly
                    : seed.value
                      ? isSeedTermActive(seed.value)
                      : false
                return (
                  <button
                    key={seed.key}
                    type='button'
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-all',
                      active
                        ? 'border-[var(--primary-4)] bg-[var(--primary-2)] text-[var(--primary-9)]'
                        : 'border-[var(--gray-4)] bg-surface text-[var(--gray-11)] hover:border-[var(--primary-4)] hover:text-[var(--primary-9)]',
                    )}
                    onClick={() => handleSeedClick(seed)}
                  >
                    {active && (
                      <Icon className='h-2.5 w-2.5' name='tabler:check' />
                    )}
                    {seed.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Results */}
          <div className='border-t border-[var(--gray-3)] bg-[var(--gray-1)] px-3.5 py-3'>
            {loading ? (
              <div className='flex flex-col items-center justify-center gap-2 py-8'>
                <AiBrandIcon
                  className='size-5 animate-pulse text-[var(--primary-9)]'
                  variant='outline-purple'
                />
                <p className='text-xs font-medium text-[var(--gray-10)]'>{t`Searching…`}</p>
              </div>
            ) : error ? (
              <div className='py-6 text-center text-xs text-[var(--red-10)]'>
                {error}
              </div>
            ) : !searched ? (
              <div className='py-6 text-center text-[11.5px] leading-6 text-[var(--gray-10)]'>
                {t`Type what you remember, pick the folders to look in, then press Search.`}
              </div>
            ) : displayResults.length === 0 ? (
              <div className='py-6 text-center text-[11.5px] leading-6 text-[var(--gray-10)]'>
                {t`No related documents found. Try a different keyword or folder.`}
              </div>
            ) : (
              <>
                <div
                  className='grid gap-2'
                  style={{
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(228px, 1fr))',
                  }}
                >
                  {visibleResults.map((hit, idx) => {
                    const key = hitKey(hit)
                    const title = getSearchHitTitle(hit)
                    const ext = getExt({ name: title })
                    const iconName = getFileIcon(ext)
                    const iconStyles = getFileIconClasses(ext)
                    const repoId = String(hit.id?.repositoryId || '')
                    const folderName = folderNameById.get(repoId) || hit.type
                    const date = getSearchHitDate(hit)
                    const attached = isAttached(hit)
                    const attaching = attachingKey === key

                    return (
                      <div
                        key={key + idx}
                        className={cn(
                          'animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex items-start gap-2.5 rounded-lg border border-[var(--gray-3)] bg-surface p-2.5 shadow-xs transition-all duration-400',
                          attached
                            ? 'opacity-60'
                            : 'hover:border-[var(--primary-4)] hover:shadow-sm',
                        )}
                        style={{
                          animationDelay: `${Math.min(idx, 12) * 80}ms`,
                        }}
                      >
                        <div
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-lg',
                            iconStyles.wrap,
                          )}
                        >
                          <Icon className='size-4' name={iconName} />
                        </div>
                        <div className='min-w-0 flex-1'>
                          <div
                            className='truncate text-[12.5px] font-semibold text-[var(--gray-13)]'
                            title={title}
                          >
                            {title}
                          </div>
                          {folderName && (
                            <div className='mt-0.5 flex items-center gap-1 text-[11px] text-[var(--gray-9)]'>
                              <Icon
                                className='h-3 w-3 text-[var(--primary-9)]'
                                name='tabler:folder'
                              />
                              <span className='truncate'>{folderName}</span>
                            </div>
                          )}
                          {hit.matchSource && (
                            <div className='mt-0.5 truncate text-[10.5px] text-[var(--gray-9)]'>
                              {t`Matched in:`}{' '}
                              <span className='capitalize'>
                                {hit.matchSource}
                              </span>
                            </div>
                          )}
                          {date && (
                            <div className='mt-0.5 text-[10.5px] text-[var(--gray-9)]'>
                              {formatUtcToLocalDate(date)}
                            </div>
                          )}
                        </div>
                        <button
                          disabled={attached || attaching}
                          type='button'
                          className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold transition-all active:scale-90',
                            attached
                              ? 'bg-[var(--green-2)] text-[var(--green-9)]'
                              : 'text-[var(--primary-9)] hover:bg-[var(--primary-2)]',
                          )}
                          title={
                            attached
                              ? t`Already attached`
                              : t`Attach to invoice`
                          }
                          onClick={() => void handleAttach(hit)}
                        >
                          {attaching ? (
                            <Icon
                              className='h-3.5 w-3.5 animate-spin'
                              name='tabler:loader-2'
                            />
                          ) : (
                            <Icon
                              className='h-3.5 w-3.5'
                              name={attached ? 'tabler:check' : 'tabler:plus'}
                            />
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>

                {displayResults.length > RESULTS_PREVIEW_COUNT && (
                  <button
                    className='mt-2.5 block w-full rounded-lg py-1.5 text-center text-[11.5px] font-semibold text-[var(--primary-9)] hover:underline'
                    type='button'
                    onClick={() => setShowAll((prev) => !prev)}
                  >
                    {showAll ? t`Show less` : t`Show all ${matchCount} matches`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

RelatedDocumentsFinder.displayName = 'RelatedDocumentsFinder'
export default RelatedDocumentsFinder
