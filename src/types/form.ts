import { z } from 'zod'
import { ItemGroupSchema, ItemListSchema, ItemSchema } from './item'

export const FormSchema = ItemSchema.extend({
  createdAt: z.iso.datetime(),
  createdBy: z.email(),
  description: z.string().optional(),
  isFavourite: z.boolean(),
  name: z.string(),
  status: z.enum(['Published', 'Draft']),
  type: z.enum(['Workflow', 'Master']),
  updatedAt: z.iso.datetime(),
  updatedBy: z.email(),
})

export type Form = z.infer<typeof FormSchema>

export const FormListSchema = ItemListSchema.extend({
  data: z.array(FormSchema),
})

export type FormList = z.infer<typeof FormListSchema>

export const FormGroupSchema = ItemGroupSchema.extend({
  get items() {
    return z.union([z.array(FormGroupSchema), z.array(FormSchema)])
  },
})

export type FormGroup = z.infer<typeof FormGroupSchema>

export const FormGroupListSchema = FormListSchema.extend({
  data: z.array(FormGroupSchema),
})

export type FormGroupList = z.infer<typeof FormGroupListSchema>
