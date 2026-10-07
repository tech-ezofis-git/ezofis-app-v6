import { useEffect, useMemo, useState } from 'react'
import { getRepositoryById } from '@/api/v6/folder/folder'
import {
  collectMentionedFieldValues,
  collectRedactValues,
  fieldKeysMatch,
  normalizeFieldKey,
  selectedFieldsIncludeOrg,
} from '@/components/common/document-preview/pii'
import {
  emptyFolderPiiSettings,
  type FolderPiiSettings,
  resolveFolderPiiSettings,
} from '@/pages/folders/utils/folderPiiSettings'

type RepoField = { id?: string | number; name?: string }

const toDisplay = (value: unknown) => String(value ?? '').trim()

/** Resolve selected labels (or legacy ids) into normalized field-name keys. */
const buildPiiFieldNameSet = (
  settings: FolderPiiSettings,
  repoFields: RepoField[],
) => {
  if (!settings.enabled) return new Set<string>()
  const selected = settings.fieldIds
    .map((raw) => String(raw || '').trim())
    .filter(Boolean)
  if (selected.length === 0) return new Set<string>()

  const out = new Set<string>()
  for (const entry of selected) {
    out.add(normalizeFieldKey(entry))
    const byId = repoFields.find((field) => String(field.id) === entry)
    if (byId?.name) out.add(normalizeFieldKey(String(byId.name)))
    for (const field of repoFields) {
      const nameKey = normalizeFieldKey(String(field.name || ''))
      if (!nameKey) continue
      if (fieldKeysMatch(normalizeFieldKey(entry), nameKey)) {
        out.add(nameKey)
      }
    }
  }
  return new Set([...out].filter(Boolean))
}

/**
 * Loads folder PII settings for a repository and builds viewer redact values
 * from a form/metadata model. Used by folder details and request viewers.
 */
export const useFolderPiiRedaction = (
  repositoryId: string | number | undefined | null,
  valueSource?: Record<string, any> | null,
) => {
  const [folderPiiSettings, setFolderPiiSettings] = useState<FolderPiiSettings>(
    emptyFolderPiiSettings,
  )
  const [piiRepositoryFields, setPiiRepositoryFields] = useState<RepoField[]>(
    [],
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const id = String(repositoryId || '').trim()
      if (!id) {
        setFolderPiiSettings(emptyFolderPiiSettings())
        setPiiRepositoryFields([])
        return
      }
      try {
        const response = await getRepositoryById(id)
        if (cancelled) return
        const details =
          response.data && typeof response.data === 'object'
            ? (response.data as Record<string, unknown>)
            : null
        setFolderPiiSettings(resolveFolderPiiSettings(id, details))
        setPiiRepositoryFields(
          Array.isArray(details?.fields) ? (details.fields as RepoField[]) : [],
        )
      } catch {
        if (!cancelled) {
          setFolderPiiSettings(resolveFolderPiiSettings(id, null))
          setPiiRepositoryFields([])
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [repositoryId])

  const enablePiiRedaction = folderPiiSettings.enabled
  const level = folderPiiSettings.level
  // low = selected field values only; medium = + regex; high = + NER
  const piiKnownOnly = enablePiiRedaction && level === 'low'
  const enablePiiNer = enablePiiRedaction && level === 'high'

  const piiFieldNameSet = useMemo(
    () => buildPiiFieldNameSet(folderPiiSettings, piiRepositoryFields),
    [folderPiiSettings, piiRepositoryFields],
  )

  const piiBoostOrg =
    enablePiiRedaction &&
    (level === 'high' ||
      (level === 'medium' && selectedFieldsIncludeOrg(piiFieldNameSet)))

  const piiRedactValues = useMemo(() => {
    if (!enablePiiRedaction) return []
    const selectedLabels = new Set(
      folderPiiSettings.fieldIds.map((label) => String(label).trim()).filter(Boolean),
    )
    if (selectedLabels.size === 0 && piiFieldNameSet.size === 0) {
      return collectRedactValues(valueSource)
    }

    const rows: { label?: string; value?: unknown }[] = []
    for (const [key, value] of Object.entries(valueSource || {})) {
      rows.push({ label: key, value })
    }

    const mentioned = collectMentionedFieldValues(
      rows,
      piiFieldNameSet,
      toDisplay,
    )
    const seen = new Set(mentioned.map((value) => value.toLowerCase()))
    const merged = [...mentioned]
    for (const [key, value] of Object.entries(valueSource || {})) {
      const raw = toDisplay(value)
      if (!raw || raw === '-' || seen.has(raw.toLowerCase())) continue
      if (
        selectedLabels.has(String(key).trim()) ||
        [...piiFieldNameSet].some((fieldKey) =>
          fieldKeysMatch(fieldKey, normalizeFieldKey(key)),
        )
      ) {
        seen.add(raw.toLowerCase())
        merged.push(raw)
      }
    }
    // Medium/high still merge heuristic probes; low stays on mentioned values.
    if (level !== 'low') {
      for (const value of collectRedactValues(valueSource)) {
        if (seen.has(value.toLowerCase())) continue
        seen.add(value.toLowerCase())
        merged.push(value)
      }
    }
    return merged.length > 0 ? merged : collectRedactValues(valueSource)
  }, [
    enablePiiRedaction,
    folderPiiSettings.fieldIds,
    level,
    piiFieldNameSet,
    valueSource,
  ])

  const shouldMaskFieldLabel = (label: string | null | undefined) => {
    if (!enablePiiRedaction || piiFieldNameSet.size === 0) return false
    const labelKey = normalizeFieldKey(String(label || ''))
    return [...piiFieldNameSet].some((key) => fieldKeysMatch(key, labelKey))
  }

  return {
    enablePiiNer,
    enablePiiRedaction,
    folderPiiSettings,
    piiBoostOrg,
    piiFieldNameSet,
    piiKnownOnly,
    piiRedactValues,
    shouldMaskFieldLabel,
  }
}

export default useFolderPiiRedaction
