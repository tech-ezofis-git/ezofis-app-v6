import {
  getRepositoryById,
  getRepositoryItemWorkspace,
} from '@/api/v6/folder/folder'
import { workflowsApiV6 } from '@/api/v6/workflows'
import {
  extractExistingFolderMetadata,
  getDeepestFolderField,
  getFolderStructureFields,
  type RepositoryFieldSchema,
} from './repoFolderMetadata'

export interface RepositoryFolderPlan {
  // Every level of the folder hierarchy except the deepest one, pre-filled
  // from an existing attachment already filed under this instance (keyed
  // by sqlColumnName, ready to spread into the upload's metadata).
  baseMetadata: Record<string, string>
  // The one field the uploader actually needs to be asked for — null when
  // the repository has no folder-structure fields at all (nothing to ask).
  deepestField: RepositoryFieldSchema | null
}

// Reads the repository's field schema and, when it defines a folder
// hierarchy, inherits every level except the deepest one from an existing
// attachment already in this instance's folder (they all share the same
// path except the last segment). `existingItem` should be the first
// attachment already on this instance, if any.
export const planRepositoryFolderMetadata = async (
  repositoryId: string,
  existingItem?: { itemId?: string | number; repositoryId?: string | number },
): Promise<RepositoryFolderPlan> => {
  const { data: repository } = await getRepositoryById(repositoryId)
  const fields: RepositoryFieldSchema[] = repository?.fields || []
  const folderFields = getFolderStructureFields(fields)
  const deepestField = getDeepestFolderField(fields)

  let baseMetadata: Record<string, string> = {}
  const itemId = existingItem?.itemId
  if (itemId && folderFields.length > 0) {
    const inheritableFields = folderFields.filter(
      (f) => f.id !== deepestField?.id,
    )
    if (inheritableFields.length > 0) {
      const { data: workspace } = await getRepositoryItemWorkspace({
        itemId: String(itemId),
        repositoryId: String(existingItem?.repositoryId || repositoryId),
      })
      baseMetadata = extractExistingFolderMetadata(workspace, inheritableFields)
    }
  }

  return { baseMetadata, deepestField }
}

// Posts a single file to an instance's attachments, same endpoint/shape
// Attachments.tsx already used — factored out so FieldRenderer's inline
// FILE_UPLOAD dropzone (Overview only) can reuse it too.
export const uploadInstanceAttachment = async (
  workflowId: number | string,
  instanceId: number | string,
  repositoryId: number | string,
  file: File,
  metadata: Record<string, unknown>,
) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('repositoryId', String(repositoryId))
  formData.append('repositoryld', String(repositoryId)) // Support backend field typo
  formData.append('metadata', JSON.stringify(metadata))
  return workflowsApiV6.addInstanceAttachment(workflowId, instanceId, formData)
}
