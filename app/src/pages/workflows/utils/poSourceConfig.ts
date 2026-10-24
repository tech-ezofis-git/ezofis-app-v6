/**
 * PO / sync source settings shared by the AP Agent and the Quote Agent
 * blocks. The builder keeps the picker's keys on the node (poMasterSourceType,
 * poMaster, poMasterQbAccount, poMasterSapAccount, resource, formId,
 * connectorId); the saved block carries `resource` (FORM | QUICKBOOKS | SAP),
 * `formId` and `connectorId`.
 */

export type PoSourceSettings = {
  connectorId: string
  formId: string
  resource: string
}

export type PoSourceType = 'internal' | 'quickbooks' | 'sap'

/** Node data → saved source keys (Master Form, QuickBooks or SAP). */
export const resolvePoSource = (
  data: any,
  existing: Partial<PoSourceSettings> = {},
): PoSourceSettings => {
  let resource = 'FORM'
  let formId = ''
  let connectorId = ''

  // Determine PO Master Source Type
  let sourceType =
    data.poMasterSourceType ||
    data.poMasterType ||
    data.poMaster?.sourceType ||
    data.resource ||
    existing.resource

  if (!sourceType) {
    if (
      data.poMasterSapAccount?.id ||
      data.sapAccount?.id ||
      String(data.connectorId || '').startsWith('sap_')
    ) {
      sourceType = 'sap'
    } else if (
      data.poMasterQbAccount?.id ||
      data.qbAccount?.id ||
      String(data.connectorId || '').startsWith('qb_')
    ) {
      sourceType = 'quickbooks'
    } else {
      sourceType = 'internal'
    }
  }

  const normSource = String(sourceType).toUpperCase().trim()

  if (normSource === 'SAP') {
    resource = 'SAP'
    connectorId = String(
      data.poMasterSapAccount?.id ??
        data.sapAccount?.id ??
        data.connectorId ??
        existing.connectorId ??
        '',
    )
    formId = ''
  } else if (normSource === 'QUICKBOOKS' || normSource === 'QB') {
    resource = 'QUICKBOOKS'
    connectorId = String(
      data.poMasterQbAccount?.id ??
        data.qbAccount?.id ??
        data.connectorId ??
        existing.connectorId ??
        '',
    )
    formId = ''
  } else {
    resource = 'FORM'
    const rawForm =
      data.poMaster?.id ?? data.poMaster ?? data.formId ?? existing.formId ?? ''
    formId =
      String(rawForm).startsWith('sap_') || String(rawForm).startsWith('qb_')
        ? ''
        : String(rawForm)
    connectorId = ''
  }

  return { connectorId, formId, resource }
}

const toMasterOption = (id: unknown) => {
  if (id === null || id === undefined || id === '' || id === 0) return null
  return { id, name: String(id) }
}

/** Saved source keys → the node data the source picker reads. */
export const poSourceToNodeData = (source: Partial<PoSourceSettings>) => {
  const res = String(source.resource || '')
    .toUpperCase()
    .trim()
  let poMasterSourceType: PoSourceType = 'internal'

  if (res === 'SAP' || String(source.connectorId || '').startsWith('sap_')) {
    poMasterSourceType = 'sap'
  } else if (
    res === 'QUICKBOOKS' ||
    res === 'QB' ||
    String(source.connectorId || '').startsWith('qb_')
  ) {
    poMasterSourceType = 'quickbooks'
  } else if (res === 'FORM' || source.formId) {
    poMasterSourceType = 'internal'
  }

  const connectorId =
    poMasterSourceType === 'sap' || poMasterSourceType === 'quickbooks'
      ? String(source.connectorId || '')
      : ''

  const formId =
    poMasterSourceType === 'internal' ? String(source.formId || '') : ''

  const resource =
    poMasterSourceType === 'sap'
      ? 'SAP'
      : poMasterSourceType === 'quickbooks'
        ? 'QUICKBOOKS'
        : 'FORM'

  return {
    connectorId,
    formId,
    poMaster:
      poMasterSourceType === 'internal' && source.formId
        ? toMasterOption(source.formId)
        : undefined,
    poMasterQbAccount:
      poMasterSourceType === 'quickbooks' && source.connectorId
        ? toMasterOption(source.connectorId)
        : undefined,
    poMasterSapAccount:
      poMasterSourceType === 'sap' && source.connectorId
        ? toMasterOption(source.connectorId)
        : undefined,
    poMasterSourceType,
    resource,
  }
}

const isUuid = (str: any) =>
  typeof str === 'string' &&
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    str.trim(),
  )

/** Resolve a saved master id/object against the loaded master forms. */
export const resolveMasterOption = (val: any, masterForms: any[]) => {
  if (val === null || val === undefined || val === '' || val === 0) return null

  const rawId =
    typeof val === 'object' ? (val.id ?? val.formId ?? val.uid) : val
  if (rawId === null || rawId === undefined || rawId === '') return null

  const strRawId = String(rawId).trim()

  const matched = masterForms.find(
    (m: any) =>
      String(m.id ?? '').trim() === strRawId ||
      String(m.uid ?? '').trim() === strRawId ||
      String(m.formId ?? '').trim() === strRawId ||
      (m.name &&
        String(m.name).trim().toLowerCase() === strRawId.toLowerCase()),
  )
  if (matched) return matched

  // Keep a real display name if we already have one; otherwise fall back temporarily
  if (typeof val === 'object') {
    const nameStr = String(val.name || '').trim()
    const hasRealName =
      nameStr !== '' && nameStr !== strRawId && !isUuid(nameStr)
    return hasRealName ? val : { id: rawId, name: strRawId }
  }

  return { id: rawId, name: strRawId }
}

/** A QuickBooks / SAP poMaster value rather than a master form. */
export const isExternalPoMaster = (value: any) =>
  typeof value === 'object' &&
  value !== null &&
  (value.sourceType === 'quickbooks' ||
    value.sourceType === 'sap' ||
    String(value.id).startsWith('qb_') ||
    String(value.id).startsWith('sap_') ||
    String(value.name || '').includes('QuickBooks') ||
    String(value.name || '').includes('SAP'))
