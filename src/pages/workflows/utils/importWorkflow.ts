import type { Edge, Node } from '@xyflow/react'

function getNodeDefaults(toolType: string) {
  const typeStr = (toolType || '').toLowerCase()
  if (typeStr.includes('ocr'))
    return {
      icon: 'lucide:scan-text',
      iconColor: '#2563eb',
      subLabel: 'Extract text from images/PDFs',
    }
  if (typeStr.includes('ap agent'))
    return {
      icon: 'lucide:receipt-text',
      iconColor: '#059669',
      subLabel: 'Accounts Payable automation',
    }
  if (typeStr.includes('ftp'))
    return {
      icon: 'lucide:server',
      iconColor: '#7c3aed',
      subLabel: 'File Transfer Protocol',
    }
  if (typeStr.includes('google drive'))
    return {
      icon: 'logos:google-drive',
      iconColor: '',
      subLabel: 'Store or collect files from Google Drive',
    }
  if (typeStr.includes('onedrive'))
    return {
      icon: 'logos:microsoft-onedrive',
      iconColor: '',
      subLabel: 'Microsoft OneDrive integration',
    }
  if (typeStr.includes('gmail'))
    return {
      icon: 'logos:google-gmail',
      iconColor: '',
      subLabel: 'Send or receive emails',
    }
  if (typeStr.includes('outlook'))
    return {
      icon: 'vscode-icons:file-type-outlook',
      iconColor: '',
      subLabel: 'Microsoft Outlook integration',
    }
  if (typeStr.includes('slack'))
    return {
      icon: 'logos:slack-icon',
      iconColor: '',
      subLabel: 'Send channel messages',
    }
  if (typeStr.includes('teams'))
    return {
      icon: 'logos:microsoft-teams',
      iconColor: '',
      subLabel: 'Microsoft Teams integration',
    }
  if (typeStr.includes('condition'))
    return {
      icon: 'lucide:split',
      iconColor: '#f97316',
      subLabel: 'Check logic conditions',
    }
  if (
    typeStr.includes('manual user') ||
    typeStr.includes('verifier') ||
    typeStr.includes('actor')
  )
    return {
      icon: 'lucide:user',
      iconColor: '#ec4899',
      subLabel: 'Trigger manually by user',
    }
  if (
    typeStr.includes('form') ||
    typeStr.includes('trigger') ||
    typeStr.includes('initiator')
  )
    return {
      icon: 'lucide:file-input',
      iconColor: '#ea580c',
      subLabel: 'Trigger on new form entry',
    }
  if (typeStr.includes('end') || typeStr.includes('action'))
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
      return 'ocr agent'
    case 'AP_AGENT':
      return 'ap agent'
    case 'CONDITION':
      return 'condition'
    case 'INTERNAL_ACTOR':
      return 'manual user'
    case 'START':
      return label || 'trigger'
    case 'END':
      return label || 'action'
    default:
      return label || legacyType
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

    // Override Start Node if it's an Email initiated connector
    if (
      block.type === 'START' &&
      block.settings?.initiateMode === 'AUTOMATIC' &&
      block.settings?.initiateBy?.includes('EMAIL')
    ) {
      const mailSettings = block.settings?.mailInitiate
      if (mailSettings?.connectorType) {
        // e.g., 'gmail'
        toolType = mailSettings.connectorType.toLowerCase()
        connectorId = mailSettings.connectorId

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
      }
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
        hasAttachmentEnabled,
        icon: defaults.icon,
        iconColor: defaults.iconColor,
        label:
          block.settings?.label ||
          (toolType === 'gmail'
            ? 'Gmail'
            : toolType === 'outlook'
              ? 'Outlook'
              : 'Node'),
        mailContentEnabled,
        mailContentToMonitor,
        mailSubjectEnabled,
        mailSubjectToMonitor,
        masterConditions: block.settings?.masterConditions,
        selectedGroups: Array.isArray(block.settings?.groups)
          ? block.settings.groups.map((g: string) => ({
              id: g,
              name: `Group ${g}`,
            }))
          : undefined,
        selectedUsers: Array.isArray(block.settings?.users)
          ? block.settings.users.map((u: string) => ({
              id: u,
              name: `User ${u}`,
            }))
          : undefined,
        standardCondition: block.settings?.standardCondition ?? true,
        subLabel: defaults.subLabel,
        toolType: toolType,
        type: nodeType,
        warning: false,
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

  const edges: Edge[] = Array.isArray(legacyJson.rules)
    ? legacyJson.rules.map((rule: any) => {
        return {
          data: {
            action: rule.proceedAction, // Map legacy proceedAction to the new builder's expected 'action' field
            confirm: rule.confirm,
            passwordAccess: rule.passwordAccess,
            proceedAction: rule.proceedAction,
            remarks: rule.remarks,
            signature: rule.signature,
          },
          id: rule.id,
          source: rule.fromBlockId,
          target: rule.toBlockId,
          type: 'custom',
        }
      })
    : []

  return { edges, nodes }
}
