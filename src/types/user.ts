import { z } from 'zod'
import { ItemGroupSchema, ItemListSchema, ItemSchema } from './item'

export const UserSchema = ItemSchema.extend({
  company: z.string(),
  country: z.string(),
  createdAt: z.iso.datetime(),
  department: z.string(),
  dob: z.iso.datetime(),
  email: z.email(),
  firstName: z.string(),
  gender: z.enum(['Male', 'Female', 'Other']),
  jobTitle: z.string(),
  lastName: z.string(),
  phone: z.string(),
  role: z.enum(['Admin', 'Manager', 'User']),
  updatedAt: z.iso.datetime(),
})

export type User = z.infer<typeof UserSchema>

export const UserListSchema = ItemListSchema.extend({
  data: z.array(UserSchema),
})

export type UserList = z.infer<typeof UserListSchema>

export const UserGroupSchema = ItemGroupSchema.extend({
  get items() {
    return z.union([z.array(UserGroupSchema), z.array(UserSchema)])
  },
})

export type UserGroup = z.infer<typeof UserGroupSchema>

export const UserGroupListSchema = UserListSchema.extend({
  data: z.array(UserGroupSchema),
})

export type UserGroupList = z.infer<typeof UserGroupListSchema>
