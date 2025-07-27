import { z } from 'zod'
import { ItemListSchema, ItemSchema } from './item'

export const UserSchema = ItemSchema.extend({
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
})

export type User = z.infer<typeof UserSchema>

export const UserListSchema = ItemListSchema.extend({
  data: z.array(UserSchema),
})

export type UserList = z.infer<typeof UserListSchema>
