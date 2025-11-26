import { Timeline } from '@mantine/core'

const auditTrail = [
  {
    action: 'Invoice PDF ingested via email gateway',
    timestamp: '29-Oct-2025 10:01 AM',
  },
  {
    action: 'AI OCR extraction completed - 92% confidence',
    timestamp: '29-Oct-2025 10:02 AM',
  },
  {
    action: 'Purchase order PO-321 successfully matched in ERP system',
    timestamp: '29-Oct-2025 10:02 AM',
  },
  {
    action: '3-way match validation initiated (Invoice/PO/GRN)',
    timestamp: '29-Oct-2025 10:03 AM',
  },
  {
    action:
      'Validation discrepancy flagged - price & quantity mismatch detected',
    timestamp: '29-Oct-2025 10:03 AM',
  },
  {
    action:
      "Invoice status set to 'Flagged for Review' - awaiting manual approval",
    timestamp: '29-Oct-2025 10:04 AM',
  },
]

const AuditTrail = () => {
  return (
    <div>
      <div className='mb-4 text-sm font-medium text-gray-13'>Audit Trail</div>

      <Timeline
        bulletSize={8}
        lineWidth={1}
        classNames={{
          item: 'mt-6 pl-3 before:top-[2.5px] before:border-dashed before:border-gray-3',
          itemBullet: 'mt-[2.5px] border-primary-9 bg-surface',
          itemTitle: 'font-medium text-gray-12',
        }}
      >
        {auditTrail.map((item) => (
          <Timeline.Item key={item.action} title={item.action}>
            <div className='text-12 text-gray-10'>{item.timestamp}</div>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  )
}

AuditTrail.displayName = 'AuditTrail'
export default AuditTrail
