import type { WorkflowOption } from '@/pages/requests/types'
import {
  isFieldFilled,
  isFieldHidden,
  isFieldRequired,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import {
  extractBlocks,
  extractWorkflowGraph,
} from '@/pages/requests/utils/workflow.utils'
import {
  hasKanbanCardSettings,
  KANBAN_CARD_COLORS,
  type KanbanCardColor,
  type KanbanCardSetting,
  parseKanbanSettings,
} from '@/pages/workflows/utils/kanbanSettings'
import {
  getFormPanels,
  resolveFormJson,
} from '../components/columns/useDynamicColumns'

const SKIP_BLOCK_TYPES = new Set([
  'ANNOTATION',
  'COMMENT',
  'CONDITION',
  'GROUP',
  'NOTE',
])

export type KanbanColumnDef = {
  color?: KanbanCardColor | string
  id: string
  name: string
  role: KanbanColumnRole
  stages: KanbanStageGroup[]
  terminal: boolean
}

export type KanbanColumnRole = 'neutral' | 'review' | 'success'

export type KanbanStageGroup = {
  id: string
  name: string
  terminal: boolean
}

const textOf = (value: unknown) => {
  if (value == null || value === '') return ''
  return String(value).trim()
}

export const normalizeKanbanLabel = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

export const kanbanBlockTitle = (block: Record<string, unknown>) => {
  const settings =
    block.settings && typeof block.settings === 'object'
      ? (block.settings as Record<string, unknown>)
      : {}
  const general =
    settings.general && typeof settings.general === 'object'
      ? (settings.general as Record<string, unknown>)
      : {}
  const type = String(block.type || '').toUpperCase()
  return (
    textOf(general.label) ||
    textOf(general.title) ||
    textOf(settings.label) ||
    textOf(settings.title) ||
    textOf(block.label) ||
    textOf(block.name) ||
    type ||
    'Step'
  )
}

const normalizeBlockType = (value: unknown) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

const blockTypeOf = (block: Record<string, unknown>) =>
  normalizeBlockType(block.type || block.toolType)

const isStartType = (type: string) => {
  const normalized = normalizeBlockType(type)
  return (
    normalized === 'START' ||
    normalized === 'INITIATOR' ||
    normalized === 'TRIGGER' ||
    normalized === 'GMAIL' ||
    normalized === 'OUTLOOK' ||
    normalized === 'FORM_SUBMISSION'
  )
}

const isEndType = (type: string) => {
  const normalized = normalizeBlockType(type)
  return normalized === 'END' || normalized === 'ACTION'
}

export const itemActivityId = (item: Record<string, unknown>) =>
  textOf(
    item.activityId ||
      item.currentActivityId ||
      item.stepId ||
      item.blockId ||
      item.nodeId,
  )

export const itemStageLabel = (item: Record<string, unknown>) =>
  textOf(
    item.stage ||
      item.stageName ||
      item.currentStage ||
      item.activityName ||
      item.activityLabel,
  )

const toColumn = (
  block: Record<string, unknown>,
  outgoingIds: Set<string>,
): KanbanColumnDef => {
  const type = blockTypeOf(block)
  const id = String(block.id || kanbanBlockTitle(block))
  const terminal =
    isEndType(type) || (!isStartType(type) && !outgoingIds.has(id))
  const success = (isEndType(type) || terminal) && !isStartType(type)
  return {
    id,
    name: kanbanBlockTitle(block),
    role: success ? 'success' : isStartType(type) ? 'neutral' : 'review',
    stages: [
      {
        id,
        name: kanbanBlockTitle(block),
        terminal: Boolean(success),
      },
    ],
    terminal: Boolean(success),
  }
}

const readKanbanSettings = (settings: unknown): KanbanCardSetting[] => {
  if (!settings || typeof settings !== 'object') return []
  return parseKanbanSettings(
    (settings as { general?: { kanbanSettings?: unknown } }).general
      ?.kanbanSettings,
  )
}

export const extractKanbanSettings = (
  workflow: WorkflowOption | null,
): KanbanCardSetting[] => {
  if (!workflow) return []
  const record = workflow as WorkflowOption & { settings?: unknown }
  if (record.workflowJson?.settings) {
    return readKanbanSettings(record.workflowJson.settings)
  }
  if (record.settings) return readKanbanSettings(record.settings)

  const flowJsonInput = record.flowJson ?? record.workflowJson
  if (!flowJsonInput) return []
  try {
    const flow =
      typeof flowJsonInput === 'string'
        ? JSON.parse(flowJsonInput)
        : flowJsonInput
    return readKanbanSettings(flow?.settings)
  } catch {
    return []
  }
}

export const buildKanbanColumns = (
  workflow: WorkflowOption | null,
): KanbanColumnDef[] => {
  const { blocks, rules } = extractWorkflowGraph(workflow)
  const outgoingIds = new Set(
    rules.map((rule: { fromBlockId?: string }) =>
      String(rule.fromBlockId || ''),
    ),
  )
  const childrenByFrom = new Map<string, string[]>()
  rules.forEach((rule: { fromBlockId?: string; toBlockId?: string }) => {
    const from = String(rule.fromBlockId || '')
    const to = String(rule.toBlockId || '')
    if (!from || !to) return
    childrenByFrom.set(from, [...(childrenByFrom.get(from) || []), to])
  })

  const visible = blocks.filter((block: Record<string, unknown>) => {
    const type = blockTypeOf(block)
    return type && !SKIP_BLOCK_TYPES.has(type)
  })
  const byId = new Map(
    visible.map((block: Record<string, unknown>) => [
      String(block.id || kanbanBlockTitle(block)),
      block,
    ]),
  )

  const incoming = new Set(
    rules.map((rule: { toBlockId?: string }) => String(rule.toBlockId || '')),
  )
  const startIds = visible
    .filter((block: Record<string, unknown>) => isStartType(blockTypeOf(block)))
    .map((block: Record<string, unknown>) =>
      String(block.id || kanbanBlockTitle(block)),
    )
  const roots = startIds.length
    ? startIds
    : visible
        .filter(
          (block: Record<string, unknown>) =>
            !incoming.has(String(block.id || '')),
        )
        .map((block: Record<string, unknown>) =>
          String(block.id || kanbanBlockTitle(block)),
        )

  const orderedIds: string[] = []
  const seen = new Set<string>()
  const queue = [...roots]
  while (queue.length) {
    const id = queue.shift() as string
    if (!id || seen.has(id) || !byId.has(id)) continue
    seen.add(id)
    orderedIds.push(id)
    ;(childrenByFrom.get(id) || []).forEach((next) => {
      if (!seen.has(next)) queue.push(next)
    })
  }
  visible.forEach((block: Record<string, unknown>) => {
    const id = String(block.id || kanbanBlockTitle(block))
    if (!seen.has(id)) orderedIds.push(id)
  })

  const start: KanbanColumnDef[] = []
  const middle: KanbanColumnDef[] = []
  const end: KanbanColumnDef[] = []

  orderedIds.forEach((id) => {
    const block = byId.get(id)
    if (!block) return
    const column = toColumn(block, outgoingIds)
    if (isStartType(blockTypeOf(block))) start.push(column)
    else if (column.terminal || isEndType(blockTypeOf(block))) end.push(column)
    else middle.push(column)
  })

  const defaults = [...start, ...middle, ...end]
  const cards = extractKanbanSettings(workflow)
  if (!hasKanbanCardSettings(cards)) {
    // No kanban stage colors configured — cycle project color codes so
    // columns are visually distinct instead of all primary.
    return defaults.map((column, index) => ({
      ...column,
      color: KANBAN_CARD_COLORS[index % KANBAN_CARD_COLORS.length].id,
    }))
  }
  const resolveBlock = (token: string) => {
    if (byId.has(token)) return byId.get(token)
    const wanted = normalizeKanbanLabel(token)
    if (!wanted) return undefined
    return visible.find((block: Record<string, unknown>) => {
      const id = String(block.id || '')
      const name = kanbanBlockTitle(block)
      return (
        normalizeKanbanLabel(id) === wanted ||
        normalizeKanbanLabel(name) === wanted
      )
    })
  }

  const configured: KanbanColumnDef[] = []
  const configuredEnd: KanbanColumnDef[] = []

  cards.forEach((card) => {
    const stages: KanbanStageGroup[] = []
    const used = new Set<string>()
    card.nodeIds.forEach((token) => {
      const block = resolveBlock(token)
      if (!block) return
      const column = toColumn(block, outgoingIds)
      if (used.has(column.id)) return
      used.add(column.id)
      stages.push({
        id: column.id,
        name: column.name,
        terminal: column.terminal,
      })
    })
    if (!stages.length) return
    const terminal = stages.every((stage) => stage.terminal)
    const column: KanbanColumnDef = {
      color: card.color,
      id: card.id,
      name: card.name,
      role: terminal ? 'success' : 'review',
      stages,
      terminal,
    }
    if (terminal) configuredEnd.push(column)
    else configured.push(column)
  })

  return configured.length || configuredEnd.length
    ? [...configured, ...configuredEnd]
    : defaults
}

export const matchKanbanColumnIndex = (
  item: Record<string, unknown>,
  columns: KanbanColumnDef[],
) => {
  const activityId = itemActivityId(item)
  if (activityId) {
    const byId = columns.findIndex(
      (column) =>
        column.id === activityId ||
        column.stages.some((stage) => stage.id === activityId),
    )
    if (byId >= 0) return byId
  }

  const stage = normalizeKanbanLabel(itemStageLabel(item))
  if (!stage) return -1
  const exact = columns.findIndex((column) => {
    if (normalizeKanbanLabel(column.name) === stage) return true
    return column.stages.some(
      (entry) => normalizeKanbanLabel(entry.name) === stage,
    )
  })
  if (exact >= 0) return exact
  return columns.findIndex((column) => {
    const name = normalizeKanbanLabel(column.name)
    if (name.includes(stage) || stage.includes(name)) return true
    return column.stages.some((entry) => {
      const entryName = normalizeKanbanLabel(entry.name)
      return entryName.includes(stage) || stage.includes(entryName)
    })
  })
}

const ruleFromId = (rule: Record<string, unknown>) =>
  String(rule.fromBlockId || rule.from || rule.source || '')

const ruleToId = (rule: Record<string, unknown>) =>
  String(rule.toBlockId || rule.to || rule.target || '')

const collectIdsForToken = (
  token: string,
  blocks: Record<string, unknown>[],
  columns: KanbanColumnDef[],
) => {
  const ids = new Set<string>()
  if (!token) return ids
  ids.add(token)
  const wanted = normalizeKanbanLabel(token)

  columns.forEach((column) => {
    const matchesColumn =
      column.id === token ||
      normalizeKanbanLabel(column.name) === wanted ||
      column.stages.some(
        (stage) =>
          stage.id === token || normalizeKanbanLabel(stage.name) === wanted,
      )
    if (!matchesColumn) return
    ids.add(column.id)
    column.stages.forEach((stage) => {
      ids.add(stage.id)
    })
  })

  blocks.forEach((block) => {
    const id = String(block.id || '')
    const name = kanbanBlockTitle(block)
    if (
      id === token ||
      name === token ||
      (wanted &&
        (normalizeKanbanLabel(id) === wanted ||
          normalizeKanbanLabel(name) === wanted))
    ) {
      if (id) ids.add(id)
    }
  })

  return ids
}

export const resolveKanbanActivityId = (
  item: Record<string, unknown>,
  workflow: WorkflowOption | null,
) => {
  const direct = itemActivityId(item)
  if (direct) return direct
  const label = itemStageLabel(item)
  if (!label) return ''
  const { blocks } = extractWorkflowGraph(workflow)
  const wanted = normalizeKanbanLabel(label)
  const block = blocks.find(
    (entry: Record<string, unknown>) =>
      normalizeKanbanLabel(kanbanBlockTitle(entry)) === wanted,
  )
  return block ? String(block.id || '') : ''
}

export const findMoveRule = (
  workflow: WorkflowOption | null,
  fromColumnId: string,
  toColumnId: string,
) => {
  if (!fromColumnId || !toColumnId) return null
  const { blocks, rules } = extractWorkflowGraph(workflow)
  if (!rules.length) return null
  const columns = buildKanbanColumns(workflow)
  const fromIds = collectIdsForToken(fromColumnId, blocks, columns)
  const toIds = collectIdsForToken(toColumnId, blocks, columns)

  const matches = rules.filter((rule: Record<string, unknown>) => {
    const from = ruleFromId(rule)
    const to = ruleToId(rule)
    if (!from || !to || from === to) return false
    return fromIds.has(from) && toIds.has(to)
  })

  if (!matches.length) return null
  const exactTo = matches.find(
    (rule: Record<string, unknown>) => ruleToId(rule) === toColumnId,
  )
  return exactTo || matches[0]
}

export const isKanbanReturnAction = (action: string) =>
  /^(reject|reply|return|sendback|send_back|terminate)$/i.test(
    String(action || '').replace(/[\s_-]+/g, ''),
  )

const parseItemFormModel = (item: Record<string, unknown>) => {
  const model: Record<string, unknown> = {}
  const assign = (source: unknown) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return
    Object.entries(source as Record<string, unknown>).forEach(
      ([key, value]) => {
        if (value === undefined) return
        model[key] = value
      },
    )
  }

  const raw = item.formData
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      assign(parsed?.fields || parsed)
    } catch {
      // ignore
    }
  } else if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    assign(record.fields || record)
  }

  assign(item.fields)
  assign(item)
  return model
}

