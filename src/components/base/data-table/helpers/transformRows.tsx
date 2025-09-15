import type { Item, ItemGroup } from '@/types/item'
import type { Row } from '../types'

export default function transformRows(rows: ItemGroup[]): Row[] {
  if (rows.length === 1 && (!rows[0].groupKey || !rows[0].groupValue)) {
    return transformItemsToRows(rows[0].items)
  }

  return rows.map(({ groupCount, groupId, groupKey, groupValue, items }) => ({
    group: `${groupValue} (${groupCount})`,
    groupCount,
    groupId,
    groupKey,
    groupValue,
    id: groupId,
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
        subRows: [],
        type: 'item' as const,
        ...rest,
      }
    }
  })
}
