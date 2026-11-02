import axios from 'axios'
import { axiosV6 } from '../../axios'

export type PiiDetectionType =
  | 'CONTEXTUAL'
  | 'HYBRID'
  | 'METADATA'
  | 'NER'
  | 'PATTERN'

export const PII_DETECTION_TYPES: PiiDetectionType[] = [
  'PATTERN',
  'NER',
  'HYBRID',
  'CONTEXTUAL',
  'METADATA',
]

export const PII_CATEGORIES = [
  'Personal Identity',
  'Contact Information',
  'Government ID',
  'Financial',
  'Employment',
  'Health',
  'Tax',
  'Document',
  'Other',
] as const

export interface PiiFieldDefinition {
  category: string
  detectionType: PiiDetectionType
  displayName: string
  enabled: boolean
  fieldKey: string
  source: 'ai_inferred' | 'custom'
  description?: string | null
  pattern?: string | null
}

export interface PiiFieldRecommendation {
  alreadySelected: boolean
  category: string
  /** How likely documents in this folder contain the type — not a detection. */
  confidence: number
  detectionType: PiiDetectionType
  displayName: string
  existingFieldId: string | null
  fieldKey: string
  reason: string
  recommended: boolean
  source: 'ai_inferred' | 'existing_metadata'
  /** The folder field's own name for `existing_metadata` items. */
  existingFieldName?: string | null
}

export interface PiiFieldRecommendationsResult {
  folderId: string
  fromCache: boolean
  generatedAtUtc: string
  /** `fallback` when the built-in catalog answered instead of the AI model. */
  mode: 'ai' | 'fallback'
  modelVersion: string
  recommendations: PiiFieldRecommendation[]
  warnings: string[]
}

export interface RepositoryPiiConfiguration {
  additionalFields: PiiFieldDefinition[]
  configurationVersion: number
  enabled: boolean
  lastRecommendationAtUtc: string | null
  lastRecommendationModel: string | null
  repositoryId: string
  selectedFieldIds: string[]
  selectedFieldNames: string[]
  updatedAtUtc: string | null
  updatedBy: string | null
}

type ApiResult<T> = {
  data: T | null
  error: string | null
  status: number
}

const toError = <T>(err: unknown, fallback: string): ApiResult<T> => {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: string } | undefined
    return {
      data: null,
      error: body?.error || err.message || fallback,
      status: err.response?.status ?? 0,
    }
  }
  return { data: null, error: fallback, status: 0 }
}

/** Suggestions for a folder that is not saved yet (Create Folder wizard). */
export async function getDraftPiiFieldRecommendations(payload: {
  fields: { dataType?: string | null; fieldName: string }[]
  folderDescription?: string | null
  folderName: string
}): Promise<ApiResult<PiiFieldRecommendationsResult>> {
  try {
    const { data, status } = await axiosV6.post<PiiFieldRecommendationsResult>(
      '/repositories/pii/recommendations',
      { ...payload, includeContextualRecommendations: true },
      { skipCancellation: true },
    )
    return { data, error: null, status }
  } catch (err) {
    return toError(err, 'Could not get PII suggestions')
  }
}

export async function getPiiFieldRecommendations(
  repositoryId: string,
  options: {
    includeContextualRecommendations?: boolean
    regenerate?: boolean
  } = {},
): Promise<ApiResult<PiiFieldRecommendationsResult>> {
  try {
    const { data, status } = await axiosV6.post<PiiFieldRecommendationsResult>(
      `/repositories/${encodeURIComponent(repositoryId)}/pii/recommendations`,
      {
        includeContextualRecommendations:
          options.includeContextualRecommendations ?? true,
        regenerate: Boolean(options.regenerate),
      },
      { skipCancellation: true },
    )
    return { data, error: null, status }
  } catch (err) {
    return toError(err, 'Could not get PII suggestions')
  }
}

/**
 * Extra sensitive labels for document viewers (any user who can view the folder).
 * Empty when PII redaction is off or on error, so the viewer just skips label masking.
 */
export async function getPiiRedactionLabels(
  repositoryId: string,
): Promise<string[]> {
  try {
    const { data } = await axiosV6.get<{ displayName: string }[]>(
      `/repositories/${encodeURIComponent(repositoryId)}/pii/redaction-labels`,
      { skipCancellation: true },
    )
    return (Array.isArray(data) ? data : [])
      .map((item) => String(item?.displayName || '').trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

export async function getRepositoryPiiConfiguration(
  repositoryId: string,
): Promise<ApiResult<RepositoryPiiConfiguration>> {
  try {
    const { data, status } = await axiosV6.get<RepositoryPiiConfiguration>(
      `/repositories/${encodeURIComponent(repositoryId)}/pii/configuration`,
    )
    return { data, error: null, status }
  } catch (err) {
    return toError(err, 'Could not load the PII configuration')
  }
}

export async function saveRepositoryPiiConfiguration(
  repositoryId: string,
  payload: {
    additionalFields: PiiFieldDefinition[]
    configurationVersion: number
  },
): Promise<ApiResult<RepositoryPiiConfiguration>> {
  try {
    const { data, status } = await axiosV6.put<RepositoryPiiConfiguration>(
      `/repositories/${encodeURIComponent(repositoryId)}/pii/configuration`,
      payload,
    )
    return { data, error: null, status }
  } catch (err) {
    return toError(err, 'Could not save the PII configuration')
  }
}
