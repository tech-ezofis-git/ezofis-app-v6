import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Option } from '@/types/option'
import {
  getGroupListQueryOptions,
  getUserListQueryOptions,
} from '@/api/userQueries'

export interface UserGroupOptions {
  groupOptions: Option[]
  isGroupsError: boolean
  isGroupsLoading: boolean
  isUsersError: boolean
  isUsersLoading: boolean
  userOptions: Option[]
}

interface RawGroup {
  groupId?: number | string
  groupName?: string
  id?: number | string
  name?: string
  value?: number | string
}

interface RawUser {
  displayName?: string
  email?: string
  firstName?: string
  id?: number | string
  lastName?: string
  loginName?: string
  name?: string
  value?: number | string
}

/**
 * Shared user/group list fetch for Report Builder — used by DetailsStep
 * (share with users/groups) and ScheduleStep (email recipients/CC), so the
 * real Users/Groups API is only wired up once.
 */
const useUserGroupOptions = (): UserGroupOptions => {
  const { t } = useLingui()
  const {
    data: rawUsers,
    isError: isUsersError,
    isLoading: isUsersLoading,
  } = useQuery(getUserListQueryOptions())
  const {
    data: rawGroups,
    isError: isGroupsError,
    isLoading: isGroupsLoading,
  } = useQuery(getGroupListQueryOptions())

  const userOptions: Option[] = useMemo(() => {
    const users = rawUsers as RawUser[]
    if (!Array.isArray(users)) return []
    return users.map((u) => {
      const name =
        u.value ||
        u.name ||
        (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : null) ||
        u.loginName ||
        u.displayName ||
        u.email ||
        t`Unknown User`
      return { id: String(u.id ?? u.value), name: String(name) }
    })
  }, [rawUsers, t])

  const groupOptions: Option[] = useMemo(() => {
    const groups = rawGroups as RawGroup[]
    if (!Array.isArray(groups)) return []
    return groups.map((g) => {
      const id = g.groupId ?? g.id ?? g.value
      return {
        id: String(id),
        name: String(g.groupName || g.name || g.value || t`Group ${id}`),
      }
    })
  }, [rawGroups, t])

  return {
    groupOptions,
    isGroupsError,
    isGroupsLoading,
    isUsersError,
    isUsersLoading,
    userOptions,
  }
}

export default useUserGroupOptions
