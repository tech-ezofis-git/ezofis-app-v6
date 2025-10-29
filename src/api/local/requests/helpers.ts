import z from 'zod'
import type { QueryParams } from '@/types/item'
import { type Request, type RequestGroup, RequestSchema } from '@/types/request'
import requestsJson from './requests.json' assert { type: 'json' }

const requests = z.array(RequestSchema).parse(requestsJson)

export function getFlattenedGroupedRequests(groups: RequestGroup[]): Request[] {
  const result: Request[] = []

  function flattenRecursive(items: Request[] | RequestGroup[]): void {
    for (const item of items) {
      if ('groupId' in item) {
        flattenRecursive(item.items)
      } else {
        result.push(item)
      }
    }
  }

  flattenRecursive(groups)
  return result
}

export function getGroupedRequests(
  requests: Request[],
  group: QueryParams['group'],
): RequestGroup[] {
  if (!group || group.length === 0) {
    return [
      {
        groupCount: requests.length,
        groupId: '',
        groupKey: '',
        groupValue: '',
        items: requests,
      },
    ]
  }

  function groupByColumns(
    items: Request[],
    columns: string[],
    currentDepth: number = 0,
  ): RequestGroup[] {
    if (columns.length === 0) {
      return [
        {
          groupCount: items.length,
          groupId: '',
          groupKey: '',
          groupValue: '',
          items: items,
        },
      ]
    }

    const [currentColumn, ...remainingColumns] = columns
    const grouped = new Map<string, Request[]>()

    items.forEach((item) => {
      const value = item[currentColumn as keyof Request]
      const stringValue = value?.toString() || 'null'

      if (!grouped.has(stringValue)) {
        grouped.set(stringValue, [])
      }
      grouped.get(stringValue)!.push(item)
    })

    return Array.from(grouped.entries()).map(
      ([groupValue, groupItems], index) => {
        const groupKey = currentColumn
        const groupId = `group-${groupKey}-${groupValue}-${currentDepth}-${index}`

        const items =
          remainingColumns.length > 0
            ? groupByColumns(groupItems, remainingColumns, currentDepth + 1)
            : groupItems

        return {
          groupCount: getTotalRequestCount(items),
          groupId,
          groupKey,
          groupValue,
          items,
        }
      },
    )
  }

  return groupByColumns(requests, group)
}

export function getPaginatedRequests(
  requests: Request[],
  page: QueryParams['page'] = 1,
  pageSize: QueryParams['pageSize'] = 10,
) {
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize

  return requests.slice(startIndex, endIndex)
}

export function getRequestGroups(queryParams?: QueryParams): RequestGroup[] {
  if (!queryParams) {
    return getGroupedRequests(requests, [])
  }

  const {
    expand = {},
    group = [],
    page = 1,
    pageSize = 10,
    sort = [],
  } = queryParams

  // Step 1: Sort requests
  const sortedRequests = getSortedRequests(sort)

  // Step 2: Group requests
  const groupedRequests = getGroupedRequests(sortedRequests, group)

  // Step 3: Paginate with expansion logic
  if (!group || group.length === 0) {
    // No grouping, just paginate the requests directly
    const paginatedRequests = getPaginatedRequests(
      sortedRequests,
      page,
      pageSize,
    )
    return [
      {
        groupCount: sortedRequests.length,
        groupId: '',
        groupKey: '',
        groupValue: '',
        items: paginatedRequests,
      },
    ]
  }

  // Step 4: Apply pagination while preserving nested structure
  const expandMap = typeof expand === 'object' ? expand : {}
  const paginatedGroups = paginateGroupsWithExpansion(
    groupedRequests,
    expandMap,
    page,
    pageSize,
  )

  return paginatedGroups
}

export function getSortedRequests(sort: QueryParams['sort'] = []) {
  const requestsClone = [...requests]

  if (!sort.length) return requestsClone

  return requestsClone.sort((a, b) => {
    for (const { desc, id } of sort) {
      const aValue = a[id as keyof typeof a]
      const bValue = b[id as keyof typeof b]

      if (
        (aValue === null || aValue === undefined) &&
        (bValue === null || bValue === undefined)
      )
        continue
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      let comparison = 0

      if (aValue > bValue) {
        comparison = 1
      } else if (aValue < bValue) {
        comparison = -1
      }

      if (comparison !== 0) {
        return desc ? -comparison : comparison
      }
    }

    return 0
  })
}

function getTotalRequestCount(items: Request[] | RequestGroup[]): number {
  if (items.length === 0) return 0

  const firstItem = items[0]
  if ('groupId' in firstItem) {
    // It's an array of RequestGroups
    const groupItems = items as RequestGroup[]
    return groupItems.reduce(
      (total, group) => total + getTotalRequestCount(group.items),
      0,
    )
  } else {
    // It's an array of Requests
    return items.length
  }
}

