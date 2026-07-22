import authUserStore from '../../stores/authUserStore'
import { axiosV6 } from '../axios'
import { getV6ApiErrorMessage } from './auth'

export type CreateV6GroupPayload = {
  description: string
  groupName?: string
  users: string[]
}

export type CreateV6MenuPayload = {
  key: string
  label: string
  routePath: string
  sortOrder: number
}

export type CreateV6UserPayload = {
  'accountExpiryDate': string
  'authStrategy': string
  'Bussiness Unit': string
  'department': string
  'displayName': string
  'email': string
  'Employee Id': string
  'firstName': string
  'forcePasswordResetOnLogin': string
  'group': string[]
  'Job Title': string
  'lastName': string
  'location': string
  'LoginType': string
  'Manager': string
  'MFA Methods': string
  'MFAuthentication': string
  'password'?: string
  'passwordExpiryDays': number
  'role': string
  'userName': string
}

export type UpdateV6GroupPayload = {
  description?: string
  groupName?: string
  users?: string[]
}

export type UpdateV6MenuPayload = {
  label: string
  routePath: string
  sortOrder: number
}

export type UpdateV6UserPayload = {
  avatarPath?: string
  countryCode?: string
  department?: string
  displayName?: string
  firstName?: string
  jobTitle?: string
  language?: string
  lastName?: string
  phoneNo?: string
  role?: string
  uiPreference?: string
}

export type UpsertV6RolePayload = {
  description: string
  permissions: string[]
  roleName: string
  users: string[]
}

export type V6GroupItem = {
  createdAtUtc?: string
  description?: string
  groupId?: string
  id?: string
  memberCount?: number
  name?: string
  userCount?: number
  users?: Array<string | V6GroupUser>
}

export type V6GroupUser = {
  displayName?: string
  email?: string
  id?: string
}

export type V6MenuItem = {
  createdAtUtc?: string
  id?: string
  isSystem?: boolean
  key?: string
  label?: string
  menuId?: string
  name?: string
  routePath?: string
  sortOrder?: number
  visible?: boolean
}

export type V6RoleItem = {
  description?: string
  id?: string
  name?: string
  permissionCount?: number
  permissions?: string[]
  roleId?: string
  roleName?: string
  userCount?: number
  users?: Array<string | { id?: string; userId?: string; value?: string }>
}

export type V6UserListItem = {
  authStrategy?: string
  createdAtUtc?: string
  displayName: string
  email: string
  firstName?: string
  id: string
  lastName?: string
  role: string
}

export const createUser = async (payload: CreateV6UserPayload) => {
  const response: {
    data: unknown
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      data: payload,
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'POST',
      url: '/Users',
    })

    if (status !== 200 && status !== 201) {
      throw new Error('invalid status code')
    }

    response.data = data
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to create user',
    )
  }

  return response
}

export const updateUser = async (id: string, payload: UpdateV6UserPayload) => {
  const response: {
    data: unknown
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      data: payload,
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'PUT',
      url: `/Users/${id}`,
    })

    if (status !== 200 && status !== 204) {
      throw new Error('invalid status code')
    }

    response.data = data
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to update user',
    )
  }

  return response
}

export const deleteUser = async (id: string) => {
  const response: {
    data: unknown
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId =
      store.session?.tenantId || (store.identity as any)?.tenantId || ''

    const { data, status } = await axiosV6({
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'DELETE',
      url: `/Users/${id}`,
    })

    if (status !== 200 && status !== 204) {
      throw new Error('invalid status code')
    }

    response.data = data
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to delete user',
    )
  }

  return response
}

const extractUserItems = (data: unknown): V6UserListItem[] => {
  if (!data) return []
  if (Array.isArray(data)) return data as V6UserListItem[]

  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.items)) {
      return record.items as V6UserListItem[]
    }
  }

  return []
}

const extractRoleItems = (data: unknown): V6RoleItem[] => {
  if (!data) return []
  if (Array.isArray(data)) return data as V6RoleItem[]

  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.roles)) return record.roles as V6RoleItem[]
    if (Array.isArray(record.items)) return record.items as V6RoleItem[]
    if (Array.isArray(record.data)) return record.data as V6RoleItem[]
  }

  return []
}

const extractGroupItems = (data: unknown): V6GroupItem[] => {
  if (!data) return []
  if (Array.isArray(data)) return data as V6GroupItem[]

  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.groups)) return record.groups as V6GroupItem[]
    if (Array.isArray(record.items)) return record.items as V6GroupItem[]
    if (Array.isArray(record.data)) return record.data as V6GroupItem[]
  }

  return []
}

const extractMenuItems = (data: unknown): V6MenuItem[] => {
  if (!data) return []
  if (Array.isArray(data)) return data as V6MenuItem[]

  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.menus)) return record.menus as V6MenuItem[]
    if (Array.isArray(record.items)) return record.items as V6MenuItem[]
    if (Array.isArray(record.data)) return record.data as V6MenuItem[]
  }

  return []
}

export const getUsers = async () => {
  const response: {
    data: V6UserListItem[]
    error: string
  } = {
    data: [],
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'GET',
      url: '/Users',
    })

    if (status !== 200) {
      throw new Error('invalid status code')
    }

    const rawData = typeof data === 'string' ? JSON.parse(data) : data
    response.data = extractUserItems(rawData)
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to load users',
    )
  }

  return response
}

export const getRoles = async () => {
  const response: {
    data: V6RoleItem[]
    error: string
  } = {
    data: [],
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'GET',
      url: '/Users/roles',
    })

    if (status !== 200) throw new Error('invalid status code')

    const rawData = typeof data === 'string' ? JSON.parse(data) : data
    response.data = extractRoleItems(rawData)
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to load roles',
    )
  }

  return response
}

