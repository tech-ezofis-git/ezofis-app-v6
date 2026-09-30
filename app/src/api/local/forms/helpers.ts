import z from 'zod'
import type { QueryParams } from '@/types/item'
import { type Form, type FormGroup, FormSchema } from '@/types/form'
import formsJson from './forms.json' with { type: 'json' }

const forms = z.array(FormSchema).parse(formsJson)

export function getFlattenedGroupedForms(groups: FormGroup[]): Form[] {
  const result: Form[] = []

  function flattenRecursive(items: Form[] | FormGroup[]): void {
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

export function getFormGroups(queryParams?: QueryParams): FormGroup[] {
  if (!queryParams) {
    return getGroupedForms(forms, [])
  }

  const {
    expand = {},
    group = [],
    page = 1,
    pageSize = 10,
    sort = [],
  } = queryParams

  // Step 1: Sort forms
  const sortedForms = getSortedForms(sort)

  // Step 2: Group forms
  const groupedForms = getGroupedForms(sortedForms, group)

  // Step 3: Paginate with expansion logic
  if (!group || group.length === 0) {
    // No grouping, just paginate the forms directly
    const paginatedForms = getPaginatedForms(sortedForms, page, pageSize)
    return [
      {
        groupCount: sortedForms.length,
        groupId: '',
        groupKey: '',
        groupValue: '',
        items: paginatedForms,
      },
    ]
  }

  // Step 4: Apply pagination while preserving nested structure
  const expandMap = typeof expand === 'object' ? expand : {}
  const paginatedGroups = paginateGroupsWithExpansion(
    groupedForms,
    expandMap,
    page,
    pageSize,
  )

  return paginatedGroups
}

export function getGroupedForms(
  forms: Form[],
  group: QueryParams['group'],
): FormGroup[] {
  if (!group || group.length === 0) {
    return [
      {
        groupCount: forms.length,
        groupId: '',
        groupKey: '',
        groupValue: '',
        items: forms,
      },
    ]
  }

  function groupByColumns(
    items: Form[],
    columns: string[],
    currentDepth: number = 0,
  ): FormGroup[] {
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
    const grouped = new Map<string, Form[]>()

    items.forEach((item) => {
      const value = item[currentColumn as keyof Form]
      const stringValue = value?.toString() || 'NA'

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
          groupCount: getTotalFormCount(items),
          groupId,
          groupKey,
          groupValue,
          items,
        }
      },
    )
  }

  return groupByColumns(forms, group)
}

export function getPaginatedForms(
  forms: Form[],
  page: QueryParams['page'] = 1,
  pageSize: QueryParams['pageSize'] = 10,
) {
  if (pageSize === 0) return forms
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize

  return forms.slice(startIndex, endIndex)
}

export function getSortedForms(sort: QueryParams['sort'] = []) {
  const formsClone = [...forms]

  if (!sort.length) return formsClone

  return formsClone.sort((a, b) => {
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

function getTotalFormCount(items: Form[] | FormGroup[]): number {
  if (items.length === 0) return 0

  const firstItem = items[0]
  if ('groupId' in firstItem) {
    // It's an array of FormGroups
    const groupItems = items as FormGroup[]
    return groupItems.reduce(
      (total, group) => total + getTotalFormCount(group.items),
      0,
    )
  } else {
    // It's an array of Forms
    return items.length
  }
}

function getVisibleItemsCount(
  group: FormGroup,
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
        count += getVisibleItemsCount(item as FormGroup, expandMap)
      } else {
        // It's a form
        count += 1
      }
    }
  }

  return count
}

function paginateGroupsWithExpansion(
  groups: FormGroup[],
  expandMap: Record<string, boolean>,
  page: number,
  pageSize: number,
): FormGroup[] {
  // Process groups with pagination
  const result: FormGroup[] = []
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
  group: FormGroup,
  expandMap: Record<string, boolean>,
  skipCount: number,
  maxItems: number,
): FormGroup | null {
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
        groupCount: group.groupCount, // Keep original total form count
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
    groupCount: group.groupCount, // Keep original total form count
    items: processedItems,
  }
}

function processItemsForPagination(
  items: Form[] | FormGroup[],
  expandMap: Record<string, boolean>,
  skipCount: number,
  maxItems: number,
): Form[] | FormGroup[] {
  // Check if items is an array of FormGroups or Forms
  if (items.length === 0) {
    return items
  }

  const firstItem = items[0]
  if ('groupId' in firstItem) {
    // It's an array of FormGroups
    const groupItems = items as FormGroup[]
    const result: FormGroup[] = []
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
    // It's an array of Forms
    const formItems = items as Form[]
    const result: Form[] = []
    let currentSkip = skipCount
    let remainingItems = maxItems

    for (const item of formItems) {
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
