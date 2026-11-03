import { useLingui } from '@lingui/react/macro'
import { useEffect, useRef, useState } from 'react'
import {
  getDraftPiiFieldRecommendations,
  getPiiFieldRecommendations,
  getRepositoryPiiConfiguration,
  type PiiFieldDefinition,
} from '@/api/v6/folder/pii'
import showToast from '@/components/base/toast/showToast'
import usePiiAiFieldsStore from '@/pages/settings/stores/usePiiAiFieldsStore'

type PiiFieldOption = {
  fieldName: string
  id: string
}

type UsePiiAiSuggestionsArgs = {
  fields: PiiFieldOption[]
  folderDescription?: string | null
  folderName?: string | null
  repositoryId?: string | null
  /** Folder fields the AI marked sensitive; the step keeps only these as chips. */
  onFolderFieldSelection: (labels: string[]) => void
}

const toKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

/**
 * AI field suggestions for the PII Redaction step's chip box. Nothing runs until `refresh()`;
 * the result replaces the folder-field chips with the AI's choice and the previous AI-found
 * chips with the new ones. Everything stays a draft until the folder is saved.
 */
const usePiiAiSuggestions = ({
  fields,
  folderDescription,
  folderName,
  repositoryId,
  onFolderFieldSelection,
}: UsePiiAiSuggestionsArgs) => {
  const { t } = useLingui()
  const [refreshing, setRefreshing] = useState(false)
  const aiFields = usePiiAiFieldsStore((state) => state.fields)
  const id = repositoryId || null
  // Latest render's callback, so chip edits made while the agent answers are kept.
  const selectionRef = useRef(onFolderFieldSelection)
  selectionRef.current = onFolderFieldSelection

  // Load saved non-field values for this folder (a cheap GET; never calls the AI).
  useEffect(() => {
    const store = usePiiAiFieldsStore.getState()
    if (store.loaded && store.repositoryId === id) return
    store.reset(id)
    if (!id) {
      usePiiAiFieldsStore.getState().setLoaded(null, [], 0)
      return
    }
    let cancelled = false
    void getRepositoryPiiConfiguration(id).then(({ data }) => {
      if (cancelled || !data) return
      // Keep chips added while this loaded (e.g. moved from the folder-field list).
      const before = usePiiAiFieldsStore.getState()
      const pending = before.dirty ? before.fields : []
      before.setLoaded(id, data.additionalFields, data.configurationVersion)
      if (pending.length) {
        const keys = new Set(data.additionalFields.map((f) => f.fieldKey))
        usePiiAiFieldsStore
          .getState()
          .setFields([
            ...data.additionalFields,
            ...pending.filter((f) => !keys.has(f.fieldKey)),
          ])
      }
    })
    return () => {
      cancelled = true
    }
  }, [id])

  const refresh = async () => {
    const draftName = String(folderName || '').trim()
    if (!id && !draftName) {
      showToast({ message: t`Enter a folder name first.`, variant: 'warning' })
      return
    }
    setRefreshing(true)
    const { data, error } = id
      ? await getPiiFieldRecommendations(id, { regenerate: true })
      : await getDraftPiiFieldRecommendations({
          fields: fields
            .filter((field) => field.fieldName?.trim())
            .map((field) => ({ fieldName: field.fieldName.trim() })),
          folderDescription: folderDescription || null,
          folderName: draftName,
        })
    setRefreshing(false)
    if (error || !data) {
      showToast({
        message: error || t`Could not get AI suggestions.`,
        variant: 'error',
      })
      return
    }

    const fieldNames = new Map(
      fields.map((field) => [String(field.id), field.fieldName]),
    )
    const folderKeys = new Set(fields.map((field) => toKey(field.fieldName)))
    const sensitiveFolderFields = data.recommendations
      .filter((item) => item.source === 'existing_metadata')
      .map(
        (item) =>
          item.existingFieldName ||
          (item.existingFieldId && fieldNames.get(item.existingFieldId)) ||
          item.displayName,
      )
    const found: PiiFieldDefinition[] = data.recommendations
      .filter(
        (item) =>
          item.source === 'ai_inferred' && !folderKeys.has(item.fieldKey),
      )
      .map((item) => ({
        category: item.category,
        description: item.reason || null,
        detectionType: item.detectionType,
        displayName: item.displayName,
        enabled: true,
        fieldKey: item.fieldKey,
        pattern: null,
        source: 'ai_inferred',
      }))

    const store = usePiiAiFieldsStore.getState()
    const custom = store.fields.filter((field) => field.source === 'custom')
    const customKeys = new Set(custom.map((field) => field.fieldKey))
    store.setFields([
      ...custom,
      ...found.filter((field) => !customKeys.has(field.fieldKey)),
    ])
    selectionRef.current(sensitiveFolderFields)

    showToast(
      data.mode === 'ai'
        ? {
            message: t`Sensitive fields updated from the AI agent. Review them before saving.`,
            variant: 'success',
          }
        : {
            message: t`The AI model was unavailable, so standard suggestions were used.`,
            variant: 'warning',
          },
    )
  }

  const removeAiField = (fieldKey: string) => {
    const store = usePiiAiFieldsStore.getState()
    store.setFields(store.fields.filter((field) => field.fieldKey !== fieldKey))
  }

  /** A label typed with + that is not a folder field; added as the last chip. */
  const addCustomField = (label: string) => {
    const displayName = label.trim()
    const fieldKey = toKey(displayName)
    if (!displayName || !fieldKey) return
    const store = usePiiAiFieldsStore.getState()
    if (store.fields.some((field) => field.fieldKey === fieldKey)) return
    store.setFields([
      ...store.fields,
      {
        category: 'Other',
        description: null,
        detectionType: 'CONTEXTUAL',
        displayName,
        enabled: true,
        fieldKey,
        pattern: null,
        source: 'custom',
      },
    ])
  }

  return { addCustomField, aiFields, refresh, refreshing, removeAiField }
}

export default usePiiAiSuggestions
