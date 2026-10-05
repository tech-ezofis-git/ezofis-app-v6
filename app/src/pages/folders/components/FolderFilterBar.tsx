import { useLingui } from '@lingui/react/macro'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import CustomFilter, {
  type FilterDefinition,
  type FilterGroup,
  type FilterOption,
} from '@/components/common/CustomFilter'
import authUserStore from '@/stores/authUserStore'
import type {
  DynamicRepositoryColumn,
  RepositoryItemFilterField,
} from '../api/folderApi'
import type { ExplorerView, FolderItem } from '../types/folderTypes'
import type {
  ExplorerFilterMode,
  FolderFilterOptionsCache,
} from '../utils/folderExplorerUtils'
import { decodeRepositoryNodeId, folderApi } from '../api/folderApi'
import {
  formatFolderModifiedDate,
  getCachedFilterOptionsForId,
  mergeFilterOptionLists,
} from '../utils/folderExplorerUtils'
import {
  matchesAnyFilterValue,
  splitFilterValues,
} from '../utils/multiFilterValues'
import {
  getRepositoryFieldStringValue,
  matchesFieldKey,
  normalizeFieldKey,
} from '../utils/repositoryFieldUtils'
import { resolveShareContext } from '../utils/shareContextStorage'
import FolderSharePopover from './FolderSharePopover'

type AnyFileItem = Record<string, any>

/** Folder table filters — match Name, Date Modified columns (legacy client-side only). */
const DEFAULT_FOLDER_FILTER_SPECS = [
  { id: '__folderName' },
  { id: '__folderModified' },
] as const

/** How many API filter fields show as always-visible pills; the rest go under More. */
const DEFAULT_VISIBLE_ITEM_FILTER_COUNT = 3
const DEFAULT_FACET_LIMIT = 100

const normalizeKey = normalizeFieldKey

const isDateColumn = (dataType?: string) => {
  const normalized = String(dataType || '')
    .trim()
    .toLowerCase()
  return (
    normalized === 'date' ||
    normalized === 'datetime' ||
    normalized.includes('date')
  )
}

const isOptionListDataType = (dataType?: string) => {
  const normalized = String(dataType || '')
    .trim()
    .toUpperCase()
  if (!normalized) return true
  if (isDateColumn(normalized)) return false
  if (
    normalized.includes('NUMBER') ||
    normalized.includes('INT') ||
    normalized.includes('FLOAT') ||
    normalized.includes('DECIMAL') ||
    normalized.includes('CURRENCY') ||
    normalized.includes('AMOUNT')
  ) {
    return false
  }
  return true
}

const isDropdownDataType = (dataType?: string) => {
  const normalized = String(dataType || '')
    .trim()
    .toUpperCase()
  return (
    normalized.includes('SELECT') ||
    normalized.includes('DROPDOWN') ||
    normalized.includes('CHOICE') ||
    normalized.includes('OPTIONS') ||
    normalized.includes('LOOKUP') ||
    normalized === 'ENUM'
  )
}

const toFacetFilterOptions = (
  facets: Array<{ count?: number; value: string }>,
): FilterOption[] =>
  facets
    .map((facet) => {
      const value = String(facet.value || '').trim()
      if (!value) return null
      const count = Number(facet.count)
      const label =
        Number.isFinite(count) && count >= 0 ? `${value} (${count})` : value
      return { label, value }
    })
    .filter((option): option is FilterOption => Boolean(option))

const getFilterValue = (
  item: AnyFileItem,
  filterId: string,
  folderContextFilters: Record<string, string> = {},
) => getRepositoryFieldStringValue(item, filterId, folderContextFilters)

const mergeUniqueOptions = (
  ...optionLists: Array<Array<{ label: string; value: string }>>
) => mergeFilterOptionLists(...optionLists)

const withActiveFilterOption = (
  filterId: string,
  options: Array<{ label: string; value: string }>,
  activeFilters: Record<string, string> = {},
) => {
  const activeValues = splitFilterValues(activeFilters[filterId])
  if (!activeValues.length) return options

  return mergeUniqueOptions(
    options,
    activeValues.map((value) => ({ label: value, value })),
  )
}

