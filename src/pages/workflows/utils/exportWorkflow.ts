import type { Edge, Node } from '@xyflow/react'
import useWorkflowStore from '../stores/useWorkflowStore'

const mapToolTypeToLegacyType = (
  toolType: string | undefined,
  nodeData: any,
): string => {
  if (!toolType) return 'NODE'
  const t = toolType.toLowerCase()
  if (t === 'ocr agent' || t === 'ocr') return 'OCR'
  if (t === 'ap agent' || t === 'ap_agent') return 'AP_AGENT'
  if (t === 'condition') return 'CONDITION'
  if (
    t === 'manual user' ||
    t === 'verifier' ||
    t === 'actor' ||
    t === 'internal_actor'
  )
    return 'INTERNAL_ACTOR'
  if (t === 'trigger' || t === 'initiator' || t === 'start') return 'START'
  if (t === 'gmail' || t === 'outlook') return 'START'
  if (t === 'action' || t === 'end') return 'END'
  return (nodeData.type || 'NODE').toUpperCase()
}

export const exportWorkflow = (nodes: Node[], edges: Edge[]) => {
  const storeState = useWorkflowStore.getState()

  const blocks = nodes.map((node) => {
    const data = (node.data || {}) as any
    const toolType = data.toolType

    // Base settings to be included in the legacy 'settings' object
    const settings: any = {
      label: data.label || '',
      ...data,
    }

    // Map users and groups back to legacy arrays of IDs
    if (data.selectedUsers) {
      settings.users = data.selectedUsers.map((u: any) => u.id)
      delete settings.selectedUsers
    } else if (!settings.users) {
      settings.users = []
    }

    if (data.selectedGroups) {
      settings.groups = data.selectedGroups.map((g: any) => g.id)
      delete settings.selectedGroups
    } else if (!settings.groups) {
      settings.groups = []
    }

    // Reconstruct nested settings for specific types
    if (toolType === 'gmail' || toolType === 'outlook') {
      settings.mailInitiate = {
        conditions: {
          fromAddress: data.fromMailAddresses?.map((a: any) => a.id) || [],
          fromDomain: data.fromDomainName ? [data.fromDomainName.id] : [],
          hasAttachment: !!data.hasAttachmentEnabled,
          mailContent: data.mailContentToMonitor
            ? data.mailContentToMonitor.split(',').map((s: string) => s.trim())
            : [],
          mailSubject: data.mailSubjectToMonitor
            ? data.mailSubjectToMonitor.split(',').map((s: string) => s.trim())
            : [],
        },
        connectorId: data.connectorId || Number(data.connection) || 0,
        connectorType: toolType.toUpperCase(),
      }
      // Clean up flat fields used in UI
      delete settings.fromMailAddresses
      delete settings.fromDomainName
      delete settings.hasAttachmentEnabled
      delete settings.mailContentToMonitor
      delete settings.mailSubjectToMonitor
      delete settings.fromMailAddressEnabled
      delete settings.fromDomainNameEnabled
      delete settings.mailContentEnabled
      delete settings.mailSubjectEnabled
    }

    // Ensure tool-specific nested objects exist
    if (toolType?.includes('ocr')) {
      settings.ocrAgent = settings.ocrAgent || {}
      if (data.connectorId) settings.ocrAgent.connectorId = data.connectorId
    }
    if (toolType?.includes('ap agent')) {
      settings.apAgent = settings.apAgent || {}
      if (data.connectorId) settings.apAgent.connectorId = data.connectorId
    }

    // Clean up internal UI fields
    delete settings.toolType
    delete settings.icon
    delete settings.iconColor
    delete settings.subLabel
    delete settings.warning
    delete settings.type
    delete settings.connection

    return {
      color:
        data.iconColor || (node.type === 'trigger' ? '#2BCCBA' : '#A65EEA'),
      height: node.measured?.height ?? 90,
      icon: data.icon || 'mdi-cog',
      id: node.id,
      left: Math.round(node.position.x),
      top: Math.round(node.position.y),
      type: mapToolTypeToLegacyType(toolType, data),
      width: node.measured?.width ?? 175,
      settings,
    }
  })

  const rules = edges.map((edge) => {
    const edgeData = edge.data || {}
    return {
      confirm: edgeData.confirm ?? false,
      fromBlockId: edge.source,
      id: edge.id,
      left: 0,
      passwordAccess: edgeData.passwordAccess ?? false,
      proceedAction: edgeData.proceedAction || edgeData.action || 'Submit',
      remarks: edgeData.remarks ?? false,
      signature: edgeData.signature ?? false,
      toBlockId: edge.target,
      top: 0,
      ...edgeData,
    }
  })

  return {
    blocks,
    blockStatus: 0,
    hasSLASettings: 1,
    initiateUserDomain: [],
    layoutVersion: 2,
    masterFormIds: [],
    mlPredictions: [],
    modifiedBlockIds: [],
    rules,
    settings: {
      general: {
        coordinator: [],
        description: storeState.workflowDescription,
        fileSize: 20,
        initiateUsing: {
          formId: storeState.form,
          repositoryId: storeState.folder,
          type: storeState.initiateUsing,
        },
        kanbanSettings: [],
        linkMasterFormId: 0,
        name: storeState.workflowName,
        ocr: {
          credit: 0,
          required: false,
        },
        processNumberPrefix: JSON.stringify(storeState.prefixSegments),
        scheduleReport: {},
        slaRules: [],
        slaSettings: {
          emailNotify: true,
          slaMasterFormId: 0,
          slaType: 'STANDARD',
          smsNotify: false,
          timeZone: '',
          workDays: [],
          workflowFormSLAFieldId: '',
          workHours: {
            from: '',
            to: '',
          },
        },
        smtpEmailId: 0,
        superuser: [],
        verifiedDocument: [],
      },
      publish: {
        publishOption:
          storeState.workflowStatus === 'published' ? 'PUBLISHED' : 'DRAFT',
        publishSchedule: '',
        unpublishSchedule: '',
      },
    },
  }
}
