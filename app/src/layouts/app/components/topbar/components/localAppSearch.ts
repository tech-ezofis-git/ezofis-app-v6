import { queryClient } from '@/lib/tanstack-query/queryClient'
import { getFolderContextFilters } from '@/pages/folders/api/folderApi'
import { getFolderExplorerSearchSnapshot } from '@/pages/folders/stores/folderExplorerSearchCache'
import type { TreeNode } from '@/pages/folders/types/folderTypes'
import {
  getFileId,
  getRepositoryIdFromFolder,
} from '@/pages/folders/utils/folderExplorerUtils'
import requestStore from '@/pages/requests/stores/useRequestStore'
import {
  filterCachedGlobalSearchHits,
  getCachedHitsForQuery,
  getSearchHitTitle,
  type GlobalSearchHit,
} from './globalSearchApi'

export type LocalSearchSource =
  | 'api-cache'
  | 'repository'
  | 'workflow'
  | 'form'
  | 'request'
  | 'document'

const normalizeNeedle = (query: string) =>
  String(query || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const matchesQuery = (haystack: string, query: string) => {
  const needle = normalizeNeedle(query)
  if (!needle) return false
  const text = String(haystack || '').toLowerCase()
  const tokens = needle.split(/\s+/).filter(Boolean)
  return tokens.every((token) => {
    if (text.includes(token)) return true
    const compactToken = token.replace(/[^a-z0-9]/g, '')
    const compactText = text.replace(/[^a-z0-9]/g, '')
    return Boolean(compactToken) && compactText.includes(compactToken)
  })
}

const flattenText = (value: unknown, depth = 0): string => {
  if (value == null || depth > 3) return ''
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map((item) => flattenText(item, depth + 1)).join(' ')
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map((item) => flattenText(item, depth + 1))
      .join(' ')
  }
  return ''
}

const hitKey = (hit: GlobalSearchHit) =>
  [
    hit.type,
    hit.id?.itemId,
    hit.id?.formEntryId,
    hit.id?.formId,
    hit.id?.instanceId,
    hit.id?.workflowId,
    hit.id?.repositoryId,
    hit.entity_id,
    getSearchHitTitle(hit),
  ]
    .filter(Boolean)
    .join('::')

const SKIP_MATCH_KEYS = new Set(
  [
    'id',
    'uid',
    'itemid',
    'fileid',
    'documentid',
    'repositoryid',
    'workflowid',
    'instanceid',
    'processid',
    'formentryid',
    'formid',
    'masterformid',
    'workspaceid',
    'transactionid',
    'activityid',
    'createdat',
    'createdatutc',
    'modifiedat',
    'modifiedatutc',
    'dateandtime',
    'modifieddateandtime',
    'fileurl',
    'url',
    'iconkey',
    'badges',
    'found',
    'needles',
    'matchsource',
    'metadata',
  ].map((k) => k.toLowerCase()),
)

const humanizeField = (key: string) =>
  String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_./-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Known AP form control jsonIds → UI labels (when workflow formJson is cold). */
const KNOWN_FORM_FIELD_LABELS: Record<string, string> = {
  '9F6tPVHoRnmONGx3kYJu2': 'Invoice Date',
  BsPnOsYv6F1fbzWsTpXCW: 'Payment Terms',
  RXwLGHILLrreMmRqlk9mj: 'PO Number',
  WksH1Mrs42X4J9AHgoBtw: 'Invoice Amount',
  kvcYuknkDumkTenjvrVLj: 'Invoice No',
  suyqsm0SYii_8vsj4p0c_: 'Invoice Amount',
  'UtfgJy6Z0qyfRC5Bclf-c': 'Supplier Name',
  UtfgJy6Z0qyfRC5Bclf_c: 'Supplier Name',
  '792IWMnNXLKyfXjCGcowU': 'Due Date',
  kjQFGFMRYBzLnAz9Yrx_c: 'Due Date',
  'vxnKCXsXkz8_acPogKe': 'Payment Terms',
  'vxnKCXs-Xkz8_acPog-Ke': 'Payment Terms',
}