const buildFilterOptionsFromContext = (
  filterId: string,
  folderContextFilters: Record<string, string> = {},
) => {
  const value = getRepositoryFieldStringValue(
    {},
    filterId,
    folderContextFilters,
  )
  if (!value) return []
  return [{ label: value, value }]
}

const buildFilterOptionsFromFiles = (files: AnyFileItem[], filterId: string) =>
  files
    .map((file) => getRepositoryFieldStringValue(file, filterId))
    .filter((value) => value.length > 0)
    .map((value) => ({ label: value, value }))

const shouldIncludeFolderOptions = (
  filterId: string,
  currentFolderGroupField?: string,
) => {
  if (!currentFolderGroupField) return false
  return matchesFieldKey(filterId, currentFolderGroupField)
}

/** Folder browse rows only contribute values for their active group field. */
const buildFilterOptionsFromFolders = (
  folders: FolderItem[],
  filterId: string,
) =>
  folders
    .map((folder) => {
      const decoded = decodeRepositoryNodeId(folder.id)
      if (!decoded || decoded.kind !== 'browse') return null
      if (!matchesFieldKey(decoded.groupField, filterId)) return null

      const value = String(
        decoded.groupValue || folder.title || decoded.label || '',
      ).trim()
      if (!value) return null

      return { label: value, value }
    })
    .filter((option): option is { label: string; value: string } =>
      Boolean(option),
    )

const buildFolderTableFilterOptions = (
  folders: FolderItem[],
  filterId: string,
) => {
  if (filterId === '__folderName') {
    return folders
      .map((folder) => String(folder.title || '').trim())
      .filter(Boolean)
      .map((value) => ({ label: value, value }))
  }

  if (filterId === '__folderItems') {
    return folders
      .map((folder) => String(folder.itemsText || '').trim())
      .filter((value) => value && value !== '-')
      .map((value) => ({ label: value, value }))
  }

  if (filterId === '__folderModified') {
    return folders
      .map((folder) => formatFolderModifiedDate(folder.modifiedText))
      .filter((value) => value && value !== '-')
      .map((value) => ({ label: value, value }))
  }

  return []
}

const getFolderTableFilterValue = (folder: FolderItem, filterId: string) => {
  if (filterId === '__folderName') return String(folder.title || '').trim()
  if (filterId === '__folderItems') return String(folder.itemsText || '').trim()
  if (filterId === '__folderModified') {
    return formatFolderModifiedDate(folder.modifiedText)
  }
  return ''
}

export const isFolderTableFilterId = (filterId: string) =>
  DEFAULT_FOLDER_FILTER_SPECS.some((spec) => spec.id === filterId)

const buildScopeFiltersForFacets = (
  activeFilters: Record<string, string>,
  folderContextFilters: Record<string, string>,
  excludeFilterId: string,
) => {
  const scope: Record<string, string | string[]> = {}
  const normalizedExclude = normalizeKey(excludeFilterId)

  Object.entries(folderContextFilters).forEach(([key, rawValue]) => {
    const parts = splitFilterValues(rawValue)
    if (!parts.length) return
    scope[key] = parts.length === 1 ? parts[0] : parts
  })

  Object.entries(activeFilters).forEach(([key, rawValue]) => {
    if (!String(rawValue || '').trim()) return
    if (isFolderTableFilterId(key)) return
    if (normalizeKey(key) === normalizedExclude) return
    const parts = splitFilterValues(rawValue)
    if (!parts.length) return
    scope[key] = parts.length === 1 ? parts[0] : parts
  })

  return scope
}

export const matchesSearchText = (
  item: Record<string, any>,
  searchQuery?: string,
): boolean => {
  if (!searchQuery) return true
  const query = searchQuery.trim().toLowerCase()
  if (!query) return true

  const visited = new WeakSet()

  const checkValue = (val: any): boolean => {
    if (val === null || val === undefined) return false

    if (
      typeof val === 'string' ||
      typeof val === 'number' ||
      typeof val === 'boolean'
    ) {
      return String(val).toLowerCase().includes(query)
    }

    if (typeof val === 'object') {
      if (visited.has(val)) return false
      visited.add(val)

      if (Array.isArray(val)) {
        return val.some(checkValue)
      }

      return Object.values(val).some(checkValue)
    }

    return false
  }

  return checkValue(item)
}

