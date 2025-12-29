export interface IAuditTrailItem {
  action: string
  timestamp: string
}

export interface IDiscrepancy {
  description: string
  title: string
  severity?: 'low' | 'medium' | 'high'
}
export interface IRequestMeta {
  inboxCount: string
  sentCount: string
  completedCount: string
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

export interface WorkflowOption {
  id: number
  name: string
  flowJson: string // The JSON string defining rules/actions
  wFormId: number
  formJson?: string // The JSON defining columns/fields
}

export interface InboxItem {
  processId: number
  requestId: string
  requestNo: string
  status: string
  stage: string
  raisedAt: string
  raisedBy: string
  activityId: string
  formData: {
    fields: Record<string, any> // Dynamic fields e.g., { "field_123": "Value" }
  }
  // Properties calculated during flattening
  _groupKey?: string
  _subKey?: string
  _actions?: ActionButton[]
}

export interface ActionButton {
  label: string
  value: string
  color: 'green' | 'red' | 'blue' | 'orange' | 'gray'
  icon: string
}

export interface TableGroup {
  groupId: string
  groupKey: string
  groupValue: string
  groupCount: number
  items: InboxItem[]
}