const fieldValue = (
  model: Record<string, unknown>,
  field: Record<string, any>,
) => {
  const keys = [
    field.id,
    field.jsonId,
    field.name,
    field.label,
    field.columnName,
  ]
  for (const key of keys) {
    if (key == null || key === '') continue
    if (model[String(key)] !== undefined) return model[String(key)]
  }
  const wanted = normalizeKanbanLabel(field.label || field.name)
  if (wanted) {
    const match = Object.keys(model).find(
      (key) => normalizeKanbanLabel(key) === wanted,
    )
    if (match) return model[match]
  }
  return undefined
}

export type KanbanMissingField = {
  id: string
  label: string
}

export const getKanbanMissingRequiredFields = (
  item: Record<string, unknown>,
  workflow: WorkflowOption | null,
  activityId: string,
): KanbanMissingField[] => {
  const form = resolveFormJson(workflow)
  const panels = getFormPanels(form)
  const allFields = panels.flatMap((panel: any) => panel.fields || [])
  const byId = new Map(allFields.map((field: any) => [String(field.id), field]))

  const block = extractBlocks(workflow).find(
    (itemBlock: { id?: string }) => String(itemBlock.id || '') === activityId,
  ) as Record<string, unknown> | undefined
  const settings =
    block?.settings && typeof block.settings === 'object'
      ? (block.settings as Record<string, unknown>)
      : {}
  const extraIds = Array.isArray(settings.mandatoryFields)
    ? settings.mandatoryFields.map(String)
    : []

  const required: any[] = []
  extraIds.forEach((id) => {
    const field = byId.get(id)
    if (field) required.push(field)
  })

  const skipFormRequired = isStartType(blockTypeOf(block || {}))
  if (!skipFormRequired) {
    allFields.forEach((field: any) => {
      if (isFieldHidden(field) || !isFieldRequired(field)) return
      if (
        required.some((entry: any) => String(entry.id) === String(field.id))
      ) {
        return
      }
      required.push(field)
    })
  }

  const model = parseItemFormModel(item)
  const missing: KanbanMissingField[] = []
  const seen = new Set<string>()

  required.forEach((field: any) => {
    const id = String(field.id || '')
    if (!id || seen.has(id)) return
    if (isFieldFilled(field, fieldValue(model, field))) return
    seen.add(id)
    missing.push({
      id,
      label: String(
        field.label || field.name || field.settings?.general?.label || id,
      ),
    })
  })

  extraIds.forEach((id) => {
    if (seen.has(id) || byId.has(id)) return
    const value = model[id]
    if (value !== undefined && value !== null && String(value).trim() !== '')
      return
    seen.add(id)
    missing.push({ id, label: id })
  })

  return missing
}

export const isKanbanMissingMatch = (ids: string[], ...keys: unknown[]) => {
  if (!ids?.length) return false
  const wanted = new Set(ids.map(normalizeKanbanLabel).filter(Boolean))
  return keys.some((key) => {
    const text = String(key || '').trim()
    if (!text) return false
    if (ids.includes(text)) return true
    return wanted.has(normalizeKanbanLabel(text))
  })
}

export const itemInstanceId = (item: Record<string, unknown>) =>
  textOf(
    item.workflowInstanceId || item.instanceId || item.processId || item.id,
  )