const looksLikeJsonId = (key: string) => {
  const text = String(key || '').trim()
  if (!text || /\s/.test(text) || text.length < 10 || text.length > 40) {
    return false
  }
  // Nanoid-like control ids (e.g. kvcYuknkDumkTenjvrVLj) — not human labels.
  return /^[A-Za-z0-9_-]+$/.test(text) && /[A-Z]/.test(text) && /[a-z]/.test(text)
}

let cachedFieldMetaMap: Map<string, string> | null = null
let cachedFieldMetaWorkflowId: string | null = null

function parseWorkflowFormJson(raw: unknown): Record<string, any> | null {
  if (!raw) return null
  if (typeof raw === 'object') return raw as Record<string, any>
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, any>
    } catch {
      return null
    }
  }
  return null
}

function getRequestFieldLabelMap() {
  const state = requestStore.getState()
  const workflow = state.selectedWorkflow || state.rawWorkflowData
  const workflowId = String(
    state.selectedWorkflowId || workflow?.id || workflow?.workflowId || '',
  )
  if (cachedFieldMetaMap && cachedFieldMetaWorkflowId === workflowId) {
    return cachedFieldMetaMap
  }

  const map = new Map<string, string>()
  const form = parseWorkflowFormJson(workflow?.formJson)
  const register = (key: unknown, label: string) => {
    const id = String(key || '').trim()
    if (!id || !label) return
    map.set(id, label)
    map.set(id.toLowerCase(), label)
  }

  const addControl = (control: any) => {
    if (!control) return
    const type = String(control.type || control.control || '').toUpperCase()
    if (type === 'DIVIDER' || type === 'LABEL' || type === 'PARAGRAPH') return
    if (type === 'MATRIX' || control.matrixTypeSettings) return
    const label = String(control.label || control.name || '').trim()
    if (!label) return
    register(control.jsonId, label)
    register(control.id, label)
    register(control.name, label)
  }

  if (form) {
    const lists = [
      form.controlList,
      form.controllist,
      ...(Array.isArray(form.panels) ? form.panels : []),
      ...(Array.isArray(form.secondaryPanels) ? form.secondaryPanels : []),
    ]
    for (const entry of lists) {
      if (Array.isArray(entry)) {
        entry.forEach(addControl)
        continue
      }
      if (!entry || typeof entry !== 'object') continue
      const panel = entry as Record<string, unknown>
      ;[
        panel.controlList,
        panel.controllist,
        panel.fields,
      ].forEach((list) => {
        if (Array.isArray(list)) list.forEach(addControl)
      })
    }
  }

  cachedFieldMetaMap = map
  cachedFieldMetaWorkflowId = workflowId
  return map
}

function resolveDisplayFieldLabel(key: string): string {
  const raw = String(key || '').trim()
  if (!raw) return raw

  const known =
    KNOWN_FORM_FIELD_LABELS[raw] ||
    KNOWN_FORM_FIELD_LABELS[raw.replace(/-/g, '_')] ||
    KNOWN_FORM_FIELD_LABELS[raw.replace(/_/g, '-')]
  if (known) return known === 'Invoice Number' ? 'Invoice No' : known

  const schemaMap = getRequestFieldLabelMap()
  const fromSchema =
    schemaMap.get(raw) ||
    schemaMap.get(raw.toLowerCase()) ||
    ''
  if (fromSchema && !looksLikeJsonId(fromSchema)) {
    return fromSchema === 'Invoice Number' ? 'Invoice No' : fromSchema
  }

  // Never show camel-split gibberish for control ids.
  if (looksLikeJsonId(raw)) return 'Value'
  return humanizeField(raw)
}

/** Remap formData.fields from jsonId keys → proper labels like "Invoice No". */
function labelFormFieldRecord(
  fields: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!fields) return {}
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    const label = resolveDisplayFieldLabel(key)
    if (label === 'Value' && looksLikeJsonId(key)) continue
    if (out[label] == null) out[label] = value
  }
  return out
}