function getVisibleItemsCount(
  group: RequestGroup,
  expandMap: Record<string, boolean>,
): number {
  let count = 1 // The group itself counts as 1 item

  const isExpanded = expandMap[group.groupId] === true
  if (!isExpanded) {
    return count // Only the group header is visible
  }

  // If expanded, count visible children
  if (Array.isArray(group.items)) {
    for (const item of group.items) {
      if ('groupId' in item) {
        // It's a nested group
        count += getVisibleItemsCount(item as RequestGroup, expandMap)
      } else {
        // It's a request
        count += 1
      }
    }
  }

  return count
}

function paginateGroupsWithExpansion(
  groups: RequestGroup[],
  expandMap: Record<string, boolean>,
  page: number,
  pageSize: number,
): RequestGroup[] {
  // Process groups with pagination
  const result: RequestGroup[] = []
  const startIndex = (page - 1) * pageSize
  let currentIndex = 0
  let remainingPageSize = pageSize

  for (const group of groups) {
    const visibleCount = getVisibleItemsCount(group, expandMap)

    // Check if this group starts within our page range
    if (currentIndex + visibleCount <= startIndex) {
      // This entire group is before our page, skip it
      currentIndex += visibleCount
      continue
    }

    // Check if we have space for any items from this group
    if (remainingPageSize <= 0) {
      break
    }

    // This group intersects with our page
    const groupStartsInPage = currentIndex >= startIndex
    const itemsToSkipInGroup = groupStartsInPage ? 0 : startIndex - currentIndex

    const processedGroup = processGroupForPagination(
      group,
      expandMap,
      itemsToSkipInGroup,
      remainingPageSize,
    )

    if (processedGroup) {
      result.push(processedGroup)
      const processedCount = getVisibleItemsCount(processedGroup, expandMap)
      remainingPageSize -= processedCount
    }

    currentIndex += visibleCount
  }

  return result
}

function processGroupForPagination(
  group: RequestGroup,
  expandMap: Record<string, boolean>,
  skipCount: number,
  maxItems: number,
): RequestGroup | null {
  if (maxItems <= 0) return null

  let currentSkip = skipCount
  let remainingItems = maxItems

  // Always include the group header if we haven't skipped it
  if (currentSkip > 0) {
    currentSkip -= 1
    // If we're still skipping, this group header is not in our page
    if (currentSkip >= 0) {
      // We need to process children but not include the group header
      const isExpanded = expandMap[group.groupId] === true
      if (!isExpanded || !Array.isArray(group.items)) {
        return null
      }

      // Process children with remaining skip count
      const processedItems = processItemsForPagination(
        group.items,
        expandMap,
        currentSkip,
        remainingItems,
      )

      if (processedItems.length === 0) return null

      return {
        ...group,
        groupCount: group.groupCount, // Keep original total request count
        items: processedItems,
      }
    }
  }

  // Include the group header
  remainingItems -= 1

  const isExpanded = expandMap[group.groupId] === true
  if (!isExpanded || !Array.isArray(group.items) || remainingItems <= 0) {
    // Group is collapsed or no space for children
    return {
      ...group,
      groupCount: group.groupCount,
      items: group.items, // Keep original items but they won't be displayed
    }
  }

  // Process children
  const processedItems = processItemsForPagination(
    group.items,
    expandMap,
    Math.max(0, currentSkip),
    remainingItems,
  )

  return {
    ...group,
    groupCount: group.groupCount, // Keep original total request count
    items: processedItems,
  }
}

function processItemsForPagination(
  items: Request[] | RequestGroup[],
  expandMap: Record<string, boolean>,
  skipCount: number,
  maxItems: number,
): Request[] | RequestGroup[] {
  // Check if items is an array of RequestGroups or Requests
  if (items.length === 0) {
    return items
  }

  const firstItem = items[0]
  if ('groupId' in firstItem) {
    // It's an array of RequestGroups
    const groupItems = items as RequestGroup[]
    const result: RequestGroup[] = []
    let currentSkip = skipCount
    let remainingItems = maxItems

    for (const item of groupItems) {
      if (remainingItems <= 0) break

      const originalVisibleCount = getVisibleItemsCount(item, expandMap)

      const processedGroup = processGroupForPagination(
        item,
        expandMap,
        currentSkip,
        remainingItems,
      )

      if (processedGroup) {
        result.push(processedGroup)
        const processedVisibleCount = getVisibleItemsCount(
          processedGroup,
          expandMap,
        )
        remainingItems -= processedVisibleCount
        // Always subtract the original count from skip, not the processed count
        currentSkip = Math.max(0, currentSkip - originalVisibleCount)
      } else {
        // Calculate how many items this group would have taken
        currentSkip = Math.max(0, currentSkip - originalVisibleCount)
      }
    }

    return result
  } else {
    // It's an array of Requests
    const requestItems = items as Request[]
    const result: Request[] = []
    let currentSkip = skipCount
    let remainingItems = maxItems

    for (const item of requestItems) {
      if (remainingItems <= 0) break

      if (currentSkip > 0) {
        currentSkip -= 1
      } else {
        result.push(item)
        remainingItems -= 1
      }
    }

    return result
  }
}
