export interface InvoiceData {
  id: string
  supplier: {
    name: string
    address: string[]
  }
  invoiceNumber: string
  invoiceDate: string
  poNumber: string
  billTo: {
    name: string
    address: string[]
  }
  lineItems: {
    description: string
    type?: string
    qty: number
    rate: number
    amount: number
    status?: 'matched' | 'unmatched'
  }[]
  subtotal: number
  tax: number
  total: number
  currency: string
  status: 'processing' | 'approved' | 'rejected'
  matchingScore: number
}