const queryNeedles = (query: string) =>
  normalizeNeedle(query).split(/\s+/).filter(Boolean)

type FoundMatch = {
  field: string
  kind?: string
  value: string
}

/** Find concrete field/value pairs that matched the query (never "local-cache"). */
function findMatchedFields(
  source: Record<string, unknown> | null | undefined,
  query: string,
  out: FoundMatch[] = [],
  depth = 0,
): FoundMatch[] {
  if (!source || depth > 2) return out

  for (const [key, raw] of Object.entries(source)) {
    if (!key || SKIP_MATCH_KEYS.has(key.toLowerCase())) continue
    if (raw == null) continue

    if (typeof raw === 'object' && !Array.isArray(raw)) {
      findMatchedFields(raw as Record<string, unknown>, query, out, depth + 1)
      continue
    }

    const value = Array.isArray(raw)
      ? flattenText(raw).trim()
      : String(raw).trim()
    if (!value || value.length > 240) continue

    // Prefer fields whose value itself contains the query tokens.
    if (matchesQuery(value, query)) {
      const field = resolveDisplayFieldLabel(key)
      if (field === 'Value' && looksLikeJsonId(key)) {
        // Skip unresolved control ids — avoid gibberish labels.
        continue
      }
      if (
        !out.some(
          (item) =>
            item.field.toLowerCase() === field.toLowerCase() &&
            item.value.toLowerCase() === value.toLowerCase(),
        )
      ) {
        out.push({ field, kind: 'field', value })
      }
    }
  }

  return out
}

function withMatchHints(
  hit: GlobalSearchHit,
  query: string,
  sources: Array<Record<string, unknown> | null | undefined>,
  fallback?: { field: string; value: string },
): GlobalSearchHit {
  const needles = queryNeedles(query)
  const found: FoundMatch[] = []
  for (const source of sources) {
    findMatchedFields(source, query, found)
  }

  if (!found.length && fallback?.value && matchesQuery(fallback.value, query)) {
    found.push({
      field: fallback.field,
      kind: 'field',
      value: fallback.value,
    })
  }

  const rankMatch = (item: FoundMatch) => {
    const key = item.field.toLowerCase()
    if (
      (key.includes('invoice') &&
        (key.includes('no') || key.includes('number'))) ||
      key === 'invoice no'
    ) {
      return 0
    }
    if (
      key.includes('supplier') ||
      key.includes('vendor') ||
      key.includes('customer') ||
      key.includes('company')
    ) {
      return 1
    }
    if (key.includes('po') && key.includes('number')) return 2
    if (key.includes('name') || key.includes('title')) return 3
    if (key.includes('request') || key.includes('invoice')) return 4
    return 5
  }

  found.sort((a, b) => rankMatch(a) - rankMatch(b))

  return {
    ...hit,
    found: found.length ? found.slice(0, 3) : hit.found,
    // Preserve matchSource if it was in the local cache
    matchSource: hit.matchSource,
    needles: needles.length ? needles : hit.needles,
  }
}

const withSourceBadge = (
  hit: GlobalSearchHit,
  source: LocalSearchSource,
): GlobalSearchHit => {
  // Document type is shown as "Updated from Document" in the UI, not a capsule.
  if (source === 'document') {
    return {
      ...hit,
      badges: (hit.badges || []).filter(
        (b) => b.label.toLowerCase() !== 'document',
      ),
      line: hit.line || 'Updated from Document',
    }
  }

  const label =
    source === 'repository'
      ? 'Folder'
      : source === 'workflow'
        ? 'Workflow'
        : source === 'form'
          ? 'Form'
          : source === 'request'
            ? 'Request'
            : 'Search'
  const badges = [
    ...(hit.badges || []).filter((b) => b.label !== label),
    { label, tone: 'default' as const },
  ]
  return { ...hit, badges }
}

/** Deduplicate hits, preferring earlier lists (API cache first). */
export function mergeSearchHits(
  ...lists: Array<GlobalSearchHit[] | null | undefined>
): GlobalSearchHit[] {
  const merged = new Map<string, GlobalSearchHit>()
  for (const list of lists) {
    for (const hit of list || []) {
      const key = hitKey(hit)
      if (!merged.has(key)) merged.set(key, hit)
    }
  }
  return Array.from(merged.values())
}