export const matchesFolderTableFilters = (
  folder: FolderItem,
  filters: Record<string, string>,
) =>
  Object.entries(filters).every(([key, value]) => {
    if (!value || !isFolderTableFilterId(key)) return true

    return matchesAnyFilterValue(getFolderTableFilterValue(folder, key), value)
  })

export const filterFolders = (
  folders: FolderItem[],
  filters: Record<string, string>,
  searchQuery = '',
) =>
  folders.filter(
    (folder) =>
      matchesSearchText(folder, searchQuery) &&
      matchesFolderTableFilters(folder, filters),
  )

export const matchesFolderFileFilters = (
  file: AnyFileItem,
  filters: Record<string, string>,
  folderContextFilters: Record<string, string> = {},
) =>
  Object.entries(filters).every(([key, value]) => {
    if (!value) return true

    return matchesAnyFilterValue(
      getFilterValue(file, key, folderContextFilters),
      value,
    )
  })

export const filterFolderFiles = (
  files: AnyFileItem[],
  filters: Record<string, string>,
  folderContextFilters: Record<string, string> = {},
  searchQuery = '',
) =>
  files.filter(
    (file) =>
      matchesSearchText(file, searchQuery) &&
      matchesFolderFileFilters(file, filters, folderContextFilters),
  )

type FolderFilterBarProps = {
  activeFilters: Record<string, string>
  afterSearchActions?: ReactNode
  currentFolderGroupField?: string
  fileColumns?: DynamicRepositoryColumn[]
  files: AnyFileItem[]
  filterMode?: ExplorerFilterMode
  filterOptionsCache?: FolderFilterOptionsCache
  folderContextFilters?: Record<string, string>
  folderFilterOptionSource?: FolderItem[]
  folders?: FolderItem[]
  isBusy?: boolean
  itemFilterFields?: RepositoryItemFilterField[]
  refreshing?: boolean
  repositoryId?: string
  searchPlaceholder?: string
  searchQuery: string
  view: ExplorerView
  onFilterChange: (id: string, value: string) => void
  onFilterMenuOpenChange?: (id: string | null) => void
  onIntelligentUpload?: () => void
  onRefresh?: () => void
  onResetFilters: () => void
  onSearchChange: (value: string) => void
  onShare?: (shares: any[], message: string) => Promise<boolean>
  onUpload?: () => void
  setView: (view: ExplorerView) => void
}

