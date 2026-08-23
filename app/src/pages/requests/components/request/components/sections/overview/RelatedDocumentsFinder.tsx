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
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  FileCode,
  File as FileIcon,
} from 'lucide-react'
import cn from '@/utils/cn'
import { formatUtcToLocalDate, parseUtcDate } from '@/utils/utcDate'
import { getFileIcon, getFileIconClasses } from '../attachment/Attachments'

type CustomChip = {
  key: string
  on: boolean
  value: string
}

type FolderItem = {
  count: number
  id: string
  name: string
}

type ScoredHit = GlobalSearchHit & {
  pct: number
  reasons: string[]
}

type Props = {
  agentData?: any
  attachedIds?: Set<string>
  documentId?: string
  instanceId?: number | string
  invoiceAmount?: string
  invoiceNumber?: string
  metadata?: any
  poNumber?: string
  repositoryId?: number | string
  supplierName?: string
  workflowId?: number
  onAttached?: () => void
  onLinkDocument?: (hit: GlobalSearchHit) => void
}

const RESULTS_PREVIEW_COUNT = 4
const RECENT_WINDOW_MS = 90 * 24 * 60 * 60 * 1000

const hitKey = (hit: GlobalSearchHit): string =>
  String(hit.id?.itemId || hit.id?.repositoryId || getSearchHitTitle(hit))

const getFileExtLabel = (title: string): string => {
  const parts = title.split('.')
  if (parts.length > 1) {
    const ext = parts.pop()?.toUpperCase()
    if (ext && ext.length <= 4) return ext
  }
  return 'PDF'
}

const renderResultFileIcon = (title: string) => {
  const parts = title.split('.')
  const ext = (parts.length > 1 ? parts.pop()?.toLowerCase() || 'pdf' : 'pdf').trim()
  const icon = getFileIcon(ext)
  const styles = getFileIconClasses(ext)

  return (
    <div
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-lg mt-0.5',
        styles.wrap,
      )}
    >
      <Icon className='size-4' name={icon} />
    </div>
  )
}

