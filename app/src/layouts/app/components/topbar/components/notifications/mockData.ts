import type { NotificationItem } from './types'

export const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    title: 'Invoice Processed',
    message: 'Invoice #INV-2024-001 has been successfully processed and queued for payment.',
    type: 'success',
    timestamp: '5m ago',
    isRead: false,
  },
  {
    id: '2',
    title: 'Workflow Execution Required',
    message: 'Accounts Payable approval workflow requires your action for Vendor ACME Corp.',
    type: 'workflow',
    timestamp: '25m ago',
    isRead: false,
  },
  {
    id: '3',
    title: 'Storage Warning',
    message: 'Your document storage quota has reached 85%. Consider archiving older documents.',
    type: 'warning',
    timestamp: '1h ago',
    isRead: false,
  },
  {
    id: '4',
    title: 'System Maintenance',
    message: 'Scheduled system maintenance is set for tonight at 11:00 PM UTC.',
    type: 'info',
    timestamp: '3h ago',
    isRead: true,
  },
  {
    id: '5',
    title: 'Parsing Failed',
    message: 'Failed to extract data from uploaded PDF document (PO_8841.pdf).',
    type: 'error',
    timestamp: '1d ago',
    isRead: true,
  },
]
