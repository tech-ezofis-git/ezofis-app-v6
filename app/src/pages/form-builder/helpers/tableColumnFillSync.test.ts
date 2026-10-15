import { describe, expect, it } from 'vitest'

import {
  getCopyTargets,
  getMasterMatchColumn,
  getMasterTargets,
} from './tableColumnFillSync'

const col = (id: string, type: string, specific: Record<string, any> = {}) => ({
  id,
  name: id,
  settings: { specific },
  type,
})

describe('tableColumnFillSync', () => {
  const columns = [
    col('qty', 'NUMBER'),
    col('copy', 'NUMBER', {
      defaultValueType: 'ASSIGN_PARENT_FIELD',
      parentFieldId: 'qty',
    }),
    col('item', 'SINGLE_SELECT', { masterFormColumn: 'Item Name' }),
    col('price', 'NUMBER', {
      defaultValueType: 'MASTER',
      masterFormColumn: 'Price',
      masterFormId: '12',
      parentFieldId: 'item',
    }),
    col('broken', 'DATE', {
      defaultValueType: 'MASTER',
      parentFieldId: 'item',
    }),
  ]

  it('finds columns that mirror a source column', () => {
    expect(getCopyTargets(columns, 'qty').map((c) => c.id)).toEqual(['copy'])
    expect(getCopyTargets(columns, 'item')).toEqual([])
  })

  it('finds only fully configured master targets', () => {
    expect(getMasterTargets(columns, 'item').map((c) => c.id)).toEqual([
      'price',
    ])
  })

  it('matches on the source column master column, else its name', () => {
    expect(getMasterMatchColumn(columns[2])).toBe('Item Name')
    expect(getMasterMatchColumn(columns[0])).toBe('qty')
  })
})
