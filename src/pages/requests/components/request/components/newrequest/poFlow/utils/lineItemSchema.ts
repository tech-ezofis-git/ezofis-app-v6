export const LINE_ITEM_TEMPLATE_COLUMNS = [
  { key: 'PO Number', required: true },
  { key: 'Line ', required: true },
  { key: 'Part Number', required: true },
  { key: 'Description', required: false },
  { key: 'Quantity', required: true },
  { key: 'UOM', required: false },
  { key: 'Unit Cost', required: false },
  { key: 'Tax', required: false },
  { key: 'Extended', required: false },
  { key: 'Req Date', required: false },
  { key: 'Weight', required: false },
  { key: 'G/L Account', required: false },
  { key: 'Additional Notes', required: false },
] as const

export type LineItemTemplateColumn = (typeof LINE_ITEM_TEMPLATE_COLUMNS)[number]
