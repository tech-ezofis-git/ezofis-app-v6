import type { Edge, Node } from '@xyflow/react'
import useWorkflowStore from '../stores/useWorkflowStore'

export const exportWorkflow = (nodes: Node[], edges: Edge[]) => {
  const storeState = useWorkflowStore.getState()

  const blocks = nodes.map((node) => {
    // Extract known properties from node.data
    const {
      color = node.type === 'trigger' ? '#2BCCBA' : '#A65EEA', // default colors based on old JSON
      icon = 'mdi-cog',
      label = '',
      type = 'NODE',
      // Separate the rest into settings
      ...restData
    } = node.data || {}

    return {
      color,
      height: node.measured?.height ?? 90,
      icon,
      id: node.id,
      left: Math.round(node.position.x),
      top: Math.round(node.position.y),
      type: typeof type === 'string' ? type.toUpperCase() : 'NODE',
      width: node.measured?.width ?? 175,
      settings: {
        label,
        ...restData,
      },
    }
  })

  const rules = edges.map((edge) => {
    // Extract known edge settings
    const {
      confirm = false,
      passwordAccess = false,
      proceedAction = 'Submit',
      remarks = false,
      signature = false,
      ...restEdgeData
    } = edge.data || {}

    return {
      confirm,
      fromBlockId: edge.source,
      id: edge.id,
      left: 0, // In React Flow edges are drawn via SVG paths, old format just had points possibly, replacing with 0
      passwordAccess,
      proceedAction,
      remarks,
      signature,
      toBlockId: edge.target,
      top: 0,
      ...restEdgeData,
    }
  })

  // Basic structure
  return {
    blocks,
    blockStatus: 0,
    hasSLASettings: 1,
    initiateUserDomain: [],
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
