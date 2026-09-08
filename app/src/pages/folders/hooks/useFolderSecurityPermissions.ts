import { useEffect, useMemo, useState } from 'react'
import {
  FOLDER_PERMISSIONS_ALLOW_ALL,
  FOLDER_PERMISSIONS_VIEW_ONLY,
  getFolderSecurity,
  resolveEffectiveFolderPermissions,
  type FolderPermissionFlags,
} from '@/api/v6/folder/security'
import authUserStore from '@/stores/authUserStore'
import { decodeRepositoryNodeId } from '../api/folderApi'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const extractSecurityFolderId = (activeFolder?: string | null) => {
  if (!activeFolder) return null
  const decoded = decodeRepositoryNodeId(activeFolder)
  if (!decoded) return null
  if (decoded.kind === 'browse' || decoded.kind === 'browsePath') {
    const pathId = String(decoded.pathId || '').trim()
    return UUID_RE.test(pathId) ? pathId : null
  }
  return null
}

export default function useFolderSecurityPermissions(
  repositoryId?: string | null,
  activeFolder?: string | null,
) {
  const session = authUserStore((state) => state.session)
  const userId = String(session?.id || '').trim()
  const securityFolderId = useMemo(
    () => extractSecurityFolderId(activeFolder),
    [activeFolder],
  )

  // Start restrictive so denied actions (download, upload, …) do not flash on
  // while policies are still loading.
  const [permissions, setPermissions] = useState<FolderPermissionFlags>(
    FOLDER_PERMISSIONS_VIEW_ONLY,
  )
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const repoId = String(repositoryId || '').trim()
    if (!repoId) {
      setPermissions(FOLDER_PERMISSIONS_ALLOW_ALL)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setPermissions(FOLDER_PERMISSIONS_VIEW_ONLY)

    void (async () => {
      const res = await getFolderSecurity(repoId, true, securityFolderId)
      if (cancelled || res.isCanceled) return

      if (res.error || !res.data) {
        // Fail closed: do not expose download/upload when security cannot be read.
        setPermissions(FOLDER_PERMISSIONS_VIEW_ONLY)
        setIsLoading(false)
        return
      }

      const resolved = resolveEffectiveFolderPermissions({
        policies: res.data.policies,
        userId,
        folderId: securityFolderId,
      })

      setPermissions(resolved)
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [repositoryId, securityFolderId, userId])

  return {
    isLoading,
    permissions,
    securityFolderId,
  }
}
