import type { InvoiceData } from './types'

export const MOCK_INVOICE_DATA: InvoiceData = {
  id: 'INV-2007',
  supplier: {
    name: 'Atlas Power Tools',
    address: ['321 Oak Blvd, Montreal, BC', 'Canada']
  },
  invoiceNumber: 'INV-2007',
  invoiceDate: '2025-09-02',
  poNumber: 'PO-1007',
  billTo: {
    name: 'ABC Company',
    address: ['100 Business Park Drive', 'Toronto, ON']
  },
  lineItems: [
    {
      description: 'Industrial Router 5000',
      type: 'Goods',
      qty: 1,
      rate: 720.00,
      amount: 720.00,
      status: 'matched'
    },
    {
      description: 'Standard Shipping',
      type: 'Service',
      qty: 1,
      rate: 93.60,
      amount: 93.60,
      status: 'matched'
    }
  ],
  subtotal: 720.00,
  tax: 93.60,
  total: 813.60,
  currency: 'CAD',
  status: 'approved',
  matchingScore: 94.0
}
