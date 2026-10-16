import type { Item, ItemGroup } from '@/types/item'
import type { Row } from '../types'


export const resolveGroupName = (groupValue: any): string => {
  const str = typeof groupValue === 'string' ? groupValue.trim() : groupValue
  if (!str || String(str).toLowerCase() === 'root') {
    return 'No Group'
  }
  return String(str)
}

export default function transformRows(rows: ItemGroup[]): Row[] {
  const singleGroup = rows.length === 1 ? rows[0] : null
  const isFlatList =
    singleGroup &&
    (!singleGroup.groupKey ||
      !singleGroup.groupValue ||
      String(singleGroup.groupKey).trim().toLowerCase() === 'root' ||
      String(singleGroup.groupValue).trim().toLowerCase() === 'root' ||
      singleGroup.groupId === 'root' ||
      singleGroup.groupId === 'all')

  if (isFlatList) {
    return transformItemsToRows(singleGroup.items)
  }

  return rows.map(({ groupCount, groupId, groupKey, groupValue, items }) => {
    const displayGroup = resolveGroupName(groupValue || groupKey)
    return {
      group: `${displayGroup} (${groupCount})`,
      groupCount,
      groupId,
      groupKey: displayGroup,
      groupValue: displayGroup,
      id: groupId,
      rowType: 'group' as const,
      subRows: transformItemsToRows(items),
      type: 'group' as const,
    }
  })
}

function isItemGroup(item: ItemGroup | Item): item is ItemGroup {
  return (
    item != null &&
    typeof item === 'object' &&
    'items' in item &&
    Array.isArray((item as any).items)
  )
}

function transformItemsToRows(items: (ItemGroup | Item)[]): Row[] {
  return items.map((item) => {
    if (isItemGroup(item)) {
      const displayGroup = resolveGroupName(item.groupValue || item.groupKey)
      return {
        group: `${displayGroup} (${item.groupCount})`,
        groupCount: item.groupCount,
        groupId: item.groupId,
        groupKey: displayGroup,
        groupValue: displayGroup,
        id: item.groupId,
        rowType: 'group' as const,
        subRows: transformItemsToRows(item.items),
        type: 'group' as const,
      }
    } else {
      const { id, ...rest } = item
      return {
        group: '',
        groupCount: 0,
        groupId: '',
        groupKey: '',
        groupValue: '',
        id: id.toString(),
        itemId: id,
        rowType: 'item' as const,
        subRows: [],
        type: 'item' as const,
        ...rest,
      }
    }
  })
}