function harvestRepositories(query: string): GlobalSearchHit[] {
  const hits: GlobalSearchHit[] = []
  const seen = new Set<string>()

  const pushRepo = (id: string, name: string) => {
    const repositoryId = String(id || '').trim()
    const repositoryName = String(name || '').trim() || 'Folder'
    if (!repositoryId || seen.has(repositoryId)) return
    if (!matchesQuery(`${repositoryName} ${repositoryId}`, query)) return
    seen.add(repositoryId)
    hits.push(
      withSourceBadge(
        {
          description: 'Repository / folder',
          entity_id: repositoryId,
          entity_name: repositoryName,
          entity_type: 'repository',
          folder: repositoryName,
          id: {
            repositoryId,
            repositoryName,
          },
          name: repositoryName,
          title: repositoryName,
          type: 'repository',
        },
        'repository',
      ),
    )
  }

  const repos =
    (queryClient.getQueryData(['folders', 'repositories']) as
      | Array<{ id?: string; name?: string }>
      | undefined) || []
  for (const repo of repos) {
    pushRepo(String(repo.id || ''), String(repo.name || ''))
  }

  // Also harvest tree roots from the live Folders explorer snapshot.
  const snap = getFolderExplorerSearchSnapshot()
  const walkTree = (nodes: TreeNode[]) => {
    for (const node of nodes || []) {
      if (!node?.isStatic) {
        const repoId =
          getRepositoryIdFromFolder(node.id) ||
          String((node as any).repositoryId || '')
        if (repoId) pushRepo(repoId, String(node.title || ''))
        else if (matchesQuery(String(node.title || ''), query)) {
          hits.push(
            withSourceBadge(
              {
                description: 'Folder',
                entity_id: String(node.id || ''),
                entity_name: String(node.title || 'Folder'),
                entity_type: 'folder',
                folder: String(node.title || ''),
                id: {
                  repositoryId: snap.repositoryId || undefined,
                  repositoryName: String(node.title || ''),
                },
                name: String(node.title || 'Folder'),
                title: String(node.title || 'Folder'),
                type: 'folder',
              },
              'repository',
            ),
          )
        }
      }
      if (Array.isArray(node.children) && node.children.length) {
        walkTree(node.children)
      }
    }
  }
  walkTree(snap.tree || [])

  // Current browse path / child folders (e.g. "APEX INDUSTRIAL COMPONENTS LTD")
  const contextFilters =
    snap.contextFilters || getFolderContextFilters(snap.activeFolder)
  const contextText = Object.values(contextFilters).join(' ')
  if (
    snap.activeFolder &&
    matchesQuery(
      `${snap.repositoryName || ''} ${contextText} ${snap.activeFolder}`,
      query,
    )
  ) {
    const label =
      Object.values(contextFilters).filter(Boolean).slice(-1)[0] ||
      snap.repositoryName ||
      'Folder'
    hits.push(
      withSourceBadge(
        {
          description:
            Object.entries(contextFilters)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ') || 'Folder',
          entity_id: snap.activeFolder,
          entity_name: String(label),
          entity_type: 'folder',
          folder: String(label),
          id: {
            repositoryId: snap.repositoryId || undefined,
            repositoryName: snap.repositoryName || String(label),
          },
          name: String(label),
          title: String(label),
          type: 'folder',
        },
        'repository',
      ),
    )
  }

  for (const folder of snap.folders || []) {
    const title = String(
      (folder as any).title || (folder as any).name || '',
    )
    const id = String((folder as any).id || '')
    if (!title && !id) continue
    if (!matchesQuery(`${title} ${id} ${contextText}`, query)) continue
    hits.push(
      withSourceBadge(
        {
          description: 'Folder',
          entity_id: id || title,
          entity_name: title || 'Folder',
          entity_type: 'folder',
          folder: title,
          id: {
            repositoryId: snap.repositoryId || undefined,
            repositoryName: snap.repositoryName || title,
          },
          name: title || 'Folder',
          title: title || 'Folder',
          type: 'folder',
        },
        'repository',
      ),
    )
  }

  return hits
}

