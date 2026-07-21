import { LINE_ITEM_TEMPLATE_COLUMNS } from './lineItemSchema'
import { SYSTEM_TEMPLATE_COLUMNS } from './templateSchema'

export const DEFAULT_FIELD_TYPES: Record<string, string> = {
  'PO Number': 'SHORT_TEXT',
  Supplier: 'SHORT_TEXT',
  'Supplier Address': 'LONG_TEXT',
  'Ship To Address': 'LONG_TEXT',
  'PO Date': 'DATE',
  Terms: 'LONG_TEXT',
  Buyer: 'SHORT_TEXT',
  'PO Amount': 'CURRENCY_AMOUNT',
  Currency: 'SINGLE_SELECT',
  'Line ': 'NUMBER',
  Line: 'NUMBER',
  'Part Number': 'SHORT_TEXT',
  Description: 'LONG_TEXT',
  Quantity: 'NUMBER',
  UOM: 'SHORT_TEXT',
  'Unit Cost': 'CURRENCY_AMOUNT',
  Tax: 'CURRENCY_AMOUNT',
  Extended: 'CURRENCY_AMOUNT',
  'Req Date': 'DATE',
  Weight: 'NUMBER',
  'G/L Account': 'SHORT_TEXT',
  'Additional Notes': 'LONG_TEXT',
}

export type MappingApiField = {
  name: string
  dataType: string
}

export function buildMappingApiFields(
  templateColumns: readonly { key: string }[],
): MappingApiField[] {
  return templateColumns.map((col) => {
    const name = col.key.trim()
    return {
      name,
      dataType: DEFAULT_FIELD_TYPES[col.key] ?? DEFAULT_FIELD_TYPES[name] ?? 'SHORT_TEXT',
    }
  })
}

export const HEADER_MAPPING_API_FIELDS = buildMappingApiFields(SYSTEM_TEMPLATE_COLUMNS)

export const LINE_ITEM_MAPPING_API_FIELDS = buildMappingApiFields(
  LINE_ITEM_TEMPLATE_COLUMNS,
)
