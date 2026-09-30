import z from 'zod'
import type { QueryParams } from '@/types/item'
import {
  type Workflow,
  type WorkflowGroup,
  WorkflowSchema,
} from '@/types/workflow'
import workflowsJson from './workflows.json' with { type: 'json' }

const workflows = z.array(WorkflowSchema).parse(workflowsJson)

export function getFlattenedGroupedWorkflows(
  groups: WorkflowGroup[],
): Workflow[] {
  const result: Workflow[] = []

  function flattenRecursive(items: Workflow[] | WorkflowGroup[]): void {
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

export function getGroupedWorkflows(
  workflows: Workflow[],
  group: QueryParams['group'],
): WorkflowGroup[] {
  if (!group || group.length === 0) {
    return [
      {
        groupCount: workflows.length,
        groupId: '',
        groupKey: '',
        groupValue: '',
        items: workflows,
      },
    ]
  }

  function groupByColumns(
    items: Workflow[],
    columns: string[],
    currentDepth: number = 0,
  ): WorkflowGroup[] {
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
    const grouped = new Map<string, Workflow[]>()

    items.forEach((item) => {
      const value = item[currentColumn as keyof Workflow]
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
          groupCount: getTotalWorkflowCount(items),
          groupId,
          groupKey,
          groupValue,
          items,
        }
      },
    )
  }

  return groupByColumns(workflows, group)
}

export function getPaginatedWorkflows(
  workflows: Workflow[],
  page: QueryParams['page'] = 1,
  pageSize: QueryParams['pageSize'] = 10,
) {
  if (pageSize === 0) return workflows
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize

  return workflows.slice(startIndex, endIndex)
}

export function getSortedWorkflows(sort: QueryParams['sort'] = []) {
  const workflowsClone = [...workflows]

  if (!sort.length) return workflowsClone

  return workflowsClone.sort((a, b) => {
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

export function getWorkflowGroups(queryParams?: QueryParams): WorkflowGroup[] {
  if (!queryParams) {
    return getGroupedWorkflows(workflows, [])
  }

  const {
    expand = {},
    group = [],
    page = 1,
    pageSize = 10,
    sort = [],
  } = queryParams

  // Step 1: Sort workflows
  const sortedWorkflows = getSortedWorkflows(sort)

  // Step 2: Group workflows
  const groupedWorkflows = getGroupedWorkflows(sortedWorkflows, group)

  // Step 3: Paginate with expansion logic
  if (!group || group.length === 0) {
    // No grouping, just paginate the workflows directly
    const paginatedWorkflows = getPaginatedWorkflows(
      sortedWorkflows,
      page,
      pageSize,
    )
    return [
      {
        groupCount: sortedWorkflows.length,
        groupId: '',
        groupKey: '',
        groupValue: '',
        items: paginatedWorkflows,
      },
    ]
  }

  // Step 4: Apply pagination while preserving nested structure
  const expandMap = typeof expand === 'object' ? expand : {}
  const paginatedGroups = paginateGroupsWithExpansion(
    groupedWorkflows,
    expandMap,
    page,
    pageSize,
  )

  return paginatedGroups
}

function getTotalWorkflowCount(items: Workflow[] | WorkflowGroup[]): number {
  if (items.length === 0) return 0

  const firstItem = items[0]
  if ('groupId' in firstItem) {
    // It's an array of WorkflowGroups
    const groupItems = items as WorkflowGroup[]
    return groupItems.reduce(
      (total, group) => total + getTotalWorkflowCount(group.items),
      0,
    )
  } else {
    // It's an array of Workflows
    return items.length
  }
}

function getVisibleItemsCount(
  group: WorkflowGroup,
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
        count += getVisibleItemsCount(item as WorkflowGroup, expandMap)
      } else {
        // It's a workflow
        count += 1
      }
    }
  }

  return count
}

function paginateGroupsWithExpansion(
  groups: WorkflowGroup[],
  expandMap: Record<string, boolean>,
  page: number,
  pageSize: number,
): WorkflowGroup[] {
  // Process groups with pagination
  const result: WorkflowGroup[] = []
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
  group: WorkflowGroup,
  expandMap: Record<string, boolean>,
  skipCount: number,
  maxItems: number,
): WorkflowGroup | null {
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
        groupCount: group.groupCount, // Keep original total workflow count
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
    groupCount: group.groupCount, // Keep original total workflow count
    items: processedItems,
  }
}

function processItemsForPagination(
  items: Workflow[] | WorkflowGroup[],
  expandMap: Record<string, boolean>,
  skipCount: number,
  maxItems: number,
): Workflow[] | WorkflowGroup[] {
  // Check if items is an array of WorkflowGroups or Workflows
  if (items.length === 0) {
    return items
  }

  const firstItem = items[0]
  if ('groupId' in firstItem) {
    // It's an array of WorkflowGroups
    const groupItems = items as WorkflowGroup[]
    const result: WorkflowGroup[] = []
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
    // It's an array of Workflows
    const workflowItems = items as Workflow[]
    const result: Workflow[] = []
    let currentSkip = skipCount
    let remainingItems = maxItems

    for (const item of workflowItems) {
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
