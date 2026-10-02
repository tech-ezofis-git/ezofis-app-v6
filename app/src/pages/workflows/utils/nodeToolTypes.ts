export const NODE_TOOL_TYPE = {
  AP_AGENT: 'ap_agent',
  CLASSIFICATION_AGENT: 'classification_agent',
  CONDITION: 'condition',
  DOCUMENT_GENERATE_AGENT: 'document_generate_agent',
  END: 'end',
  FORM_SUBMISSION: 'form_submission',
  FTP_AGENT: 'ftp_agent',
  GMAIL: 'gmail',
  GOOGLE_DRIVE: 'google_drive',
  KYC_AGENT: 'kyc_agent',
  MANUAL_USER: 'manual_user',
  OCR_AGENT: 'ocr_agent',
  ONEDRIVE: 'onedrive',
  OUTLOOK: 'outlook',
  PROCUREMENT_AGENT: 'procurement_agent',
  QUALIFY_AGENT: 'qualify_agent',
  QUOTE_AGENT: 'quote_agent',
  SLACK: 'slack',
  TEAMS: 'teams',
} as const

export type NodeToolType = (typeof NODE_TOOL_TYPE)[keyof typeof NODE_TOOL_TYPE]

/** Canonical `data.toolType` — the single key that identifies a workflow node. */
export const normalizeNodeToolType = (value: unknown): string => {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

export const getNodeToolType = (data: { toolType?: unknown } | undefined) =>
  normalizeNodeToolType(data?.toolType)
