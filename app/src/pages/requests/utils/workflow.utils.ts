import type { ActionButton } from '../types'

// Helper to determine tenant specific logic (replacing isTenantArmgroup, etc.)
export const checkTenantFeature = (feature: string) => {
  const origin = window.location.origin
  // Add your logic here based on origin or env variables
  if (feature === 'HIDE_COLUMNS_ARMGROUP') return origin.includes('ag-appsvc')
  return false
}

// Parse flowJson to determine buttons (Approve, Reject, Forward)
export const getActionsForActivity = (
  activityId: string,
  flowJsonInput: string | any | undefined,
): ActionButton[] => {
  if (!activityId || !flowJsonInput) return []

  const actions: ActionButton[] = []
  try {
    const flow =
      typeof flowJsonInput === 'string'
        ? JSON.parse(flowJsonInput)
        : flowJsonInput

    // Extract rules array from various possible structures
    let rules: any[] = []
    if (Array.isArray(flow)) {
      rules = flow
    } else if (flow && typeof flow === 'object') {
      if (Array.isArray(flow.rules)) {
        rules = flow.rules
      } else if (flow.flowJson && Array.isArray(flow.flowJson.rules)) {
        rules = flow.flowJson.rules
      } else if (flow.flowJson && typeof flow.flowJson === 'string') {
        try {
          const parsedInner = JSON.parse(flow.flowJson)
          if (Array.isArray(parsedInner?.rules)) {
            rules = parsedInner.rules
          } else if (Array.isArray(parsedInner)) {
            rules = parsedInner
          }
        } catch {
          // ignore
        }
      }
    }

    // 1. Check Rules (Outgoing Lines)
    rules.forEach((rule: any) => {
      if (rule.fromBlockId === activityId) {
        let color: ActionButton['color'] = 'blue'
        let icon = 'tabler:arrow-right'

        const action = rule.action || rule.proceedAction
        if (!action) return

        if (['Approve', 'Complete'].includes(action)) {
          color = 'green'
          icon = 'tabler:check'
        } else if (['Reject', 'Terminate'].includes(action)) {
          color = 'red'
          icon = 'tabler:x'
        } else if (['Reply'].includes(action)) {
          color = 'orange'
          icon = 'tabler:arrow-back-up'
        }

        actions.push({ color, icon, label: action, value: action })
      }
    })

    // 2. Check Block Settings (Internal Forward)
    if (flow && typeof flow === 'object') {
      const blocks = Array.isArray(flow.blocks) ? flow.blocks : []
      const block = blocks.find((b: any) => b.id === activityId)
      if (block?.settings?.internalForward) {
        actions.push({
          color: 'orange',
          icon: 'tabler:user-share',
          label: 'Assign',
          value: 'Assign',
        })
      }
    }
  } catch (e) {
    console.error('Error parsing flowJson', e)
  }
  return actions
}

// Safe JSON parse for cell data
export const safeParse = (data: any) => {
  try {
    return typeof data === 'string' ? JSON.parse(data) : data
  } catch {
    return data
  }
}
