import type { Item, ItemGroup } from '@/types/item'
import type { Row } from '../types'

export default function transformRows(rows: ItemGroup[]): Row[] {
  const singleGroup = rows.length === 1 ? rows[0] : null
  const isFlatList =
    singleGroup &&
    (!singleGroup.groupKey ||
      !singleGroup.groupValue ||
      singleGroup.groupId === 'all')

  if (isFlatList) {
    return transformItemsToRows(singleGroup.items)
  }

  return rows.map(({ groupCount, groupId, groupKey, groupValue, items }) => ({
    group: `${groupValue} (${groupCount})`,
    groupCount,
    groupId,
    groupKey,
    groupValue,
    id: groupId,
    rowType: 'group' as const,
    subRows: transformItemsToRows(items),
    type: 'group' as const,
  }))
}

function isItemGroup(item: ItemGroup | Item): item is ItemGroup {
  return 'groupKey' in item && 'groupValue' in item && 'items' in item
}

function transformItemsToRows(items: (ItemGroup | Item)[]): Row[] {
  return items.map((item) => {
    if (isItemGroup(item)) {
      return {
        group: `${item.groupValue} (${item.groupCount})`,
        groupCount: item.groupCount,
        groupId: item.groupId,
        groupKey: item.groupKey,
        groupValue: item.groupValue,
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
