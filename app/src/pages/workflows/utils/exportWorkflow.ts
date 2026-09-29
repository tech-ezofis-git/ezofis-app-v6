import type { Edge, Node } from '@xyflow/react'
import { ensureStartAndEndNodes } from '@/services/ai/workflowConfig'
import useWorkflowStore from '../stores/useWorkflowStore'
import { NODE_TOOL_TYPE, normalizeNodeToolType } from './nodeToolTypes'

const mapToolTypeToLegacyType = (
  toolType: string | undefined,
  nodeData: any,
  nodeIndex: number,
  totalNodes: number,
): string => {
  const t = normalizeNodeToolType(toolType)
  const explicitType = String(nodeData.type || '').toUpperCase()

  if (
    t === NODE_TOOL_TYPE.END ||
    explicitType === 'END' ||
    nodeData.label === 'Workflow Success'
  )
    return 'END'
  if (
    t === NODE_TOOL_TYPE.GMAIL ||
    t === NODE_TOOL_TYPE.OUTLOOK ||
    t === NODE_TOOL_TYPE.FORM_SUBMISSION ||
    t === 'trigger' ||
    t === 'initiator' ||
    t === 'start' ||
    explicitType === 'START'
  )
    return 'START'
  if (t === NODE_TOOL_TYPE.OCR_AGENT || t === 'ocr') return 'OCR'
  if (t === NODE_TOOL_TYPE.AP_AGENT) return 'AP_AGENT'
  if (t === NODE_TOOL_TYPE.KYC_AGENT) return 'KYC_AGENT'
  if (t === NODE_TOOL_TYPE.PROCUREMENT_AGENT) return 'PROCUREMENT_AGENT'
  if (t === NODE_TOOL_TYPE.DOCUMENT_GENERATE_AGENT)
    return 'DOCUMENT_GENERATE_AGENT'
  if (t === NODE_TOOL_TYPE.QUALIFY_AGENT || t.includes('qualify'))
    return 'QUALIFY_AGENT'
  if (t === NODE_TOOL_TYPE.QUOTE_AGENT || t.includes('quote'))
    return 'QUOTE_AGENT'
  if (t === NODE_TOOL_TYPE.FTP_AGENT || t.includes('ftp')) return 'FTP_AGENT'
  if (t === NODE_TOOL_TYPE.GOOGLE_DRIVE || t.includes('drive'))
    return 'GOOGLE_DRIVE'
  if (t === NODE_TOOL_TYPE.ONEDRIVE) return 'ONEDRIVE'
  if (t === NODE_TOOL_TYPE.SLACK) return 'SLACK'
  if (t === NODE_TOOL_TYPE.TEAMS) return 'TEAMS'
  if (t === NODE_TOOL_TYPE.CONDITION) return 'CONDITION'
  if (
    t === NODE_TOOL_TYPE.MANUAL_USER ||
    t === 'verifier' ||
    t === 'actor' ||
    t === 'internal_actor'
  )
    return nodeIndex === 0 ? 'START' : 'INTERNAL_ACTOR'

  if (nodeIndex === 0) return 'START'

  return (nodeData.type || 'INTERNAL_ACTOR').toUpperCase()
}

