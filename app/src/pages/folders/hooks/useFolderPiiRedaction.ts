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
  // When folder PII is on: always scan the file (regex + NER + OCR for
  // image/JPG PDFs) in addition to selected field values. Sidebar still
  // masks only configured field labels via shouldMaskFieldLabel.
  const enablePiiNer = enablePiiRedaction
  const piiKnownOnly = false

  const piiFieldNameSet = useMemo(() => {
    const selectedIds = new Set(
      folderPiiSettings.fieldIds.map((id) => String(id)),
    )
    if (!enablePiiRedaction || selectedIds.size === 0) {
      return new Set<string>()
    }
    return new Set(
      piiRepositoryFields
        .filter((field) => selectedIds.has(String(field.id)))
        .map((field) => normalizeFieldKey(String(field.name || '')))
        .filter(Boolean),
    )
  }, [enablePiiRedaction, folderPiiSettings.fieldIds, piiRepositoryFields])

  const piiBoostOrg =
    enablePiiRedaction && selectedFieldsIncludeOrg(piiFieldNameSet)

  const piiRedactValues = useMemo(() => {
    if (!enablePiiRedaction) return []
    const selectedIds = new Set(
      folderPiiSettings.fieldIds.map((id) => String(id)),
    )
    if (selectedIds.size === 0) {
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
    // Also pick values keyed by selected field id directly.
    const seen = new Set(mentioned.map((value) => value.toLowerCase()))
    const merged = [...mentioned]
    for (const [key, value] of Object.entries(valueSource || {})) {
      const raw = toDisplay(value)
      if (!raw || raw === '-' || seen.has(raw.toLowerCase())) continue
      if (
        selectedIds.has(String(key)) ||
        [...piiFieldNameSet].some((fieldKey) =>
          fieldKeysMatch(fieldKey, normalizeFieldKey(key)),
        )
      ) {
        seen.add(raw.toLowerCase())
        merged.push(raw)
      }
    }
    for (const value of collectRedactValues(valueSource)) {
      if (seen.has(value.toLowerCase())) continue
      seen.add(value.toLowerCase())
      merged.push(value)
    }
    return merged.length > 0 ? merged : collectRedactValues(valueSource)
  }, [
    enablePiiRedaction,
    folderPiiSettings.fieldIds,
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
