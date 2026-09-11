import type { Edge, Node } from '@xyflow/react'
import { generateId } from './generateId'
import { NODE_TOOL_TYPE, normalizeNodeToolType } from './nodeToolTypes'

function getNodeDefaults(toolType: string) {
  const typeStr = normalizeNodeToolType(toolType)
  if (typeStr === NODE_TOOL_TYPE.OCR_AGENT || typeStr.includes('ocr'))
    return {
      icon: 'lucide:scan-text',
      iconColor: '#2563eb',
      subLabel: 'Extract text from images/PDFs',
    }
  if (typeStr === NODE_TOOL_TYPE.AP_AGENT)
    return {
      icon: 'lucide:receipt-text',
      iconColor: '#059669',
      subLabel: 'Accounts Payable automation',
    }
  if (typeStr === NODE_TOOL_TYPE.FTP_AGENT || typeStr.includes('ftp'))
    return {
      icon: 'lucide:server',
      iconColor: '#7c3aed',
      subLabel: 'File Transfer Protocol',
    }
  if (typeStr === NODE_TOOL_TYPE.KYC_AGENT || typeStr.includes('kyc'))
    return {
      icon: 'lucide:shield-check',
      iconColor: '#d97706',
      subLabel: 'Verify identity & compliance documents',
    }
  if (
    typeStr === NODE_TOOL_TYPE.PROCUREMENT_AGENT ||
    typeStr.includes('procurement')
  )
    return {
      icon: 'lucide:shopping-bag',
      iconColor: '#0d9488',
      subLabel: 'Automate requisitions & vendor POs',
    }
  if (
    typeStr === NODE_TOOL_TYPE.DOCUMENT_GENERATE_AGENT ||
    typeStr.includes('document_generate') ||
    typeStr.includes('doc_gen')
  )
    return {
      icon: 'lucide:file-text',
      iconColor: '#4f46e5',
      subLabel: 'Generate PDF & Word docs from templates',
    }
  if (typeStr === NODE_TOOL_TYPE.GOOGLE_DRIVE)
    return {
      icon: 'logos:google-drive',
      iconColor: '',
      subLabel: 'Store or collect files from Google Drive',
    }
  if (typeStr === NODE_TOOL_TYPE.ONEDRIVE)
    return {
      icon: 'logos:microsoft-onedrive',
      iconColor: '',
      subLabel: 'Microsoft OneDrive integration',
    }
  if (typeStr === NODE_TOOL_TYPE.GMAIL)
    return {
      icon: 'logos:google-gmail',
      iconColor: '',
      subLabel: 'Send or receive emails',
    }
  if (typeStr === NODE_TOOL_TYPE.OUTLOOK)
    return {
      icon: 'vscode-icons:file-type-outlook',
      iconColor: '',
      subLabel: 'Microsoft Outlook integration',
    }
  if (typeStr === NODE_TOOL_TYPE.SLACK)
    return {
      icon: 'logos:slack-icon',
      iconColor: '',
      subLabel: 'Send channel messages',
    }
  if (typeStr === NODE_TOOL_TYPE.TEAMS)
    return {
      icon: 'logos:microsoft-teams',
      iconColor: '',
      subLabel: 'Microsoft Teams integration',
    }
  if (typeStr === NODE_TOOL_TYPE.CONDITION)
    return {
      icon: 'lucide:split',
      iconColor: '#f97316',
      subLabel: 'Check logic conditions',
    }
  if (
    typeStr === NODE_TOOL_TYPE.MANUAL_USER ||
    typeStr.includes('verifier') ||
    typeStr.includes('actor')
  )
    return {
      icon: 'lucide:user',
      iconColor: '#ec4899',
      subLabel: 'Trigger manually by user',
    }
  if (
    typeStr === NODE_TOOL_TYPE.FORM_SUBMISSION ||
    typeStr.includes('form') ||
    typeStr === 'trigger' ||
    typeStr === 'initiator'
  )
    return {
      icon: 'lucide:file-input',
      iconColor: '#ea580c',
      subLabel: 'Trigger on new form entry',
    }
  if (typeStr === NODE_TOOL_TYPE.END || typeStr === 'action')
    return {
      icon: 'lucide:party-popper',
      iconColor: 'var(--color-secondary-9)',
      subLabel: 'Automated Process End',
    }
  return { icon: 'lucide:settings', iconColor: '#888', subLabel: 'Action Step' }
}

