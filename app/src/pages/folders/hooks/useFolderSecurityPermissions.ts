import { useEffect, useMemo, useState } from 'react'
import {
  FOLDER_PERMISSIONS_ALLOW_ALL,
  FOLDER_PERMISSIONS_VIEW_ONLY,
  type FolderPermissionFlags,
  getFolderSecurity,
  resolveEffectiveFolderPermissions,
} from '@/api/v6/folder/security'
import { getGroupById, getGroups, type V6GroupItem } from '@/api/v6/user'
import authUserStore from '@/stores/authUserStore'
import { decodeRepositoryNodeId } from '../api/folderApi'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// In-memory cache for group details across hook calls
const groupDetailsCache = new Map<string, { group: V6GroupItem | null; timestamp: number }>()
const GROUP_CACHE_TTL_MS = 60_000

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

const isUserMemberOfGroup = (
  group: V6GroupItem,
  userId: string,
  userEmail: string,
): boolean => {
  const users =
    (group as any).users ||
    (group as any).members ||
    (group as any).userList ||
    (group as any).memberIds
  if (!Array.isArray(users)) return false

  const normalizedUserId = userId.toLowerCase().trim()
  const normalizedEmail = userEmail.toLowerCase().trim()

  return users.some((u: any) => {
    if (typeof u === 'string') {
      const normalized = u.toLowerCase().trim()
      return (
        normalized === normalizedUserId ||
        (Boolean(normalizedEmail) && normalized === normalizedEmail)
      )
    }
    if (u && typeof u === 'object') {
      const uId = String(u.id || u.userId || u.value || '')
        .toLowerCase()
        .trim()
      const uEmail = String(u.email || '')
        .toLowerCase()
        .trim()
      return (
        (Boolean(uId) && uId === normalizedUserId) ||
        (Boolean(uEmail) && Boolean(normalizedEmail) && uEmail === normalizedEmail)
      )
    }
    return false
  })
}

async function fetchCachedGroupById(groupId: string): Promise<V6GroupItem | null> {
  const cached = groupDetailsCache.get(groupId)
  if (cached && Date.now() - cached.timestamp < GROUP_CACHE_TTL_MS) {
    return cached.group
  }
  const res = await getGroupById(groupId)
  const group = res.data || null
  groupDetailsCache.set(groupId, { group, timestamp: Date.now() })
  return group
}

export default function useFolderSecurityPermissions(
  repositoryId?: string | null,
  activeFolder?: string | null,
) {
  const session = authUserStore((state) => state.session)
  const userId = String(session?.id || '').trim()
  const userEmail = String(session?.email || '').trim()
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
      const [res, groupsRes] = await Promise.all([
        getFolderSecurity(repoId, true, securityFolderId),
        getGroups(),
      ])
      if (cancelled || res.isCanceled) return

      if (res.error || !res.data) {
        // Fail closed: do not expose download/upload when security cannot be read.
        setPermissions(FOLDER_PERMISSIONS_VIEW_ONLY)
        setIsLoading(false)
        return
      }

      // 1. Groups from /Users/groups summary (if they include member lists)
      const groupList =
        groupsRes.canceled || groupsRes.error ? [] : groupsRes.data || []
      const matchedFromList = groupList
        .filter((g) => isUserMemberOfGroup(g, userId, userEmail))
        .map((g) => String(g.id || g.groupId || '').trim())
        .filter(Boolean)

      // 2. Groups referenced in policy groupIds:
      // Since /Users/groups summary only has member counts and NOT member lists,
      // we query /Users/groups/{groupId} for policies that target specific groupIds.
      const policyGroupIds = Array.from(
        new Set(
          (res.data.policies || []).flatMap((p) =>
            (p.groupIds || []).map((id) => String(id || '').trim()),
          ),
        ),
      ).filter(Boolean)

      const detailedGroups = await Promise.all(
        policyGroupIds.map((gId) => fetchCachedGroupById(gId)),
      )
      if (cancelled) return

      const matchedFromDetails = detailedGroups
        .filter((g): g is V6GroupItem => Boolean(g && isUserMemberOfGroup(g, userId, userEmail)))
        .map((g) => String(g.id || (g as any).groupId || '').trim())
        .filter(Boolean)

      const userGroupIds = Array.from(
        new Set([...matchedFromList, ...matchedFromDetails]),
      )

      const resolved = resolveEffectiveFolderPermissions({
        folderId: securityFolderId,
        policies: res.data.policies,
        userGroupIds,
        userId,
      })

      setPermissions(resolved)
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [repositoryId, securityFolderId, userEmail, userId])

  return {
    isLoading,
    permissions,
    securityFolderId,
  }
}