const getPrimaryFileName = (file: Record<string, any>) => {
  const direct =
    file?.fileName ??
    file?.FileName ??
    file?.name ??
    file?.Name ??
    file?.InvoiceNumber ??
    file?.invoiceNumber ??
    file?.InvoiceNo ??
    file?.invoiceNo ??
    file?.DocumentName ??
    file?.documentName
  if (direct != null && String(direct).trim()) return String(direct)
  return getFileId(file) || 'Document'
}

function harvestExplorerDocuments(query: string): GlobalSearchHit[] {
  const snap = getFolderExplorerSearchSnapshot()
  const contextFilters =
    snap.contextFilters || getFolderContextFilters(snap.activeFolder)
  const contextText = Object.entries(contextFilters)
    .map(([k, v]) => `${k} ${v}`)
    .join(' ')
  const repoId =
    snap.repositoryId || getRepositoryIdFromFolder(snap.activeFolder) || ''
  const files = mergeUniqueFiles(snap.files || [], snap.recentFiles || [])
  const hits: GlobalSearchHit[] = []
  const seen = new Set<string>()

  for (const file of files) {
    const itemId = getFileId(file)
    if (!itemId || seen.has(itemId)) continue
    const title = getPrimaryFileName(file)
    const haystack = [
      title,
      flattenText(file),
      contextText,
      snap.repositoryName,
      repoId,
    ].join(' ')
    if (!matchesQuery(haystack, query)) continue
    seen.add(itemId)

    hits.push(
      withSourceBadge(
        withMatchHints(
          {
            description:
              Object.entries(contextFilters)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ') ||
              snap.repositoryName ||
              'Document',
            entity_id: itemId,
            entity_name: title,
            entity_type: 'document',
            folder: snap.repositoryName || undefined,
            id: {
              itemId,
              repositoryId: repoId || undefined,
              repositoryName: snap.repositoryName || undefined,
            },
            ifileName: title,
            name: title,
            title,
            type: 'document',
          },
          query,
          [contextFilters, file as Record<string, unknown>],
          { field: 'Name', value: title },
        ),
        'document',
      ),
    )
  }

  return hits
}

function mergeUniqueFiles(
  current: Array<Record<string, any>>,
  recent: Array<Record<string, any>>,
) {
  const map = new Map<string, Record<string, any>>()
  for (const file of [...recent, ...current]) {
    const id = getFileId(file)
    if (id) map.set(id, file)
  }
  return Array.from(map.values())
}

function harvestWorkflows(query: string): GlobalSearchHit[] {
  const hits: GlobalSearchHit[] = []
  const queries = queryClient.getQueriesData({ queryKey: ['workflows', 'all'] })

  for (const [, data] of queries) {
    const groups = Array.isArray((data as any)?.data)
      ? ((data as any).data as Array<{ value?: any[] }>)
      : []
    const rows = groups.flatMap((group) =>
      Array.isArray(group?.value) ? group.value : [],
    )

    for (const row of rows) {
      const id = String(row?.id || '')
      const name = String(row?.name || row?.title || 'Workflow')
      const description = String(row?.description || '')
      const status = String(row?.flowStatus || row?.status || '')
      if (!id) continue
      if (!matchesQuery(`${name} ${description} ${status} ${id}`, query)) continue

      hits.push(
        withSourceBadge(
          {
            description: description || status || 'Workflow',
            entity_id: id,
            entity_name: name,
            entity_type: 'workflow',
            id: {
              workflowId: id,
              workflowName: name,
            },
            name,
            title: name,
            type: 'workflow',
          },
          'workflow',
        ),
      )
    }
  }

  // Single workflow detail caches.
  for (const [key, data] of queryClient.getQueriesData({
    queryKey: ['workflows'],
  })) {
    if (!Array.isArray(key) || key[1] === 'all' || !data) continue
    const workflow = (data as any)?.data || data
    const id = String(workflow?.id || key[1] || '')
    const name = String(workflow?.name || workflow?.workflowName || 'Workflow')
    if (!id || id === 'all') continue
    if (!matchesQuery(`${name} ${id}`, query)) continue
    hits.push(
      withSourceBadge(
        {
          description: 'Workflow',
          entity_id: id,
          entity_name: name,
          entity_type: 'workflow',
          id: { workflowId: id, workflowName: name },
          name,
          title: name,
          type: 'workflow',
        },
        'workflow',
      ),
    )
  }

  return hits
}