function mapLegacyTypeToToolType(legacyType: string, label: string): string {
  switch (legacyType) {
    case 'OCR':
      return NODE_TOOL_TYPE.OCR_AGENT
    case 'AP_AGENT':
      return NODE_TOOL_TYPE.AP_AGENT
    case 'KYC_AGENT':
      return NODE_TOOL_TYPE.KYC_AGENT
    case 'PROCUREMENT_AGENT':
      return NODE_TOOL_TYPE.PROCUREMENT_AGENT
    case 'DOCUMENT_GENERATE_AGENT':
      return NODE_TOOL_TYPE.DOCUMENT_GENERATE_AGENT
    case 'CONDITION':
      return NODE_TOOL_TYPE.CONDITION
    case 'INTERNAL_ACTOR':
      return NODE_TOOL_TYPE.MANUAL_USER
    case 'START': {
      const fromLabel = normalizeNodeToolType(label)
      if (
        fromLabel === NODE_TOOL_TYPE.GMAIL ||
        fromLabel === NODE_TOOL_TYPE.OUTLOOK ||
        fromLabel === NODE_TOOL_TYPE.MANUAL_USER ||
        fromLabel === NODE_TOOL_TYPE.FORM_SUBMISSION
      ) {
        return fromLabel
      }
      return NODE_TOOL_TYPE.FORM_SUBMISSION
    }
    case 'END':
      return NODE_TOOL_TYPE.END
    default:
      return normalizeNodeToolType(label || legacyType)
  }
}