export const getRoleById = async (roleId: string) => {
  const response: {
    data: V6RoleItem | null
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'GET',
      url: `/Users/roles/${roleId}`,
    })

    if (status !== 200) throw new Error('invalid status code')

    const rawData = typeof data === 'string' ? JSON.parse(data) : data
    response.data = rawData as V6RoleItem
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to load role',
    )
  }

  return response
}

export const createRole = async (payload: UpsertV6RolePayload) => {
  const response: {
    data: unknown
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      data: payload,
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'POST',
      url: '/Users/roles',
    })

    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = data
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to create role',
    )
  }

  return response
}

export const updateRole = async (
  roleId: string,
  payload: UpsertV6RolePayload,
) => {
  const response: {
    data: unknown
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      data: payload,
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'PUT',
      url: `/Users/roles/${roleId}`,
    })

    if (status !== 200 && status !== 204) throw new Error('invalid status code')
    response.data = data
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to update role',
    )
  }

  return response
}

export const getGroups = async () => {
  const response: {
    data: V6GroupItem[]
    error: string
  } = {
    data: [],
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'GET',
      url: '/Users/groups',
    })

    if (status !== 200) throw new Error('invalid status code')

    const rawData = typeof data === 'string' ? JSON.parse(data) : data
    response.data = extractGroupItems(rawData)
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to load groups',
    )
  }

  return response
}

export const getGroupById = async (groupId: string) => {
  const response: {
    data: V6GroupItem | null
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'GET',
      url: `/Users/groups/${groupId}`,
    })

    if (status !== 200) throw new Error('invalid status code')

    const rawData = typeof data === 'string' ? JSON.parse(data) : data
    response.data = rawData as V6GroupItem
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to load group',
    )
  }

  return response
}

export const createGroup = async (payload: CreateV6GroupPayload) => {
  const response: {
    data: unknown
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      data: payload,
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'POST',
      url: '/Users/groups',
    })

    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = data
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to create group',
    )
  }

  return response
}

export const updateGroup = async (
  groupId: string,
  payload: UpdateV6GroupPayload,
) => {
  const response: {
    data: unknown
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      data: payload,
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'PUT',
      url: `/Users/groups/${groupId}`,
    })

    if (status !== 200 && status !== 204) throw new Error('invalid status code')
    response.data = data
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to update group',
    )
  }

  return response
}

export const deleteGroup = async (groupId: string) => {
  const response: {
    data: unknown
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'DELETE',
      url: `/Users/groups/${groupId}`,
    })

    if (status !== 200 && status !== 204) throw new Error('invalid status code')
    response.data = data
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to delete group',
    )
  }

  return response
}

export const getMenus = async () => {
  const response: {
    data: V6MenuItem[]
    error: string
  } = {
    data: [],
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'GET',
      url: '/Users/menus',
    })

    if (status !== 200) throw new Error('invalid status code')

    const rawData = typeof data === 'string' ? JSON.parse(data) : data
    response.data = extractMenuItems(rawData)
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to load menus',
    )
  }

  return response
}

export const getMenuById = async (menuId: string) => {
  const response: {
    data: V6MenuItem | null
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'GET',
      url: `/Users/menus/${menuId}`,
    })

    if (status !== 200) throw new Error('invalid status code')

    const rawData = typeof data === 'string' ? JSON.parse(data) : data
    response.data = rawData as V6MenuItem
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to load menu',
    )
  }

  return response
}

export const createMenu = async (payload: CreateV6MenuPayload) => {
  const response: {
    data: unknown
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      data: payload,
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'POST',
      url: '/Users/menus',
    })

    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = data
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to create menu',
    )
  }

  return response
}

export const updateMenu = async (
  menuId: string,
  payload: UpdateV6MenuPayload,
) => {
  const response: {
    data: unknown
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      data: payload,
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'PUT',
      url: `/Users/menus/${menuId}`,
    })

    if (status !== 200 && status !== 204) throw new Error('invalid status code')
    response.data = data
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to update menu',
    )
  }

  return response
}

export const deleteMenu = async (menuId: string) => {
  const response: {
    data: unknown
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'DELETE',
      url: `/Users/menus/${menuId}`,
    })

    if (status !== 200 && status !== 204) throw new Error('invalid status code')
    response.data = data
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to delete menu',
    )
  }

  return response
}

export const updateUserConfiguration = async (
  userId: string,
  payload: { message: string },
) => {
  const response: {
    data: unknown
    error: string
  } = {
    data: null,
    error: '',
  }

  try {
    const store = authUserStore.getState()
    const tenantId = store.session?.tenantId || ''

    const { data, status } = await axiosV6({
      data: payload,
      headers: tenantId ? { 'X-Tenant-Id': tenantId } : undefined,
      method: 'POST',
      url: `/Users/${userId}/configuration`,
    })

    if (status !== 200 && status !== 201) throw new Error('invalid status code')
    response.data = data
  } catch (error: any) {
    console.error(error)
    response.error = getV6ApiErrorMessage(
      error?.response?.data,
      'Failed to update user configuration',
    )
  }

  return response
}

export const usersApiV6 = {
  createGroup,
  createMenu,
  createRole,
  createUser,
  deleteGroup,
  deleteMenu,
  deleteUser,
  updateGroup,
  updateMenu,
  updateRole,
  updateUser,
  updateUserConfiguration,
  getGroupById,
  getGroups,
  getMenuById,
  getMenus,
  getRoleById,
  getRoles,
  getUsers,
}

export default usersApiV6