function parseFormJson(row: any): Record<string, any> | null {
  const raw = row?._json ?? row?.formJson
  if (!raw) return null
  if (typeof raw === 'object') return raw as Record<string, any>
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, any>
    } catch {
      return null
    }
  }
  return null
}

/** Deep walk like FormsPage.findDeepData — list API returns `{ data, error }`. */
function findDeepFormList(obj: unknown): any[] | null {
  if (Array.isArray(obj)) return obj
  if (!obj || typeof obj !== 'object') return null
  const record = obj as Record<string, unknown>
  if (record.data) {
    const nested = findDeepFormList(record.data)
    if (nested) return nested
  }
  if (record.value) {
    const nested = findDeepFormList(record.value)
    if (nested) return nested
  }
  for (const key of Object.keys(record)) {
    if (key === 'data' || key === 'value' || key === 'error' || key === 'meta') {
      continue
    }
    if (typeof record[key] === 'object') {
      const nested = findDeepFormList(record[key])
      if (nested) return nested
    }
  }
  return null
}

function extractFormRows(data: unknown): any[] {
  const rawList = findDeepFormList(data) || []
  if (!rawList.length) return []

  const first = rawList[0]
  const isGrouped =
    first &&
    typeof first === 'object' &&
    'key' in first &&
    ('value' in first || 'data' in first)

  if (isGrouped) {
    return rawList.flatMap((group: any) => {
      if (Array.isArray(group?.value)) return group.value
      if (Array.isArray(group?.data)) return group.data
      return []
    })
  }

  return rawList
}

