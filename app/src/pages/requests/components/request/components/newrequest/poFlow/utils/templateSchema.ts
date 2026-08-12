export const SYSTEM_TEMPLATE_COLUMNS = [
  { key: 'PO Number', required: true },
  { key: 'Supplier', required: true },
  { key: 'Supplier Address', required: true },
  { key: 'Ship To Address', required: true },
  { key: 'PO Date', required: true },
  { key: 'Terms', required: false },
  { key: 'Buyer', required: false },
  { key: 'PO Amount', required: true },
  { key: 'Currency', required: false },
] as const

export type SystemTemplateColumn = (typeof SYSTEM_TEMPLATE_COLUMNS)[number]
