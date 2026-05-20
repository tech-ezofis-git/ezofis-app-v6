import type { InvoiceData } from './types'

export const MOCK_INVOICE_DATA: InvoiceData = {
  billTo: {
    address: ['100 Business Park Drive', 'Toronto, ON'],
    name: 'ABC Company',
  },
  currency: 'CAD',
  id: 'INV-2007',
  invoiceDate: '2025-09-02',
  invoiceNumber: 'INV-2007',
  lineItems: [
    {
      amount: 720.0,
      description: 'Industrial Router 5000',
      qty: 1,
      rate: 720.0,
      status: 'matched',
      type: 'Goods',
    },
    {
      amount: 93.6,
      description: 'Standard Shipping',
      qty: 1,
      rate: 93.6,
      status: 'matched',
      type: 'Service',
    },
  ],
  matchingScore: 94.0,
  poNumber: 'PO-1007',
  status: 'approved',
  subtotal: 720.0,
  supplier: {
    address: ['321 Oak Blvd, Montreal, BC', 'Canada'],
    name: 'Atlas Power Tools',
  },
  tax: 93.6,
  total: 813.6,
}
