export interface InvoiceData {
  billTo: {
    address: string[]
    name: string
  }
  currency: string
  id: string
  invoiceDate: string
  invoiceNumber: string
  lineItems: {
    amount: number
    description: string
    qty: number
    rate: number
    status?: 'matched' | 'unmatched'
    type?: string
  }[]
  matchingScore: number
  poNumber: string
  status: 'processing' | 'approved' | 'rejected'
  subtotal: number
  supplier: {
    address: string[]
    name: string
  }
  tax: number
  total: number
}