export const exportWorkflow = (nodes: Node[], edges: Edge[]) => {
  const storeState = useWorkflowStore.getState()

  const rawBlocks = nodes.map((node, index) => {
    const data = (node.data || {}) as any
    const toolType = normalizeNodeToolType(data.toolType)

    // Base settings to be included in the legacy 'settings' object
    const settings: any = {
      label: data.label || '',
      ...data.settings,
      ...data,
    }
    delete settings.settings

    // Map users and groups back to legacy arrays of IDs
    if (Array.isArray(data.selectedUsers)) {
      settings.users = data.selectedUsers.map((u: any) =>
        typeof u === 'object' ? String(u.id ?? u.value ?? u) : String(u),
      )
      delete settings.selectedUsers
    } else if (Array.isArray(data.users)) {
      settings.users = data.users.map((u: any) =>
        typeof u === 'object' ? String(u.id ?? u.value ?? u) : String(u),
      )
    } else {
      settings.users = Array.isArray(settings.users)
        ? settings.users.map((u: any) =>
            typeof u === 'object' ? String(u.id ?? u.value ?? u) : String(u),
          )
        : []
    }

    if (Array.isArray(data.selectedGroups)) {
      settings.groups = data.selectedGroups.map((g: any) =>
        typeof g === 'object' ? String(g.id ?? g.value ?? g) : String(g),
      )
      delete settings.selectedGroups
    } else if (Array.isArray(data.groups)) {
      settings.groups = data.groups.map((g: any) =>
        typeof g === 'object' ? String(g.id ?? g.value ?? g) : String(g),
      )
    } else {
      settings.groups = Array.isArray(settings.groups)
        ? settings.groups.map((g: any) =>
            typeof g === 'object' ? String(g.id ?? g.value ?? g) : String(g),
          )
        : []
    }

    // Normalize Manual User (INTERNAL_ACTOR) option-array fields to plain IDs
    const toIdArray = (val: any): string[] =>
      Array.isArray(val)
        ? val.map((v: any) => (typeof v === 'object' ? String(v.id ?? v.value ?? v) : String(v)))
        : []

    if (Array.isArray(data.internalForwardUser)) {
      settings.internalForwardUser = toIdArray(data.internalForwardUser)
    }
    if (Array.isArray(data.internalForwardGroup)) {
      settings.internalForwardGroup = toIdArray(data.internalForwardGroup)
    }
    if (Array.isArray(data.generatePDFFields)) {
      settings.generatePDFFields = toIdArray(data.generatePDFFields)
    }
    if (Array.isArray(data.generateCSVFields)) {
      settings.generateCSVFields = toIdArray(data.generateCSVFields)
    }
    if (data.dynamicUserField && typeof data.dynamicUserField === 'object') {
      settings.dynamicUserField = String(
        (data.dynamicUserField as any).id ?? '',
      )
    }
    if (Array.isArray(data.formEditControls)) {
      settings.formEditControls = data.formEditControls.map((r: any) => ({
        formFields: Array.isArray(r.formFields) ? r.formFields : [],
        userId: String(r.userId ?? ''),
      }))
    }
    if (Array.isArray(data.formSecureControls)) {
      settings.formSecureControls = data.formSecureControls.map((r: any) => ({
        formFields: Array.isArray(r.formFields) ? r.formFields : [],
        userId: String(r.userId ?? ''),
      }))
    }

    const isStartNode =
      index === 0 ||
      data.type === 'START' ||
      toolType === NODE_TOOL_TYPE.GMAIL ||
      toolType === NODE_TOOL_TYPE.OUTLOOK

    // Ensure mailInitiate object exists for START block
    if (isStartNode) {
      const existingMailInitiate = settings.mailInitiate || data.mailInitiate || {}
      const connId = data.connectorId || data.connection || existingMailInitiate.connectorId || ''
      
      let connType = existingMailInitiate.connectorType || ''
      if (toolType === NODE_TOOL_TYPE.GMAIL || toolType === NODE_TOOL_TYPE.OUTLOOK) {
        connType = toolType.toUpperCase()
      } else if (connType === 'GMAIL' || connType === 'OUTLOOK') {
        connType = ''
      }

      settings.mailInitiate = {
        ...existingMailInitiate,
        connectorId: connId,
        connectorType: connType,
      }
    }

    // Reconstruct nested settings for specific types
    if (
      toolType === NODE_TOOL_TYPE.GMAIL ||
      toolType === NODE_TOOL_TYPE.OUTLOOK
    ) {
      const connId = data.connectorId || data.connection || data.mailInitiate?.connectorId || ''
      settings.mailInitiate = {
        ...settings.mailInitiate,
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
        connectorId: connId,
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
    if (toolType === NODE_TOOL_TYPE.OCR_AGENT || toolType.includes('ocr')) {
      settings.ocrAgent = settings.ocrAgent || {}
      if (data.connectorId) settings.ocrAgent.connectorId = data.connectorId
    }
    if (toolType === NODE_TOOL_TYPE.AP_AGENT) {
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

      // Determine PO Source (SAP / QUICKBOOKS / FORM)
      let resource = 'FORM'
      let formId = ''
      let connectorId = ''

      const isNonPo = data.invoiceType === 'Non-PO'

      if (isNonPo) {
        resource = 'FORM'
        formId = String(
          data.invoiceMaster?.id ??
            data.invoiceMaster ??
            data.formId ??
            existingApAgent.formId ??
            '',
        )
        connectorId = ''
      } else {
        // Determine PO Master Source Type
        let sourceType =
          data.poMasterSourceType ||
          data.poMasterType ||
          data.poMaster?.sourceType ||
          data.resource ||
          existingApAgent.resource

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
              existingApAgent.connectorId ??
              '',
          )
          formId = ''
        } else if (normSource === 'QUICKBOOKS' || normSource === 'QB') {
          resource = 'QUICKBOOKS'
          connectorId = String(
            data.poMasterQbAccount?.id ??
              data.qbAccount?.id ??
              data.connectorId ??
              existingApAgent.connectorId ??
              '',
          )
          formId = ''
        } else {
          resource = 'FORM'
          const rawForm =
            data.poMaster?.id ??
            data.poMaster ??
            data.formId ??
            existingApAgent.formId ??
            ''
          formId =
            String(rawForm).startsWith('sap_') || String(rawForm).startsWith('qb_')
              ? ''
              : String(rawForm)
          connectorId = ''
        }
      }

      const fieldScore = Array.isArray(data.weights)
        ? data.weights.map((w: any) => ({
            id: w.rowId || w.fieldId || w.id,
            label: w.label || '',
            value: w.value ?? 0,
          }))
        : existingApAgent.fieldScore || []

      settings.apAgent = {
        ...existingApAgent,
        connectorId,
        decisionApprove:
          data.thresholds?.approved ?? existingApAgent.decisionApprove ?? 90,
        decisionPartial:
          data.thresholds?.partial ?? existingApAgent.decisionPartial ?? 60,
        decisionReject:
          data.thresholds?.reject ?? existingApAgent.decisionReject ?? 0,
        features,
        fieldScore,
        formId,
        resource,
        vendorMasterId:
          data.vendorSource?.id ??
          data.vendorSource ??
          existingApAgent.vendorMasterId,
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

    if (toolType === NODE_TOOL_TYPE.DOCUMENT_GENERATE_AGENT) {
      const rawTemplate =
        data.templateJson ?? data.pdfTemplateJson ?? data.pdfTemplate
      if (typeof rawTemplate === 'string' && rawTemplate.trim()) {
        settings.templateJson = rawTemplate
      } else if (rawTemplate && typeof rawTemplate === 'object') {
        settings.templateJson = rawTemplate
      }
    }

    settings.generatePDF = Boolean(data.generatePDF)
    if (!Array.isArray(settings.generatePDFFields)) {
      settings.generatePDFFields = []
    }
    if (data.generatePDF) {
      const rawTemplate = data.pdfTemplateJson ?? data.pdfTemplate
      if (typeof rawTemplate === 'string' && rawTemplate.trim()) {
        try {
          settings.pdfTemplate = JSON.parse(rawTemplate)
          delete settings.pdfTemplateJson
        } catch {
          settings.pdfTemplateJson = rawTemplate
        }
      } else if (rawTemplate && typeof rawTemplate === 'object') {
        settings.pdfTemplate = rawTemplate
      }
    } else {
      delete settings.pdfTemplate
      delete settings.pdfTemplateJson
    }

    // Clean up internal UI fields
    settings.toolType = toolType || data.toolType
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
      type: mapToolTypeToLegacyType(toolType, data, index, nodes.length),
      width: node.measured?.width ?? 175,
      settings,
    }
  })

  const rawRules = edges.map((edge) => {
    const edgeData = (edge.data || {}) as any
    const sourceNode = nodes.find(n => n.id === edge.source)
    const sourceToolType = sourceNode ? normalizeNodeToolType((sourceNode.data || {}).toolType) : ''
    
    let actionName = String(edgeData.action || edgeData.proceedAction || 'Submit')

    if (sourceToolType === NODE_TOOL_TYPE.QUALIFY_AGENT || sourceToolType?.includes('qualify')) {
      actionName = actionName.toUpperCase() === 'DISQUALIFY' ? 'DISQUALIFY' : 'QUALIFY'
    } else if (sourceToolType === NODE_TOOL_TYPE.CONDITION) {
      const norm = actionName.toUpperCase().replace(/_/g, ' ')
      actionName = norm.includes('NOT') ? 'NOT SATISFIED' : 'SATISFIED'
    } else if (sourceToolType === NODE_TOOL_TYPE.AP_AGENT) {
      const norm = actionName.toUpperCase().replace(/[\s_-]+/g, ' ')
      if (norm.includes('PARTIAL')) {
        actionName = 'PARTIALLY MATCHED'
      } else if (norm.includes('NOT') || norm.includes('UNMATCH')) {
        actionName = 'NOT MATCHED'
      } else if (norm.includes('NON')) {
        actionName = 'NON-INVOICE'
      } else {
        actionName = 'MATCHED'
      }
    } else if (sourceToolType === NODE_TOOL_TYPE.FTP_AGENT) {
      const norm = actionName.toUpperCase()
      actionName = norm.includes('FAIL') || norm.includes('ERROR') ? 'FAILED' : 'SUCCESS'
    }

    return {
      ...edgeData,
      action: actionName,
      confirm: edgeData.confirm ?? false,
      fromBlockId: edge.source,
      id: edge.id,
      left: 0,
      passwordAccess: edgeData.passwordAccess ?? false,
      proceedAction: actionName,
      remarks: edgeData.remarks ?? false,
      signature: edgeData.signature ?? false,
      toBlockId: edge.target,
      top: 0,
    }
  })

  const { blocks, rules } = ensureStartAndEndNodes(rawBlocks, rawRules)

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
        kanbanSettings: storeState.kanbanSettings || [],
        linkMasterFormId: 0,
        name: storeState.workflowName,
        ocr: {
          credit: 0,
          required: false,
        },
        previewValues: storeState.previewValues,
        requestTitleField: storeState.requestTitleField,
        processNumberPrefix: JSON.stringify(storeState.prefixSegments),
        requestTabs: storeState.requestTabs || [],
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
          String(storeState.workflowStatus || '').toUpperCase() === 'PUBLISHED'
            ? 'PUBLISHED'
            : 'DRAFT',
        publishSchedule: '',
        unpublishSchedule: '',
      },
    },
  }
}