export const importWorkflow = (
  legacyJson: any,
): { edges: Edge[]; nodes: Node[] } => {
  if (!legacyJson || !Array.isArray(legacyJson.blocks)) {
    return { edges: [], nodes: [] }
  }

  const isV6 = legacyJson.layoutVersion === 2

  // Find the exact boundaries of the imported layout to normalize it
  let minX = Infinity
  let minY = Infinity

  legacyJson.blocks.forEach((block: any) => {
    if (block.left !== undefined && block.left < minX) minX = block.left
    if (block.top !== undefined && block.top < minY) minY = block.top
    // Treat parsing as numbers to avoid strings messing up Math
    const x = Number(block.left)
    const y = Number(block.top)
    if (!isNaN(x) && x < minX) minX = x
    if (!isNaN(y) && y < minY) minY = y
  })

  // Fallback defaults if blocks lack position data
  if (minX === Infinity) minX = 0
  if (minY === Infinity) minY = 0

  // The new builder's default starting origin for the first node (Top Left)
  const originX = 50
  const originY = 50

  const nodes: Node[] = legacyJson.blocks.map((block: any) => {
    // Determine the node type (trigger or action) based on legacy rules/types
    let nodeType = 'action'
    if (
      block.type === 'START' ||
      block.type === 'CONDITION' ||
      block.settings?.label === 'Initiator'
    ) {
      nodeType = 'trigger'
    }

    // Apply a scaling factor to space out nodes more appropriately for the new React Flow canvas
    // Calculate position relative to the discovered minimums and shift to the new origin
    const scaleX = isV6 ? 1.0 : 2.2
    const scaleY = isV6 ? 1.0 : 2.2

    const blockLeft = Number(block.left) || 0
    const blockTop = Number(block.top) || 0

    const relativeX = (blockLeft - minX) * scaleX
    const relativeY = (blockTop - minY) * scaleY

    let toolType = mapLegacyTypeToToolType(block.type, block.settings?.label)
    let connectorId: number | undefined = undefined

    let hasAttachmentEnabled = false
    let mailSubjectEnabled = false
    let mailSubjectToMonitor = ''
    let mailContentEnabled = false
    let mailContentToMonitor = ''
    let fromMailAddressEnabled = false
    let fromMailAddresses: { id: string; name: string }[] = []
    let fromDomainNameEnabled = false
    let fromDomainName: { id: string; name: string } | null = null

    const initiateByList: string[] = Array.isArray(block.settings?.initiateBy)
      ? block.settings.initiateBy.map((mode: unknown) =>
          String(mode).toUpperCase(),
        )
      : []
    const isEmailStart =
      block.type === 'START' &&
      (initiateByList.includes('EMAIL') ||
        Boolean(block.settings?.mailInitiate))
    const isManualStart =
      block.type === 'START' &&
      !isEmailStart &&
      (initiateByList.includes('USER') ||
        block.settings?.initiateMode === 'MANUAL' ||
        initiateByList.length === 0)

    // Override Start Node for email-initiated workflows
    if (isEmailStart) {
      const mailSettings = block.settings?.mailInitiate || {}
      const connectorType = String(
        mailSettings.connectorType || 'gmail',
      ).toLowerCase()
      toolType = connectorType.includes('outlook')
        ? NODE_TOOL_TYPE.OUTLOOK
        : NODE_TOOL_TYPE.GMAIL
      if (
        mailSettings.connectorId !== undefined &&
        mailSettings.connectorId !== null &&
        mailSettings.connectorId !== ''
      ) {
        connectorId = mailSettings.connectorId
      }

      if (mailSettings.conditions) {
        hasAttachmentEnabled = mailSettings.conditions.hasAttachment ?? false

        const subjects = mailSettings.conditions.mailSubject
        if (Array.isArray(subjects) && subjects.length > 0) {
          mailSubjectEnabled = true
          mailSubjectToMonitor = subjects.join(', ')
        }

        const contents = mailSettings.conditions.mailContent
        if (Array.isArray(contents) && contents.length > 0) {
          mailContentEnabled = true
          mailContentToMonitor = contents.join(', ')
        }

        const addrs = mailSettings.conditions.fromAddress
        if (Array.isArray(addrs) && addrs.length > 0) {
          fromMailAddressEnabled = true
          fromMailAddresses = addrs.map((addr: string) => ({
            id: addr,
            name: String(addr),
          }))
        }

        const domains = mailSettings.conditions.fromDomain
        if (Array.isArray(domains) && domains.length > 0) {
          fromDomainNameEnabled = true
          fromDomainName = {
            id: domains[0],
            name: String(domains[0]),
          }
        }
      }
    } else if (isManualStart) {
      toolType = NODE_TOOL_TYPE.MANUAL_USER
    }

    if (connectorId === undefined) {
      if (block.settings?.connectorId !== undefined) {
        connectorId = block.settings.connectorId
      } else if (block.settings?.apAgent?.connectorId !== undefined) {
        connectorId = block.settings.apAgent.connectorId
      } else if (block.settings?.ftpAgent?.connectorId !== undefined) {
        connectorId = block.settings.ftpAgent.connectorId
      } else if (block.settings?.googleDrive?.connectorId !== undefined) {
        connectorId = block.settings.googleDrive.connectorId
      } else if (block.settings?.onedrive?.connectorId !== undefined) {
        connectorId = block.settings.onedrive.connectorId
      } else if (block.settings?.mailInitiate?.connectorId !== undefined) {
        connectorId = block.settings.mailInitiate.connectorId
      }
    }

    const defaults = getNodeDefaults(toolType)

    // Map AP Agent nested settings into flat UI fields used by APAgentSettingsPanel
    const apAgent = block.settings?.apAgent
    let apAgentUi: Record<string, unknown> = {}
    if (
      apAgent &&
      (toolType === NODE_TOOL_TYPE.AP_AGENT || block.type === 'AP_AGENT')
    ) {
      const invoiceTypeMap: Record<string, string> = {
        NON_PO: 'Non-PO',
        NON_PO_INVOICE: 'Non-PO',
        PO_INVOICE: 'PO Invoices',
      }
      const matchingTypeMap: Record<string, string> = {
        '2_WAY_MATCH': '2-Way Match',
        '3_WAY_MATCH': '3-Way Match',
      }
      const features: string[] = Array.isArray(apAgent.features)
        ? apAgent.features
        : []

      const toMasterOption = (id: unknown) => {
        if (id === null || id === undefined || id === '' || id === 0)
          return null
        return { id, name: String(id) }
      }

      apAgentUi = {
        apAgent, // preserve nested payload for round-trip export
        backOrderDetection: features.includes('BACKORDER_DETECT'),
        duplicateDetection: features.includes('DUPLICATE_DETECT'),
        glSource: toMasterOption(apAgent.syncGLAccount),
        invoiceMaster:
          apAgent.invoiceType === 'NON_PO' ||
          apAgent.invoiceType === 'NON_PO_INVOICE'
            ? toMasterOption(apAgent.formId)
            : undefined,
        invoiceType:
          invoiceTypeMap[apAgent.invoiceType] ||
          apAgent.invoiceType ||
          'PO Invoices',
        matterSource: toMasterOption(apAgent.syncMatterInfo),
        poMaster:
          !apAgent.invoiceType ||
          apAgent.invoiceType === 'PO_INVOICE' ||
          apAgent.invoiceType === 'PO'
            ? toMasterOption(apAgent.formId)
            : undefined,
        poMatching:
          matchingTypeMap[apAgent.matchingType] ||
          apAgent.matchingType ||
          '2-Way Match',
        syncGL: !!apAgent.syncGLAccountRequired,
        syncMatter: !!apAgent.syncMatterInfoRequired,
        thresholds: {
          approved: apAgent.decisionApprove ?? 90,
          partial: apAgent.decisionPartial ?? 60,
        },
        vendorMustExist:
          apAgent.vendorValidationRequired ?? !!apAgent.vendorMasterId,
        vendorSource: toMasterOption(apAgent.vendorMasterId),
        weights: Array.isArray(apAgent.fieldScore)
          ? apAgent.fieldScore.map((field: any) => ({
              fieldId: field.id || field.fieldId || field.rowId,
              label: field.label || field.name || '',
              rowId: field.id || field.rowId || field.fieldId,
              value: field.value ?? 0,
            }))
          : undefined,
      }
    }

    const providerLabels: Record<string, string> = {
      gmail: 'Gmail',
      outlook: 'Outlook',
    }
    let nodeLabel: string
    if (isEmailStart) {
      nodeLabel = providerLabels[toolType] || 'Gmail'
    } else if (isManualStart) {
      nodeLabel = block.settings?.label || 'Manual User'
    } else {
      nodeLabel = block.settings?.label || providerLabels[toolType] || 'Node'
    }

    return {
      data: {
        // Map condition-specific settings for legacy import
        conditions: block.settings?.conditions,
        connection: connectorId ? String(connectorId) : undefined,
        connectorId: connectorId,
        fromDomainName,
        fromDomainNameEnabled,
        fromMailAddressEnabled,
        fromMailAddresses,
        generatePDF: Boolean(
          block.settings?.generatePDF ||
            (Array.isArray(block.settings?.generatePDFFields) &&
              block.settings.generatePDFFields.length > 0),
        ),
        pdfTemplate: block.settings?.pdfTemplate,
        pdfTemplateJson:
          typeof block.settings?.pdfTemplateJson === 'string'
            ? block.settings.pdfTemplateJson
            : block.settings?.pdfTemplate
              ? JSON.stringify(block.settings.pdfTemplate, null, 2)
              : '',
        hasAttachmentEnabled,
        icon: defaults.icon,
        iconColor: defaults.iconColor,
        initiateBy: block.settings?.initiateBy,
        initiateMode: block.settings?.initiateMode,
        isGroupEnabled: Array.isArray(block.settings?.groups)
          ? block.settings.groups.length > 0
          : undefined,
        isUserEnabled: Array.isArray(block.settings?.users)
          ? block.settings.users.length > 0
          : undefined,
        label: nodeLabel,
        mailInitiate:
          block.settings?.mailInitiate ||
          (nodeType === 'START' || isEmailStart || isManualStart
            ? { connectorId: connectorId || '', connectorType: '' }
            : undefined),
        mailContentEnabled,
        mailContentToMonitor,
        mailSubjectEnabled,
        mailSubjectToMonitor,
        masterConditions: block.settings?.masterConditions,
        selectedGroups: Array.isArray(block.settings?.groups)
          ? block.settings.groups
              .map((g: any) => {
                if (g == null || g === '') return null
                if (typeof g === 'object') {
                  const id = g.groupId ?? g.id ?? g.value
                  if (id == null || id === '') return null
                  return {
                    id: String(id),
                    name: String(
                      g.groupName || g.name || g.value || `Group ${id}`,
                    ),
                  }
                }
                return {
                  id: String(g),
                  name: `Group ${g}`,
                }
              })
              .filter(Boolean)
          : undefined,
        selectedUsers: Array.isArray(block.settings?.users)
          ? block.settings.users
              .map((u: any) => {
                if (u == null || u === '') return null
                if (typeof u === 'object') {
                  const id = u.id ?? u.userId ?? u.value
                  if (id == null || id === '') return null
                  return {
                    id: String(id),
                    name: String(
                      u.name ||
                        u.loginName ||
                        u.email ||
                        u.value ||
                        `User ${id}`,
                    ),
                  }
                }
                return {
                  id: String(u),
                  name: `User ${u}`,
                }
              })
              .filter(Boolean)
          : undefined,
        standardCondition: block.settings?.standardCondition ?? true,
        subLabel: defaults.subLabel,
        toolType: normalizeNodeToolType(toolType),
        type: nodeType,
        warning: false,

        // Manual User (INTERNAL_ACTOR) - General / Action-By
        isManagerEnabled: block.settings?.isManagerEnabled ?? false,
        isToRequesterEnabled: block.settings?.isToRequesterEnabled ?? false,
        isDynamicUserEnabled: block.settings?.isDynamicUserEnabled ?? false,
        dynamicUserField: block.settings?.dynamicUserField ?? null,
        isMasterUserEnabled: block.settings?.isMasterUserEnabled ?? false,
        masterUserColumn: block.settings?.masterUserColumn ?? '',
        isActedActivityEnabled:
          block.settings?.isActedActivityEnabled ?? false,
        actedActivityBlockId: block.settings?.actedActivityBlockId ?? null,
        isCoordinatorEnabled: block.settings?.isCoordinatorEnabled ?? false,
        internalForward: block.settings?.internalForward ?? false,
        forwardedUserAction: block.settings?.forwardedUserAction ?? '',
        internalForwardUser: Array.isArray(block.settings?.internalForwardUser)
          ? block.settings.internalForwardUser.map(String)
          : [],
        internalForwardGroup: Array.isArray(
          block.settings?.internalForwardGroup,
        )
          ? block.settings.internalForwardGroup.map(String)
          : [],
        partialApprove: block.settings?.partialApprove ?? 'ALL',
        fullApprovalAction: block.settings?.fullApprovalAction ?? '',
        documentRequired: block.settings?.documentRequired ?? false,
        userSignature: block.settings?.userSignature ?? false,
        generatePDFFields: Array.isArray(block.settings?.generatePDFFields)
          ? block.settings.generatePDFFields.map(String)
          : [],
        hasFooter: block.settings?.hasFooter ?? false,
        footerText: block.settings?.footerText ?? '',
        generateCSV: block.settings?.generateCSV ?? false,
        generateCSVFields: Array.isArray(block.settings?.generateCSVFields)
          ? block.settings.generateCSVFields.map(String)
          : [],

        // Manual User - Security & Form Access
        formEditAccess: block.settings?.formEditAccess ?? 'ALL',
        formEditControls: Array.isArray(block.settings?.formEditControls)
          ? block.settings.formEditControls.map((r: any) => ({
              id: r.id || generateId(),
              formFields: Array.isArray(r.formFields) ? r.formFields : [],
              userId: String(r.userId ?? ''),
            }))
          : [],
        formVisibilityAccess: block.settings?.formVisibilityAccess ?? 'ALL',
        formSecureControls: Array.isArray(block.settings?.formSecureControls)
          ? block.settings.formSecureControls.map((r: any) => ({
              id: r.id || generateId(),
              formFields: Array.isArray(r.formFields) ? r.formFields : [],
              userId: String(r.userId ?? ''),
            }))
          : [],
        mandatoryFields: Array.isArray(block.settings?.mandatoryFields)
          ? block.settings.mandatoryFields.map(String)
          : [],

        // Manual User - Checklist
        checklistItems: Array.isArray(block.settings?.checklistItems)
          ? block.settings.checklistItems.map((i: any) => ({
              id: i.id || generateId(),
              label: i.label || '',
              required: i.required !== false,
            }))
          : [],
        ...apAgentUi,
        // specifically map the legacy block properties we might need for rendering
        // but avoid polluting the new structure with unmapped settings
      },
      id: block.id,
      position: {
        x: isV6 ? blockLeft : originX + relativeX,
        y: isV6 ? blockTop : originY + relativeY,
      },
      type: 'custom',
    }
  })

  const validNodeIds = new Set(nodes.map((n) => n.id))

  const edges: Edge[] = Array.isArray(legacyJson.rules)
    ? (legacyJson.rules
        .map((rule: any) => {
          const sourceId = String(rule.fromBlockId || rule.from || '')
          const targetId = String(rule.toBlockId || rule.to || '')
          if (!sourceId || !targetId) return null
          if (!validNodeIds.has(sourceId) || !validNodeIds.has(targetId))
            return null

          const actionName = rule.action || rule.proceedAction || 'Submit'
          return {
            data: {
              action: actionName,
              confirm: rule.confirm ?? false,
              passwordAccess: rule.passwordAccess ?? false,
              proceedAction: actionName,
              remarks: rule.remarks ?? false,
              signature: rule.signature ?? false,
            },
            id: String(rule.id || `e_${sourceId}_${targetId}`),
            source: sourceId,
            target: targetId,
            type: 'custom',
          }
        })
        .filter(Boolean) as Edge[])
    : []

  if (edges.length === 0 && nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        data: {},
        id: `e_${nodes[i].id}_${nodes[i + 1].id}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        type: 'custom',
      })
    }
  }

  return { edges, nodes }
}
