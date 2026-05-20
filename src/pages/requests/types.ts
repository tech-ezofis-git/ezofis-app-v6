export interface ActionButton {
  color: 'green' | 'red' | 'blue' | 'orange' | 'gray'
  icon: string
  label: string
  value: string
}

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

export interface InboxItem {
  activityId: string
  formData: {
    fields: Record<string, any> // Dynamic fields e.g., { "field_123": "Value" }
  }
  processId: number
  raisedAt: string
  raisedBy: string
  requestId: string
  requestNo: string
  stage: string
  status: string
  _actions?: ActionButton[]
  // Properties calculated during flattening
  _groupKey?: string
  _originalIndex?: number
  _subKey?: string
}

export interface IRequestMeta {
  completedCount: string
  inboxCount: string
  sentCount: string
}

export interface TableGroup {
  groupCount: number
  groupId: string
  items: InboxItem[]
  groupKey?: string
  groupValue?: string
}

export interface WorkflowOption {
  flowJson: string // The JSON string defining rules/actions
  id: number | string
  name: string
  wFormId: number
  formJson?: string // The JSON defining columns/fields
}
