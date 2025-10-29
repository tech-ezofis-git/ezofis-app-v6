export interface IAuditTrailItem {
  action: string
  timestamp: string
}

export interface IDiscrepancy {
  description: string
  title: string
  severity?: 'low' | 'medium' | 'high'
}

export interface ILineItem {
  id: string
  name: string
  price: {
    invoice: number
    po: number
  }
  quantity: {
    grn: number
    invoice: number
    po: number
  }
  status: 'match' | 'mismatch'
  total: number
  variance: string
}