export function FolderFilterBar({
  activeFilters,
  afterSearchActions,
  currentFolderGroupField = '',
  fileColumns: _fileColumns = [],
  files,
  filterMode = 'files',
  filterOptionsCache = {},
  folderContextFilters = {},
  folderFilterOptionSource = [],
  folders = [],
  isBusy = false,
  itemFilterFields = [],
  refreshing = false,
  repositoryId = '',
  searchPlaceholder,
  searchQuery,
  view,
  setView,
  onFilterChange,
  onFilterMenuOpenChange,
  onIntelligentUpload,
  onRefresh,
  onResetFilters,
  onSearchChange,
  onShare,
  onUpload,
}: FolderFilterBarProps) {
  const { t } = useLingui()
  const effectivePlaceholder =
    searchPlaceholder || t`Search by name or metadata...`
  const showFileFilters = filterMode === 'files' || filterMode === 'both'
  const showFolderFilters = filterMode === 'folders' || filterMode === 'both'
  const folderBaseline =
    folderFilterOptionSource.length > 0 ? folderFilterOptionSource : folders
  const useApiItemFilters = itemFilterFields.length > 0

  const shareCtx = resolveShareContext(authUserStore.getState().shareContext)
  const isGuestShare = Boolean(shareCtx?.shareToken)

  const handleFilterChange = (id: string, value: string) => {
    if (isGuestShare) return
    onFilterChange(id, value)
  }

  const handleResetFilters = () => {
    if (isGuestShare) return
    onResetFilters()
  }

  const [facetOptionsByField, setFacetOptionsByField] = useState<
    Record<string, FilterOption[]>
  >({})
  const [loadingFacetField, setLoadingFacetField] = useState<string | null>(
    null,
  )
  const facetRequestSeqRef = useRef(0)

  const isSavedFilter = (filterId: string) => {
    const direct = String(activeFilters[filterId] || '').trim()
    if (direct) return true

    const normalizedFilterId = normalizeKey(filterId)
    return Object.entries(activeFilters).some(
      ([key, value]) =>
        Boolean(String(value || '').trim()) &&
        normalizeKey(key) === normalizedFilterId,
    )
  }

  /** Other currently saved folder filters (excludes the filter being opened). */
  const getSiblingFolderFilters = (filterId: string) => {
    const normalizedExclude = normalizeKey(filterId)
    return Object.fromEntries(
      Object.entries(activeFilters).filter(([key, value]) => {
        if (!String(value || '').trim()) return false
        if (!isFolderTableFilterId(key)) return false
        return normalizeKey(key) !== normalizedExclude
      }),
    )
  }

  /** Cache only for currently saved filters; new filters use fresh data. */
  const getCachedOptionsForFilter = (filterId: string) => {
    if (!isSavedFilter(filterId)) return []
    return getCachedFilterOptionsForId(filterOptionsCache, filterId)
  }

  const normalizedItemFilterFields = useMemo(
    () =>
      itemFilterFields
        .map((field) => {
          const id = String(field.sqlColumnName || field.name || '').trim()
          if (!id) return null
          return {
            dataType: String(field.dataType || '').trim(),
            id,
            label: String(field.name || field.sqlColumnName || id).trim() || id,
          }
        })
        .filter(
          (field): field is { dataType: string; id: string; label: string } =>
            Boolean(field),
        ),
    [itemFilterFields],
  )

  const prioritizedItemFilterFields = useMemo(() => {
    const dropdowns: typeof normalizedItemFilterFields = []
    const others: typeof normalizedItemFilterFields = []

    for (const field of normalizedItemFilterFields) {
      if (isDropdownDataType(field.dataType)) {
        dropdowns.push(field)
      } else {
        others.push(field)
      }
    }

    return [...dropdowns, ...others]
  }, [normalizedItemFilterFields])

  const loadFacetsForField = useCallback(
    async (filterId: string) => {
      const repoId = String(repositoryId || '').trim()
      if (!repoId || !useApiItemFilters) return

      const field = normalizedItemFilterFields.find(
        (entry) => normalizeKey(entry.id) === normalizeKey(filterId),
      )
      if (!field || !isOptionListDataType(field.dataType)) return

      const requestSeq = ++facetRequestSeqRef.current
      setLoadingFacetField(field.id)

      try {
        const facets = await folderApi.getItemFacets(repoId, field.id, {
          limit: DEFAULT_FACET_LIMIT,
          scopeFilters: buildScopeFiltersForFacets(
            activeFilters,
            folderContextFilters,
            field.id,
          ),
        })
        if (requestSeq !== facetRequestSeqRef.current) return

        setFacetOptionsByField((previous) => ({
          ...previous,
          [field.id]: toFacetFilterOptions(facets),
        }))
      } catch {
        if (requestSeq !== facetRequestSeqRef.current) return
        setFacetOptionsByField((previous) => ({
          ...previous,
          [field.id]: previous[field.id] || [],
        }))
      } finally {
        if (requestSeq === facetRequestSeqRef.current) {
          setLoadingFacetField(null)
        }
      }
    },
    [
      activeFilters,
      folderContextFilters,
      normalizedItemFilterFields,
      repositoryId,
      useApiItemFilters,
    ],
  )

  useEffect(() => {
    setFacetOptionsByField({})
    setLoadingFacetField(null)
    facetRequestSeqRef.current += 1
  }, [repositoryId])

  // Prefetch facet options for the always-visible API filters.
  useEffect(() => {
    const repoId = String(repositoryId || '').trim()
    if (!repoId || !useApiItemFilters) return

    const visibleOptionFields = prioritizedItemFilterFields
      .slice(0, DEFAULT_VISIBLE_ITEM_FILTER_COUNT)
      .filter((field) => isOptionListDataType(field.dataType))

    let cancelled = false

    const prefetch = async () => {
      await Promise.all(
        visibleOptionFields.map(async (field) => {
          try {
            const facets = await folderApi.getItemFacets(repoId, field.id, {
              limit: DEFAULT_FACET_LIMIT,
              scopeFilters: buildScopeFiltersForFacets(
                {},
                folderContextFilters,
                field.id,
              ),
            })
            if (cancelled) return
            setFacetOptionsByField((previous) => ({
              ...previous,
              [field.id]: toFacetFilterOptions(facets),
            }))
          } catch {
            // Keep prior options if prefetch fails; menu-open will retry.
          }
        }),
      )
    }

    void prefetch()
    return () => {
      cancelled = true
    }
  }, [
    folderContextFilters,
    normalizedItemFilterFields,
    repositoryId,
    useApiItemFilters,
  ])

  const getFacetOptionsForFilter = (filterId: string) => {
    const direct = facetOptionsByField[filterId]
    if (direct) return direct

    const normalizedFilterId = normalizeKey(filterId)
    const match = Object.entries(facetOptionsByField).find(
      ([key]) => normalizeKey(key) === normalizedFilterId,
    )
    return match?.[1] || []
  }

  const buildOptionsForFileFilter = (filterId: string) => {
    if (useApiItemFilters) {
      return withActiveFilterOption(
        filterId,
        getFacetOptionsForFilter(filterId),
        activeFilters,
      )
    }

    const cachedOptions = getCachedOptionsForFilter(filterId)
    const siblingFilteredFiles = filterFolderFiles(
      files,
      Object.fromEntries(
        Object.entries(activeFilters).filter(([key, value]) => {
          if (!String(value || '').trim()) return false
          if (isFolderTableFilterId(key)) return false
          return normalizeKey(key) !== normalizeKey(filterId)
        }),
      ),
      folderContextFilters,
    )

    const isFolderStructureFilter =
      shouldIncludeFolderOptions(filterId, currentFolderGroupField) ||
      cachedOptions.length > 0

    return withActiveFilterOption(
      filterId,
      mergeUniqueOptions(
        cachedOptions,
        buildFilterOptionsFromContext(filterId, folderContextFilters),
        isFolderStructureFilter
          ? buildFilterOptionsFromFolders(
              filterFolders(folderBaseline, getSiblingFolderFilters(filterId)),
              filterId,
            )
          : [],
        buildFilterOptionsFromFiles(siblingFilteredFiles, filterId),
      ),
      activeFilters,
    )
  }

  const handleFilterMenuOpenChange = (id: string | null) => {
    onFilterMenuOpenChange?.(id)
    if (id) void loadFacetsForField(id)
  }

  const buildApiItemFilterDefinitions = (): FilterDefinition[] => {
    const visibleFields = prioritizedItemFilterFields.slice(
      0,
      DEFAULT_VISIBLE_ITEM_FILTER_COUNT,
    )

    return visibleFields.map((field) => {
      const useOptions = isOptionListDataType(field.dataType)
      return {
        dataType: field.dataType,
        id: field.id,
        label: field.label,
        options: useOptions ? buildOptionsForFileFilter(field.id) : [],
        searchable: useOptions,
        searchPlaceholder: `Search ${field.label.toLowerCase()}...`,
        width: 240,
      }
    })
  }

  const defaultFilters = useMemo<FilterDefinition[]>(() => {
    // Prefer repository item filter-fields from V6 API over hardcoded defaults.
    if (useApiItemFilters && (showFileFilters || showFolderFilters)) {
      return buildApiItemFilterDefinitions()
    }

    // No API fields yet — do not fall back to Name / Date Modified / Status pills.
    return []
  }, [
    activeFilters,
    currentFolderGroupField,
    facetOptionsByField,
    filterOptionsCache,
    files,
    filterMode,
    folderContextFilters,
    folderBaseline,
    folders,
    prioritizedItemFilterFields,
    showFileFilters,
    showFolderFilters,
    useApiItemFilters,
  ])

  const moreFilters = useMemo<FilterGroup[]>(() => {
    if (!showFolderFilters && !showFileFilters) return []

    if (useApiItemFilters) {
      const defaultIds = new Set(
        defaultFilters.map((filter) => normalizeKey(filter.id)),
      )

      return prioritizedItemFilterFields
        .filter((field) => !defaultIds.has(normalizeKey(field.id)))
        .map((field) => {
          const useOptions = isOptionListDataType(field.dataType)
          return {
            dataType: field.dataType,
            id: field.id,
            label: field.label,
            options: useOptions
              ? buildOptionsForFileFilter(field.id)
              : undefined,
            searchable: useOptions,
            searchPlaceholder: `Search ${field.label.toLowerCase()}...`,
          }
        })
    }

    return []
  }, [
    activeFilters,
    currentFolderGroupField,
    defaultFilters,
    facetOptionsByField,
    filterOptionsCache,
    files,
    filterMode,
    folderContextFilters,
    folderBaseline,
    folders,
    prioritizedItemFilterFields,
    showFileFilters,
    showFolderFilters,
    useApiItemFilters,
  ])

  const hasActiveFilters = Object.values(activeFilters).some(Boolean)

  return (
    <CustomFilter
      activeFilters={activeFilters}
      afterSearchActions={afterSearchActions}
      filters={isGuestShare ? [] : defaultFilters}
      isLoading={isBusy || Boolean(loadingFacetField)}
      moreFilters={isGuestShare ? [] : moreFilters}
      searchPlaceholder={effectivePlaceholder}
      searchQuery={searchQuery}
      showReset={hasActiveFilters && !isGuestShare}
      viewMode={view === 'list' ? 'table' : 'grid'}
      multiSelect
      actionButtons={[
        {
          color: 'gray',
          disabled: isBusy,
          icon: refreshing ? 'tabler:loader-2' : 'lucide:refresh-ccw',
          id: 'refresh',
          isIconButton: true,
          tooltip: refreshing ? t`Refreshing...` : t`Refresh`,
          variant: 'outline',
          onClick: () => onRefresh?.(),
        },
        ...(onUpload && String(repositoryId || '').trim()
          ? [
              {
                color: 'primary' as const,
                disabled: isBusy,
                icon: 'lucide:upload',
                id: 'upload',
                isIconButton: false,
                label: t`Upload`,
                onClick: () => onUpload(),
              },
            ]
          : []),
        ...(onIntelligentUpload &&
        String(repositoryId || '').trim()
          ? [
              {
                color: 'primary' as const,
                disabled: isBusy,
                iconNode: (
                  <AiBrandIcon
                    className='size-4 shrink-0'
                    variant='outline-purple'
                  />
                ),
                id: 'intelligent-upload',
                isIconButton: false,
                label: t`Intelligent Upload`,
                tooltip: t`Intelligent Upload`,
                variant: 'outline' as const,
                onClick: () => onIntelligentUpload(),
              },
            ]
          : []),
        ...(onShare && repositoryId && !isGuestShare
          ? [
              {
                id: 'share',
                node: (
                  <FolderSharePopover
                    allowSign={false}
                    iconOnly={false}
                    triggerClassName='px-2.5 sm:px-3.5'
                    triggerLabel={t`Share`}
                    onShare={onShare}
                  />
                ),
              },
            ]
          : []),
      ]}
      onFilterChange={handleFilterChange}
      onFilterMenuOpenChange={handleFilterMenuOpenChange}
      onReset={handleResetFilters}
      onSearchChange={onSearchChange}
      onViewModeChange={(mode) => setView(mode === 'table' ? 'list' : 'grid')}
    />
  )
}
