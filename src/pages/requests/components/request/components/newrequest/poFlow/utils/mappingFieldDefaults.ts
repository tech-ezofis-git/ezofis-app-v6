import { LINE_ITEM_TEMPLATE_COLUMNS } from './lineItemSchema'
import { SYSTEM_TEMPLATE_COLUMNS } from './templateSchema'

export const DEFAULT_FIELD_TYPES: Record<string, string> = {
  'Additional Notes': 'LONG_TEXT',
  'Buyer': 'SHORT_TEXT',
  'Currency': 'SINGLE_SELECT',
  'Description': 'LONG_TEXT',
  'Extended': 'CURRENCY_AMOUNT',
  'G/L Account': 'SHORT_TEXT',
  'Line ': 'NUMBER',
  'Line': 'NUMBER',
  'Part Number': 'SHORT_TEXT',
  'PO Amount': 'CURRENCY_AMOUNT',
  'PO Date': 'DATE',
  'PO Number': 'SHORT_TEXT',
  'Quantity': 'NUMBER',
  'Req Date': 'DATE',
  'Ship To Address': 'LONG_TEXT',
  'Supplier': 'SHORT_TEXT',
  'Supplier Address': 'LONG_TEXT',
  'Tax': 'CURRENCY_AMOUNT',
  'Terms': 'LONG_TEXT',
  'Unit Cost': 'CURRENCY_AMOUNT',
  'UOM': 'SHORT_TEXT',
  'Weight': 'NUMBER',
}

export type MappingApiField = {
  dataType: string
  name: string
}

export function buildMappingApiFields(
  templateColumns: readonly { key: string }[],
): MappingApiField[] {
  return templateColumns.map((col) => {
    const name = col.key.trim()
    return {
      dataType:
        DEFAULT_FIELD_TYPES[col.key] ??
        DEFAULT_FIELD_TYPES[name] ??
        'SHORT_TEXT',
      name,
    }
  })
}

export const HEADER_MAPPING_API_FIELDS = buildMappingApiFields(
  SYSTEM_TEMPLATE_COLUMNS,
)

export const LINE_ITEM_MAPPING_API_FIELDS = buildMappingApiFields(
  LINE_ITEM_TEMPLATE_COLUMNS,
)