function harvestForms(query: string): GlobalSearchHit[] {
  const hits: GlobalSearchHit[] = []
  const seen = new Set<string>()

  const pushForm = (row: any, kind?: string) => {
    const id = String(row?.uid || row?.id || row?.formId || '')
    if (!id || seen.has(id)) return
    const json = parseFormJson(row)
    const name = String(
      json?.settings?.general?.name ||
        row?.name ||
        row?.formName ||
        'Form',
    )
    const typeLabel = String(
      row?.type ||
        kind ||
        json?.settings?.general?.type ||
        row?.formKind ||
        'form',
    )
    const status = String(
      row?.publishOption ||
        json?.settings?.publish?.publishOption ||
        row?.status ||
        '',
    )
    const description = String(
      row?.description || json?.settings?.general?.description || '',
    )
    if (
      !matchesQuery(`${name} ${typeLabel} ${status} ${description} ${id}`, query)
    ) {
      return
    }
    seen.add(id)
    hits.push(
      withSourceBadge(
        withMatchHints(
          {
            description:
              [typeLabel, status].filter(Boolean).join(' · ') || 'Form',
            entity_id: id,
            entity_name: name,
            entity_type: 'form',
            formKind: typeLabel.toLowerCase().includes('master')
              ? 'master'
              : typeLabel.toLowerCase(),
            id: {
              formId: id,
              formName: name,
              masterFormId: id,
              masterFormName: name,
            },
            name,
            title: name,
            type: 'form',
          },
          query,
          [
            {
              description,
              name,
              status,
              type: typeLabel,
            },
            json?.settings?.general as Record<string, unknown> | undefined,
          ],
          { field: 'Name', value: name },
        ),
        'form',
      ),
    )
  }

  for (const [, data] of queryClient.getQueriesData({
    queryKey: ['forms', 'list'],
  })) {
    extractFormRows(data).forEach((row) => pushForm(row))
  }
  for (const [, data] of queryClient.getQueriesData({
    queryKey: ['forms', 'master-forms'],
  })) {
    extractFormRows(data).forEach((row) => pushForm(row, 'master'))
  }
  for (const [, data] of queryClient.getQueriesData({
    queryKey: ['forms', 'published-forms'],
  })) {
    extractFormRows(data).forEach((row) => pushForm(row))
  }

  // Form detail caches (single form schema).
  for (const [key, data] of queryClient.getQueriesData({
    queryKey: ['forms', 'detail'],
  })) {
    const formId = Array.isArray(key) ? String(key[2] || '') : ''
    const row = (data as any)?.data || data
    if (row && typeof row === 'object') {
      pushForm({ ...row, uid: row.uid || row.id || formId })
    }
  }

  // Form entries already loaded for a form.
  for (const [key, data] of queryClient.getQueriesData({
    queryKey: ['forms', 'entries'],
  })) {
    const formId = Array.isArray(key) ? String(key[2] || '') : ''
    const rows = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.data)
        ? (data as any).data
        : Array.isArray((data as any)?.entries)
          ? (data as any).entries
          : []
    for (const row of rows) {
      const entryId = String(row?.entryId || row?.id || '')
      if (!entryId) continue
      const valuesText = flattenText(row?.values || row)
      const title =
        String(row?.title || row?.name || '').trim() ||
        `Entry ${entryId.slice(0, 8)}`
      if (!matchesQuery(`${title} ${valuesText} ${entryId} ${formId}`, query)) {
        continue
      }
      hits.push(
        withSourceBadge(
          withMatchHints(
            {
              description: 'Form entry',
              entity_id: entryId,
              entity_name: title,
              entity_type: 'form',
              formKind: 'entry',
              id: {
                formEntryId: entryId,
                formId: formId || undefined,
                formName: title,
              },
              name: title,
              title,
              type: 'form',
            },
            query,
            [
              row as Record<string, unknown>,
              (row?.values as Record<string, unknown>) || undefined,
            ],
            { field: 'Name', value: title },
          ),
          'form',
        ),
      )
    }
  }

  return hits
}

/** Walk raw inbox API payloads (grouped `{ value: [] }` or flat items). */
function collectInboxRows(data: unknown, out: any[] = []): any[] {
  if (!data) return out
  if (Array.isArray(data)) {
    for (const item of data) collectInboxRows(item, out)
    return out
  }
  if (typeof data !== 'object') return out
  const row = data as Record<string, unknown>
  if (row.workflowInstanceId || row.processId || (row.id && row.stageType)) {
    out.push(row)
  }
  if (Array.isArray(row.value)) collectInboxRows(row.value, out)
  if (Array.isArray(row.items)) collectInboxRows(row.items, out)
  if (Array.isArray(row.data)) collectInboxRows(row.data, out)
  else if (row.data && typeof row.data === 'object') {
    collectInboxRows(row.data, out)
  }
  return out
}

function asFieldRecord(
  fields: unknown,
): Record<string, unknown> | undefined {
  if (!fields) return undefined
  if (Array.isArray(fields)) {
    const out: Record<string, unknown> = {}
    for (const item of fields) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      const key = String(row.name || row.label || row.key || row.id || '')
      if (!key) continue
      out[key] = row.value ?? row.text ?? row.displayValue
    }
    return out
  }
  if (typeof fields === 'object') return fields as Record<string, unknown>
  return undefined
}