const RelatedDocumentsFinder = ({
  agentData,
  attachedIds = new Set(),
  documentId,
  instanceId,
  invoiceAmount,
  invoiceNumber,
  metadata,
  poNumber,
  repositoryId,
  supplierName,
  workflowId,
  onAttached,
  onLinkDocument,
}: Props) => {
  const { t } = useLingui()

  const [stage, setStage] = useState<'intro' | 'search'>('intro')
  const [keyword, setKeyword] = useState('')
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<GlobalSearchHit[]>([])
  const [showAll, setShowAll] = useState(false)

  // Folder selection state
  const [selectedFolders, setSelectedFolders] = useState<string[]>([])
  const [showFolderDropdown, setShowFolderDropdown] = useState(false)
  const [folderSearchQuery, setFolderSearchQuery] = useState('')
  const [hasInitializedDefaultFolder, setHasInitializedDefaultFolder] = useState(false)

  // Seeds / AI Context state
  const [activeSeedKeys, setActiveSeedKeys] = useState<Set<string>>(new Set())
  const [showKeywordDropdown, setShowKeywordDropdown] = useState(false)
  const [keywordSearchQuery, setKeywordSearchQuery] = useState('')

  const [customChips, setCustomChips] = useState<CustomChip[]>([])
  const [showAddField, setShowAddField] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldValue, setNewFieldValue] = useState('')

  // Batch selection state
  const [selectedResultKeys, setSelectedResultKeys] = useState<Set<string>>(
    new Set(),
  )

  const [attachingKey, setAttachingKey] = useState<string | null>(null)
  const [localAttached, setLocalAttached] = useState<Set<string>>(new Set())

  const keywordRef = useRef<HTMLInputElement>(null)
  const folderDropdownRef = useRef<HTMLDivElement>(null)
  const keywordDropdownRef = useRef<HTMLDivElement>(null)

  const { data: repositories = [] } = useQuery(getRepositoriesQueryOptions())

  // Handle outside clicks to close popover dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | PointerEvent) => {
      if (
        folderDropdownRef.current &&
        !folderDropdownRef.current.contains(e.target as Node)
      ) {
        setShowFolderDropdown(false)
      }
      if (
        keywordDropdownRef.current &&
        !keywordDropdownRef.current.contains(e.target as Node)
      ) {
        setShowKeywordDropdown(false)
      }
    }
    document.addEventListener('pointerdown', handleOutsideClick, true)
    document.addEventListener('mousedown', handleOutsideClick, true)
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick, true)
      document.removeEventListener('mousedown', handleOutsideClick, true)
    }
  }, [])

  const availableFolders: FolderItem[] = useMemo(() => {
    if (repositories.length > 0) {
      return repositories.map((r: { count?: number; id: string; name: string }) => ({
        count: r.count ?? 4,
        id: String(r.id),
        name: r.name,
      }))
    }
    return [
      { count: 3, id: 'ap', name: 'Accounts Payable' },
      { count: 2, id: 'pl', name: 'Procurement Ledger' },
      { count: 2, id: 'va', name: 'Vendor Archive' },
      { count: 2, id: 'gr', name: 'Goods Receipt' },
      { count: 1, id: 'ct', name: 'Contracts' },
      { count: 1, id: 'st', name: 'Statutory' },
    ]
  }, [repositories])

  // Default selection for "Looking in": select the workflow's target folder/repository by default
  useEffect(() => {
    if (hasInitializedDefaultFolder || availableFolders.length === 0) return
    if (repositoryId) {
      const repoStr = String(repositoryId)
      const currentRepo = availableFolders.find(
        (f) => String(f.id) === repoStr || f.name.toLowerCase() === repoStr.toLowerCase(),
      )
      if (currentRepo) {
        setSelectedFolders([currentRepo.name])
        setHasInitializedDefaultFolder(true)
        return
      }
    }
    if (availableFolders.length > 0) {
      setSelectedFolders([availableFolders[0].name])
      setHasInitializedDefaultFolder(true)
    }
  }, [repositoryId, availableFolders, hasInitializedDefaultFolder])

  const filteredAvailableFolders = useMemo(() => {
    const q = folderSearchQuery.trim().toLowerCase()
    if (!q) return availableFolders
    return availableFolders.filter((f) => f.name.toLowerCase().includes(q))
  }, [availableFolders, folderSearchQuery])

  const defaultSeeds = useMemo(() => {
    const seeds: { key: string; label: string; value: string; weight: number }[] = []
    const addedValues = new Set<string>()

    const addSeed = (key: string, rawVal: any, weight: number) => {
      if (rawVal === undefined || rawVal === null) return
      let valStr = ''
      if (typeof rawVal === 'object' && rawVal !== null) {
        valStr = String(
          rawVal.value ?? rawVal.val ?? rawVal['Invoice Value'] ?? rawVal['InvoiceValue'] ?? '',
        ).trim()
      } else {
        valStr = String(rawVal).trim()
      }

      if (
        !valStr ||
        valStr === '-' ||
        valStr.toLowerCase() === 'the supplier' ||
        valStr.toLowerCase() === 'null' ||
        addedValues.has(valStr.toLowerCase())
      ) {
        return
      }

      addedValues.add(valStr.toLowerCase())
      seeds.push({ key, label: valStr, value: valStr, weight })
    }

    // 1. From agentresponse -> extracted invoice json -> invoice header
    const agentObj =
      agentData?._agentResponse ||
      agentData?._agentData?.[0] ||
      agentData?._agentData ||
      agentData

    const invoiceHeader =
      agentObj?.['Extracted Invoice JSON']?.invoice_header ||
      agentObj?.['extracted_invoice_json']?.invoice_header ||
      agentObj?.extracted_invoice_json?.invoice_header ||
      agentObj?.invoice_header

    if (invoiceHeader && typeof invoiceHeader === 'object') {
      Object.entries(invoiceHeader).forEach(([k, v]) => {
        if (!k.startsWith('_') && typeof v !== 'function') {
          addSeed(k, v, 20)
        }
      })
    }

    // 2. From upload page metadata / infoCards
    if (metadata && typeof metadata === 'object') {
      if (Array.isArray(metadata.infoCards)) {
        metadata.infoCards.forEach((card: any) => {
          if (Array.isArray(card.rows)) {
            card.rows.forEach((row: any) => {
              if (row.label && row.value) {
                addSeed(row.label, row.value, 15)
              }
            })
          }
        })
      } else if (Array.isArray(metadata)) {
        metadata.forEach((item: any) => {
          if (item.label && item.value) {
            addSeed(item.label, item.value, 15)
          }
        })
      } else {
        Object.entries(metadata).forEach(([k, v]) => {
          if (!k.startsWith('_')) {
            addSeed(k, v, 15)
          }
        })
      }
    }

    // 3. Fallback explicit props
    if (poNumber) addSeed('po', poNumber, 45)
    if (supplierName) addSeed('vendor', supplierName, 22)
    if (invoiceAmount) addSeed('amount', `$${invoiceAmount}`, 18)
    if (invoiceNumber) addSeed('invoiceNo', invoiceNumber, 15)

    if (!addedValues.has('90') && !addedValues.has('last 90 days')) {
      seeds.push({
        key: 'recent',
        label: t`Last 90 days`,
        value: '90',
        weight: 4,
      })
    }

    return seeds
  }, [agentData, metadata, poNumber, supplierName, invoiceAmount, invoiceNumber, t])

  const filteredAvailableSeeds = useMemo(() => {
    const remainingSeeds = defaultSeeds.slice(4)
    const q = keywordSearchQuery.trim().toLowerCase()
    if (!q) return remainingSeeds
    return remainingSeeds.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.value.toLowerCase().includes(q) ||
        s.key.toLowerCase().includes(q),
    )
  }, [defaultSeeds, keywordSearchQuery])

  const toggleFolder = (folderName: string) => {
    setSelectedFolders((prev) =>
      prev.includes(folderName)
        ? prev.filter((f) => f !== folderName)
        : [...prev, folderName],
    )
  }

  const removeFolder = (folderName: string) => {
    setSelectedFolders((prev) => prev.filter((f) => f !== folderName))
  }

  const clearFolders = () => {
    setSelectedFolders([])
  }

  const toggleSeed = (key: string) => {
    setActiveSeedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleCustomChip = (index: number) => {
    setCustomChips((prev) =>
      prev.map((c, i) => (i === index ? { ...c, on: !c.on } : c)),
    )
  }

  const removeCustomChip = (index: number) => {
    setCustomChips((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddCustomField = () => {
    const k = newFieldName.trim()
    const v = newFieldValue.trim()
    if (!k || !v) return
    setCustomChips((prev) => [
      ...prev,
      { key: k.toUpperCase(), on: true, value: v },
    ])
    setNewFieldName('')
    setNewFieldValue('')
    setShowAddField(false)
  }

  const runSearch = async (overrideKeyword?: string) => {
    const activeSeedValues = defaultSeeds
      .filter((s) => activeSeedKeys.has(s.key))
      .map((s) => s.value)
    const activeCustomValues = customChips
      .filter((c) => c.on)
      .map((c) => c.value)
    const combinedTerms = [...activeSeedValues, ...activeCustomValues].join(' ')
    const q = (overrideKeyword ?? keyword).trim() || combinedTerms || 'invoice'

    setLoading(true)
    setError('')
    setShowAll(false)
    setSelectedResultKeys(new Set())

    try {
      const folderIdsArray = selectedFolders
        .map(
          (name) => availableFolders.find((f) => f.name === name)?.id || name,
        )
        .filter(Boolean)

      const hits = await fetchGlobalSearch({
        actionFrom: 'Repository',
        query: q,
        specificId: folderIdsArray.length ? folderIdsArray : null,
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
    setSelectedResultKeys(new Set())
  }

  // Calculate score percentage and reasons for each search result hit
  const scoredResults: ScoredHit[] = useMemo(() => {
    const isRecentOnly = activeSeedKeys.has('recent')

    const filtered = results.filter((hit) => {
      if (
        selectedFolders.length > 0 &&
        hit.name &&
        !selectedFolders.includes(hit.name)
      ) {
        return false
      }
      if (isRecentOnly) {
        const date = parseUtcDate(getSearchHitDate(hit))
        if (date && Date.now() - date.getTime() > RECENT_WINDOW_MS) {
          return false
        }
      }
      return true
    })

    return filtered
      .map((hit) => {
        const title = getSearchHitTitle(hit).toLowerCase()
        const reasons: string[] = []
        let score = 0

        if (
          poNumber &&
          activeSeedKeys.has('po') &&
          title.includes(poNumber.toLowerCase())
        ) {
          reasons.push(poNumber)
          score += 45
        }
        if (
          supplierName &&
          activeSeedKeys.has('vendor') &&
          title.includes(supplierName.toLowerCase())
        ) {
          reasons.push(supplierName)
          score += 22
        }
        if (
          invoiceAmount &&
          activeSeedKeys.has('amount') &&
          title.includes(invoiceAmount.toLowerCase())
        ) {
          reasons.push(`$${invoiceAmount}`)
          score += 18
        }
        if (hit.matchSource) {
          reasons.push(t`Found in ${hit.matchSource}`)
          score += 15
        }
        if (hit.name) {
          reasons.push(t`Folder: ${hit.name}`)
          score += 8
        }

        if (reasons.length === 0) {
          reasons.push(t`Matched search criteria`)
          score += 10
        }

        const pct = Math.min(98, 42 + score)
        return { ...hit, pct, reasons }
      })
      .sort((a, b) => b.pct - a.pct)
  }, [results, selectedFolders, activeSeedKeys, poNumber, supplierName, invoiceAmount, t])

  const visibleResults = showAll
    ? scoredResults
    : scoredResults.slice(0, RESULTS_PREVIEW_COUNT)
  const matchCount = scoredResults.length

  const isAttached = (hit: GlobalSearchHit) => {
    const itemId = String(hit.id?.itemId || hit.id?.repositoryId || '')
    return (
      (itemId && attachedIds.has(itemId)) ||
      localAttached.has(hitKey(hit)) ||
      (documentId && itemId === documentId)
    )
  }

  const handleLinkHit = async (hit: GlobalSearchHit) => {
    const repoId = String(hit.id?.repositoryId || '').trim()
    const itemId = String(hit.id?.itemId || '').trim()
    const key = hitKey(hit)
    const title = getSearchHitTitle(hit)

    if (onLinkDocument) {
      setLocalAttached((prev) => new Set(prev).add(key))
      onLinkDocument(hit)
      showToast({
        message: t`Linked ${title} to this document`,
        variant: 'success',
      })
      return
    }

    if (!repoId || !itemId) {
      showToast({
        message: t`This result cannot be attached.`,
        variant: 'error',
      })
      return
    }

    if (!workflowId || !instanceId || !repositoryId) {
      showToast({
        message: t`Cannot attach: missing workflow attachment context.`,
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
        message: t`Linked ${title} to this document`,
        variant: 'success',
      })
      onAttached?.()
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

  const toggleSelectResultKey = (key: string) => {
    setSelectedResultKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleLinkSelected = async () => {
    const hitsToLink = scoredResults.filter((h) =>
      selectedResultKeys.has(hitKey(h)),
    )
    for (const hit of hitsToLink) {
      await handleLinkHit(hit)
    }
    setSelectedResultKeys(new Set())
  }

  return (
    <div className='animate-in fade-in zoom-in-95 fill-mode-both mb-0 rounded-2xl border border-[var(--primary-3)] border-l-4 border-l-[var(--primary-9)] bg-gradient-to-b from-[var(--primary-1)]/40 to-surface shadow-xs transition-all duration-300'>
      {stage === 'intro' ? (
        <div className='flex items-start justify-between gap-3 p-3.5 sm:p-4'>
          <div className='flex items-start gap-3 min-w-0'>
            <AiBrandIcon className='size-4 shrink-0 mt-0.5' />
            <div className='min-w-0 flex-1'>
              <h4 className='truncate text-[14px] font-bold text-[var(--gray-13)]'>
                {t`Find related documents`}
              </h4>
              <p className='mt-0.5 text-xs text-[var(--gray-9)] line-clamp-2'>
                {t`Look for the purchase order, receipt, contract or any file that belongs with this document.`}
              </p>
            </div>
          </div>

          <button
            className='inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--primary-4)] bg-[var(--primary-2)] px-3.5 py-2 text-xs font-bold text-[var(--primary-9)] shadow-xs transition-all hover:scale-[1.02] hover:bg-[var(--primary-3)] hover:text-[var(--primary-10)] active:scale-95'
            type='button'
            onClick={openSearch}
          >
            <Icon className='h-3.5 w-3.5' name='tabler:search' />
            <span>{t`Start search`}</span>
          </button>
        </div>
      ) : (
        <div className='animate-in fade-in slide-in-from-top-1 p-3.5 sm:p-4 pb-2.5 sm:pb-3 duration-200'>
          {/* Panel Header */}
          <div className='flex items-start justify-between gap-2 border-b border-[var(--gray-3)] pb-3'>
            <div className='flex items-start gap-2.5 min-w-0'>
              <AiBrandIcon className='size-4 shrink-0 mt-0.5' />
              <div className='min-w-0 flex-1'>
                <span className='block truncate text-[14px] font-bold text-[var(--gray-13)]'>
                  {t`Find related documents`}
                </span>
                <p className='mt-0.5 truncate text-[11.5px] text-[var(--gray-9)]'>
                  {t`Look for the purchase order, receipt, contract or any file that belongs with this document.`}
                </p>
              </div>
            </div>

            <div className='flex items-center gap-2 shrink-0'>
              {searched && !loading && (
                <span className='rounded-full bg-[var(--primary-1)] border border-[var(--primary-3)] px-2.5 py-0.5 text-[11.5px] font-medium text-[var(--primary-9)]'>
                  {t`${matchCount} match${matchCount === 1 ? '' : 'es'}`}
                </span>
              )}
              <button
                className='flex size-7 items-center justify-center rounded-lg text-[var(--gray-9)] transition-colors hover:bg-[var(--primary-2)] hover:text-[var(--primary-9)]'
                type='button'
                title={t`Close`}
                onClick={closeSearch}
              >
                <Icon className='h-4 w-4' name='tabler:x' />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className='mt-3 flex gap-2'>
            <div className='flex h-9 flex-1 items-center gap-2 rounded-xl border border-[var(--gray-4)] bg-surface px-3 transition-all focus-within:border-[var(--primary-6)] focus-within:ring-2 focus-within:ring-[var(--primary-4)]/25'>
              <Icon
                className='h-4 w-4 shrink-0 text-[var(--gray-9)]'
                name='tabler:search'
              />
              <input
                className='min-w-0 flex-1 border-none bg-transparent text-xs font-medium text-[var(--gray-13)] placeholder:text-[var(--gray-9)] focus:ring-0 focus:outline-none'
                placeholder={t`Search by document name, reference, PO, vendor or keywords...`}
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
            <button
              className='inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--primary-9)] px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-[var(--primary-10)] active:scale-95 disabled:opacity-50'
              disabled={loading}
              type='button'
              onClick={() => void runSearch()}
            >
              <Icon className='h-3.5 w-3.5' name='tabler:search' />
              <span>{t`Search`}</span>
            </button>
          </div>

          {/* Looking in Section */}
          <div className='mt-3 flex items-center gap-2.5'>
            <span className='shrink-0 text-xs font-semibold text-[var(--gray-12)]'>
              {t`Looking in`}
            </span>
            <div className='flex flex-1 flex-wrap items-center gap-1.5'>
              {selectedFolders.length === 0 ? (
                <span className='inline-flex items-center rounded-full border border-[var(--primary-4)] bg-[var(--primary-2)] px-2.5 py-1 text-xs font-medium text-[var(--primary-9)]'>
                  {t`All folders`}
                </span>
              ) : (
                selectedFolders.map((f) => (
                  <button
                    className='inline-flex items-center gap-1.5 rounded-full border border-[var(--primary-4)] bg-[var(--primary-2)] px-2.5 py-1 text-xs font-medium text-[var(--primary-9)] transition-colors hover:bg-[var(--primary-3)]'
                    key={f}
                    type='button'
                    onClick={() => removeFolder(f)}
                  >
                    <span>{f}</span>
                    <Icon className='h-3 w-3 opacity-60 hover:opacity-100' name='tabler:x' />
                  </button>
                ))
              )}

              {/* Dedicated container for folder dropdown ref */}
              <div className='relative inline-block' ref={folderDropdownRef}>
                <button
                  type='button'
                  className='inline-flex items-center justify-center size-6 rounded-full border border-dashed border-[var(--primary-4)] bg-transparent text-xs font-medium text-[var(--primary-9)] transition-colors hover:bg-[var(--primary-1)]'
                  title={t`Select folders`}
                  onClick={() => setShowFolderDropdown((prev) => !prev)}
                >
                  <Icon className='h-3.5 w-3.5' name='tabler:plus' />
                </button>

                {/* Searchable multi-select folder dropdown popover */}
                {showFolderDropdown && (
                  <div className='animate-in fade-in slide-in-from-top-1 absolute top-8 left-0 z-50 w-60 overflow-hidden rounded-xl border border-[var(--gray-4)] bg-surface-raised shadow-lg duration-150'>
                    <div className='p-2 border-b border-[var(--gray-3)] bg-surface'>
                      <div className='flex h-8 items-center gap-1.5 rounded-lg border border-[var(--gray-4)] bg-surface px-2.5 transition-all focus-within:border-[var(--primary-6)]'>
                        <Icon className='h-3.5 w-3.5 text-[var(--gray-8)] shrink-0' name='tabler:search' />
                        <input
                          className='w-full border-none bg-transparent text-xs text-[var(--gray-13)] placeholder:text-[var(--gray-9)] focus:ring-0 focus:outline-none'
                          placeholder={t`Search folders...`}
                          value={folderSearchQuery}
                          onChange={(e) => setFolderSearchQuery(e.target.value)}
                        />
                        {folderSearchQuery && (
                          <button
                            type='button'
                            className='text-[var(--gray-8)] hover:text-[var(--gray-11)]'
                            onClick={() => setFolderSearchQuery('')}
                          >
                            <Icon className='h-3 w-3' name='tabler:x' />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className='max-h-48 overflow-y-auto p-1'>
                      {filteredAvailableFolders.length === 0 ? (
                        <div className='px-3 py-2 text-xs text-[var(--gray-9)] text-center'>
                          {t`No matching folders`}
                        </div>
                      ) : (
                        filteredAvailableFolders.map((f) => {
                          const isSelected = selectedFolders.includes(f.name)
                          return (
                            <div
                              key={f.id}
                              className='flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--gray-13)] transition-colors hover:bg-[var(--primary-1)] font-medium select-none'
                              onClick={() => toggleFolder(f.name)}
                            >
                              <div
                                className={cn(
                                  'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                                  isSelected
                                    ? 'border-[var(--primary-9)] bg-[var(--primary-9)] text-white'
                                    : 'border-[var(--gray-5)] bg-surface',
                                )}
                              >
                                {isSelected && <Icon className='h-3 w-3' name='tabler:check' />}
                              </div>
                              <span className='min-w-0 flex-1 truncate'>{f.name}</span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedFolders.length > 0 && (
                <button
                  type='button'
                  className='inline-flex items-center rounded-full border border-dashed border-[var(--gray-5)] px-2.5 py-1 text-xs font-medium text-[var(--gray-9)] hover:border-[var(--primary-4)] hover:text-[var(--primary-9)]'
                  onClick={clearFolders}
                >
                  {t`Clear`}
                </button>
              )}
            </div>
          </div>

          {/* AI Context Chips Row */}
          <div className='mt-2.5 flex items-center gap-2.5'>
            <span className='shrink-0 text-xs font-semibold text-[var(--gray-12)]'>
              {t`AI Context`}
            </span>
            <div className='flex flex-1 flex-wrap items-center gap-1.5'>
              {defaultSeeds.slice(0, 4).map((seed) => {
                const active = activeSeedKeys.has(seed.key)
                return (
                  <button
                    key={seed.key}
                    type='button'
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-all select-none',
                      active
                        ? 'border-[var(--primary-4)] bg-[var(--primary-2)] font-semibold text-[var(--primary-10)]'
                        : 'border-[var(--gray-4)] bg-surface text-[var(--gray-9)] hover:border-[var(--primary-4)] hover:text-[var(--primary-9)]',
                    )}
                    onClick={() => toggleSeed(seed.key)}
                  >
                    <span>{seed.label}</span>
                  </button>
                )
              })}

              {defaultSeeds.slice(4).map((seed) => {
                const active = activeSeedKeys.has(seed.key)
                if (!active) return null
                return (
                  <button
                    key={seed.key}
                    type='button'
                    className='inline-flex items-center rounded-full border border-[var(--primary-4)] bg-[var(--primary-2)] px-2.5 py-1 text-xs font-semibold text-[var(--primary-10)] transition-all select-none'
                    onClick={() => toggleSeed(seed.key)}
                  >
                    <span>{seed.label}</span>
                  </button>
                )
              })}

              {customChips.map((c, i) => (
                <div
                  key={c.key + i}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all select-none',
                    c.on
                      ? 'border-[var(--primary-4)] bg-[var(--primary-2)] text-[var(--primary-10)]'
                      : 'border-[var(--gray-4)] bg-surface text-[var(--gray-8)] line-through',
                  )}
                  onClick={() => toggleCustomChip(i)}
                >
                  <span className='opacity-75 font-bold'>{c.key}:</span>
                  <span>{c.value}</span>
                  <button
                    type='button'
                    className='ml-0.5 flex size-3.5 items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:bg-[var(--primary-3)]'
                    onClick={(e) => {
                      e.stopPropagation()
                      removeCustomChip(i)
                    }}
                  >
                    <Icon className='h-2.5 w-2.5' name='tabler:x' />
                  </button>
                </div>
              ))}

              {/* Dedicated container for keyword dropdown ref */}
              <div className='relative inline-block' ref={keywordDropdownRef}>
                <button
                  type='button'
                  className='inline-flex items-center justify-center size-6 rounded-full border border-dashed border-[var(--primary-4)] bg-transparent text-xs font-medium text-[var(--primary-9)] transition-colors hover:bg-[var(--primary-1)]'
                  title={t`Select keywords`}
                  onClick={() => setShowKeywordDropdown((prev) => !prev)}
                >
                  <Icon className='h-3.5 w-3.5' name='tabler:plus' />
                </button>

                {/* Searchable multi-select keyword dropdown popover */}
                {showKeywordDropdown && (
                  <div className='animate-in fade-in slide-in-from-top-1 absolute top-8 left-0 z-50 w-64 overflow-hidden rounded-xl border border-[var(--gray-4)] bg-surface-raised shadow-lg duration-150'>
                    <div className='p-2 border-b border-[var(--gray-3)] bg-surface'>
                      <div className='flex h-8 items-center gap-1.5 rounded-lg border border-[var(--gray-4)] bg-surface px-2.5 transition-all focus-within:border-[var(--primary-6)]'>
                        <Icon className='h-3.5 w-3.5 text-[var(--gray-8)] shrink-0' name='tabler:search' />
                        <input
                          className='w-full border-none bg-transparent text-xs text-[var(--gray-13)] placeholder:text-[var(--gray-9)] focus:ring-0 focus:outline-none'
                          placeholder={t`Search keywords...`}
                          value={keywordSearchQuery}
                          onChange={(e) => setKeywordSearchQuery(e.target.value)}
                        />
                        {keywordSearchQuery && (
                          <button
                            type='button'
                            className='text-[var(--gray-8)] hover:text-[var(--gray-11)]'
                            onClick={() => setKeywordSearchQuery('')}
                          >
                            <Icon className='h-3 w-3' name='tabler:x' />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className='max-h-48 overflow-y-auto p-1'>
                      {filteredAvailableSeeds.length === 0 ? (
                        <div className='px-3 py-2 text-xs text-[var(--gray-9)] text-center'>
                          {t`No matching keywords`}
                        </div>
                      ) : (
                        filteredAvailableSeeds.map((seed) => {
                          const isSelected = activeSeedKeys.has(seed.key)
                          return (
                            <div
                              key={seed.key}
                              className='flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--gray-13)] transition-colors hover:bg-[var(--primary-1)] font-medium select-none'
                              onClick={() => toggleSeed(seed.key)}
                            >
                              <div
                                className={cn(
                                  'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                                  isSelected
                                    ? 'border-[var(--primary-9)] bg-[var(--primary-9)] text-white'
                                    : 'border-[var(--gray-5)] bg-surface',
                                )}
                              >
                                {isSelected && <Icon className='h-3 w-3' name='tabler:check' />}
                              </div>
                              <span className='min-w-0 flex-1 truncate'>{seed.label}</span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add Custom Field Form */}
          {showAddField && (
            <div className='animate-in fade-in slide-in-from-top-1 mt-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--primary-3)] bg-[var(--primary-1)]/40 p-2.5 ml-2'>
              <input
                className='h-8 w-36 rounded-lg border border-[var(--gray-4)] bg-surface px-2.5 text-xs text-[var(--gray-13)] outline-none focus:border-[var(--primary-6)]'
                placeholder={t`Keyword / Field`}
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
              />
              <input
                className='h-8 flex-1 min-w-[120px] rounded-lg border border-[var(--gray-4)] bg-surface px-2.5 text-xs text-[var(--gray-13)] outline-none focus:border-[var(--primary-6)]'
                placeholder={t`e.g. CT-908`}
                value={newFieldValue}
                onChange={(e) => setNewFieldValue(e.target.value)}
              />
              <button
                type='button'
                className='h-8 rounded-lg bg-[var(--primary-9)] px-3 text-xs font-bold text-white transition-all hover:bg-[var(--primary-10)] active:scale-95'
                onClick={handleAddCustomField}
              >
                {t`+ Add`}
              </button>
              <button
                type='button'
                className='h-8 rounded-lg px-2.5 text-xs font-semibold text-[var(--gray-9)] hover:text-[var(--gray-13)]'
                onClick={() => setShowAddField(false)}
              >
                {t`Cancel`}
              </button>
            </div>
          )}

          {/* Results List / Grid matching attachment-section-final HTML sample */}
          {(searched || loading) && (
            <div className='mt-3 border-t border-[var(--gray-3)] bg-[var(--pane)] p-2.5 pb-0.5 rounded-xl'>
            {loading ? (
              <div className='flex flex-col items-center justify-center gap-2 py-6 text-[var(--gray-9)] text-xs'>
                <AiBrandIcon className='size-5 animate-pulse' />
                <p>{t`Looking through your folders…`}</p>
              </div>
            ) : error ? (
              <div className='py-5 text-center text-xs text-[var(--red-10)]'>
                {error}
              </div>
            ) : scoredResults.length === 0 ? (
              <div className='py-5 text-center text-xs leading-relaxed text-[var(--gray-10)]'>
                {t`No related documents found.`}<br />
                {t`Try a different keyword, another folder, or switch off one of the invoice conditions.`}
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
                    const folderName =
                      hit.name && hit.name !== 'Main Repository'
                        ? hit.name
                        : selectedFolders[0] ||
                          availableFolders.find(
                            (f) => String(f.id) === String(hit.id?.repositoryId || repositoryId),
                          )?.name ||
                          availableFolders[0]?.name ||
                          'Accounts Payable'
                    const attached = isAttached(hit)
                    const attaching = attachingKey === key
                    const isChecked = selectedResultKeys.has(key)

                    return (
                      <div
                        key={key + idx}
                        className={cn(
                          'animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex items-start gap-2.5 rounded-lg border border-[var(--gray-3)] bg-surface p-2.5 shadow-xs transition-all duration-300',
                          attached
                            ? 'opacity-55'
                            : 'hover:border-[var(--primary-4)] hover:shadow-xs',
                        )}
                        style={{
                          animationDelay: `${Math.min(idx, 12) * 40}ms`,
                        }}
                      >
                        {/* PDF / File Icon */}
                        {renderResultFileIcon(title)}

                        <div className='min-w-0 flex-1'>
                          {/* Title (.mn) */}
                          <div
                            className='truncate text-xs font-semibold text-[var(--primary-9)] hover:underline cursor-pointer'
                            title={title}
                          >
                            {title}
                          </div>
                          {/* Folder (.mf) */}
                          {folderName && (
                            <div className='mt-1 flex items-center gap-1 text-[11px] font-medium text-[var(--primary-9)] truncate'>
                              <Icon
                                className='h-3 w-3 shrink-0 text-[var(--primary-9)]'
                                name='tabler:folder'
                              />
                              <span className='truncate'>{folderName}</span>
                            </div>
                          )}
                          {/* Why/reasons line (.mw) */}
                          {hit.reasons.length > 0 && (
                            <div
                              className='mt-1 truncate text-[10.5px] text-[var(--gray-9)]'
                              title={hit.reasons.join(' · ')}
                            >
                              {hit.reasons.join(' · ')}
                            </div>
                          )}
                        </div>

                        {/* Score percentage (.pct) */}
                        <span className='shrink-0 text-[11.5px] text-[var(--gray-10)] pt-0.5 font-medium'>
                          {hit.pct}%
                        </span>

                        {/* Action button (Link Icon) */}
                        {attached ? (
                          <span
                            className='flex size-6 shrink-0 items-center justify-center rounded-md text-[var(--green-9)] font-bold text-xs'
                            title={t`Already in attachments`}
                          >
                            <Icon className='h-4 w-4 text-[var(--green-9)]' name='tabler:check' />
                          </span>
                        ) : (
                          <button
                            disabled={attaching}
                            type='button'
                            className='flex size-6 shrink-0 items-center justify-center rounded-md text-[var(--primary-9)] transition-all hover:bg-[var(--primary-2)] active:scale-90'
                            title={t`Link document`}
                            onClick={() => void handleLinkHit(hit)}
                          >
                            {attaching ? (
                              <Icon
                                className='h-3.5 w-3.5 animate-spin'
                                name='tabler:loader-2'
                              />
                            ) : (
                              <Icon className='h-4 w-4 text-[var(--primary-9)]' name='tabler:link' />
                            )}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {scoredResults.length > RESULTS_PREVIEW_COUNT && (
                  <button
                    className='mt-3.5 mb-0 py-0 block w-full text-center text-[11.5px] font-medium text-[var(--primary-9)] hover:underline'
                    type='button'
                    onClick={() => setShowAll((prev) => !prev)}
                  >
                    {showAll
                      ? t`Show less`
                      : t`Show more (${matchCount - RESULTS_PREVIEW_COUNT} more)`}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    )}
    </div>
  )
}

RelatedDocumentsFinder.displayName = 'RelatedDocumentsFinder'
export default RelatedDocumentsFinder
