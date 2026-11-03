import { create } from 'zustand'
import {
  type PiiFieldDefinition,
  saveRepositoryPiiConfiguration,
} from '@/api/v6/folder/pii'

/**
 * Sensitive values chosen in the PII Redaction step that are not folder fields (Aadhaar, PAN, …).
 * The folder save only accepts folder fields, so these are kept here and saved to
 * `PUT /repositories/{id}/pii/configuration` right after the folder itself saves.
 */
type PiiAiFieldsState = {
  dirty: boolean
  fields: PiiFieldDefinition[]
  loaded: boolean
  /** Folder these fields belong to; null while creating a folder. */
  repositoryId: string | null
  /** Version loaded with the fields; sent back on save (409 if someone else saved). */
  version: number
  reset: (repositoryId: string | null) => void
  setFields: (fields: PiiFieldDefinition[]) => void
  setLoaded: (
    repositoryId: string | null,
    fields: PiiFieldDefinition[],
    version: number,
  ) => void
}

const usePiiAiFieldsStore = create<PiiAiFieldsState>((set) => ({
  dirty: false,
  fields: [],
  loaded: false,
  repositoryId: null,
  version: 0,
  reset: (repositoryId) =>
    set({ dirty: false, fields: [], loaded: false, repositoryId, version: 0 }),
  setFields: (fields) => set({ dirty: true, fields }),
  setLoaded: (repositoryId, fields, version) =>
    set({ dirty: false, fields, loaded: true, repositoryId, version }),
}))

/**
 * Save pending non-field values for the folder that was just saved. Returns an error message,
 * or null when there was nothing to save or it saved.
 */
export const flushPiiAiFields = async (
  savedRepositoryId: string,
): Promise<null | string> => {
  const state = usePiiAiFieldsStore.getState()
  if (!state.dirty) return null
  // Pending edits made for another folder must not be written to this one.
  if (state.repositoryId && state.repositoryId !== savedRepositoryId) {
    return null
  }

  const { data, error } = await saveRepositoryPiiConfiguration(
    savedRepositoryId,
    {
      additionalFields: state.fields,
      configurationVersion: state.repositoryId ? state.version : 0,
    },
  )
  if (error || !data) return error || 'Could not save the AI-suggested values'
  state.setLoaded(
    savedRepositoryId,
    data.additionalFields,
    data.configurationVersion,
  )
  return null
}

export default usePiiAiFieldsStore