function harvestRequests(query: string): GlobalSearchHit[] {
  const hits: GlobalSearchHit[] = []
  const seen = new Set<string>()

  for (const [key, data] of queryClient.getQueriesData({
    queryKey: ['inbox'],
  })) {
    const workflowId = Array.isArray(key) ? String(key[1] || '') : ''
    const rows = collectInboxRows(data)

    for (const row of rows) {
      const processId = String(
        row?.workflowInstanceId || row?.processId || row?.id || '',
      )
      if (!processId || seen.has(processId)) continue

      const formEntryId = row?.formEntryId
      const referenceNumber =
        row?.referenceNumber == null
          ? ''
          : String(row.referenceNumber).trim()
      const requestNo = String(
        row?.requestNo ||
          row?.documentNumber ||
          referenceNumber ||
          (formEntryId != null && formEntryId !== ''
            ? `REQ-${formEntryId}`
            : '') ||
          row?.reqNo ||
          '',
      )
      const stage = String(row?.stage || row?.stageType || '')
      const status = String(row?.status || '')
      const raisedBy = String(
        row?.raisedBy ||
          row?.transactionCreatedByEmail ||
          row?.createdBy ||
          '',
      )
      const parsedFormData =
        typeof row?.formData === 'string'
          ? (() => {
              try {
                return JSON.parse(row.formData)
              } catch {
                return null
              }
            })()
          : row?.formData
      const rawFields = asFieldRecord(
        parsedFormData?.fields || parsedFormData || row?.fields,
      )
      const labeledFields = labelFormFieldRecord(rawFields)
      const formFields = flattenText(labeledFields)
      const haystack = [
        requestNo,
        processId,
        stage,
        status,
        raisedBy,
        formFields,
        workflowId,
      ].join(' ')

      if (!matchesQuery(haystack, query)) continue
      seen.add(processId)

      const title = requestNo || `Request ${processId.slice(0, 8)}`
      hits.push(
        withSourceBadge(
          withMatchHints(
            {
              description:
                [stage, status].filter(Boolean).join(' · ') || 'Request',
              entity_id: processId,
              entity_name: title,
              entity_type: 'request',
              id: {
                instanceId: processId,
                requestNo: requestNo || undefined,
                workflowId:
                  workflowId || String(row?.workflowId || '') || undefined,
                workflowName: String(row?.workflowName || '') || undefined,
              },
              name: title,
              requestNo: requestNo || undefined,
              title,
              type: 'request',
            },
            query,
            [
              labeledFields,
              {
                raisedBy,
                requestNo,
                stage,
                status,
              },
            ],
            { field: 'Request No', value: title },
          ),
          'request',
        ),
      )
    }
  }

  return hits
}

/**
 * Search already-loaded app data from React Query caches
 * (folders, workflows, forms, requests) — not only Global Search API cache.
 */
export function searchLocalAppData(query: string): GlobalSearchHit[] {
  const needle = String(query || '').trim()
  if (!needle) return []

  return mergeSearchHits(
    harvestRepositories(needle),
    harvestExplorerDocuments(needle),
    harvestWorkflows(needle),
    harvestForms(needle),
    harvestRequests(needle),
  )
}

/**
 * Unified local search used by the Global Search dropdown:
 * Prefer live Folders/Forms/Requests/Workflows data, then API cache.
 */
export function searchAllLocalData(query: string): GlobalSearchHit[] {
  const needle = String(query || '').trim()
  if (!needle) return []

  const appLocal = searchLocalAppData(needle)
  const exactApi = getCachedHitsForQuery(needle) || []
  const fuzzyApi = filterCachedGlobalSearchHits(needle)

  return mergeSearchHits(appLocal, exactApi, fuzzyApi).map((hit) => {
    const normalizeFound = (found?: GlobalSearchHit['found']) =>
      (found || [])
        .map((item) => ({
          ...item,
          field: resolveDisplayFieldLabel(String(item.field || item.name || '')),
        }))
        .filter((item) => item.field && item.field !== 'Value')

    if (hit.found?.length) {
      return {
        ...hit,
        found: normalizeFound(hit.found),
        matchSource: hit.matchSource,
        needles: hit.needles?.length ? hit.needles : queryNeedles(needle),
      }
    }
    const enriched = withMatchHints(
      hit,
      needle,
      [
        hit as unknown as Record<string, unknown>,
        hit.metadata,
        hit.id as unknown as Record<string, unknown>,
      ],
      { field: 'Name', value: getSearchHitTitle(hit) },
    )
    return {
      ...enriched,
      found: normalizeFound(enriched.found),
    }
  })
}
