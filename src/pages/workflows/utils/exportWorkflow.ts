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
      const existingApAgent = settings.apAgent || {}
      const features: string[] = Array.isArray(existingApAgent.features)
        ? [...existingApAgent.features]
        : []

      const setFeature = (code: string, enabled: boolean) => {
        const idx = features.indexOf(code)
        if (enabled && idx === -1) features.push(code)
        if (!enabled && idx !== -1) features.splice(idx, 1)
      }

      setFeature('DUPLICATE_DETECT', data.duplicateDetection !== false)
      setFeature('BACKORDER_DETECT', !!data.backOrderDetection)
      setFeature('TWO_WAY_MATCH', data.poMatching === '2-Way Match')
      setFeature('THREE_WAY_MATCH', data.poMatching === '3-Way Match')

      const formId =
        data.invoiceType === 'Non-PO'
          ? (data.invoiceMaster?.id ?? data.invoiceMaster)
          : (data.poMaster?.id ?? data.poMaster)

      const fieldScore = Array.isArray(data.weights)
        ? data.weights.map((w: any) => ({
            id: w.rowId || w.fieldId || w.id,
            label: w.label || '',
            value: w.value ?? 0,
          }))
        : existingApAgent.fieldScore || []

      settings.apAgent = {
        ...existingApAgent,
        connectorId: data.connectorId ?? existingApAgent.connectorId ?? '',
        decisionApprove: data.thresholds?.approved ?? existingApAgent.decisionApprove,
        decisionPartial: data.thresholds?.partial ?? existingApAgent.decisionPartial,
        decisionReject:
          data.thresholds?.reject ?? existingApAgent.decisionReject ?? 0,
        features,
        fieldScore,
        formId: formId ?? existingApAgent.formId ?? '',
        resource:
          existingApAgent.resource || (formId ? 'FORM' : existingApAgent.resource),
        vendorMasterId:
          data.vendorSource?.id ?? data.vendorSource ?? existingApAgent.vendorMasterId,
        vendorValidationRequired: !!(
          data.vendorMustExist ??
          data.vendorSource?.id ??
          data.vendorSource
        ),
      }

      // Clean up flat UI fields that live under apAgent
      delete settings.weights
      delete settings.thresholds
      delete settings.invoiceType
      delete settings.poMatching
      delete settings.poMaster
      delete settings.invoiceMaster
      delete settings.vendorMustExist
      delete settings.vendorSource
      delete settings.syncGL
      delete settings.syncMatter
      delete settings.glSource
      delete settings.matterSource
      delete settings.duplicateDetection
      delete settings.backOrderDetection
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
