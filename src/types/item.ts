import { z } from 'zod'

export const QueryParamsSchema = z.object({
  expand: z.union([z.literal(true), z.record(z.string(), z.boolean())]),
  group: z.array(z.string()).optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  sort: z
    .array(
      z.object({
        desc: z.boolean(),
        id: z.string(),
      }),
    )
    .optional(),
})

export type QueryParams = z.infer<typeof QueryParamsSchema>

export const ItemSchema = z.object({
  id: z.number(),
  name: z.string(),
})

export type Item = z.infer<typeof ItemSchema>

export const ItemListSchema = z.object({
  data: z.array(ItemSchema),
  page: z.number(),
  pageSize: z.number(),
  totalCount: z.number(),
})

export type ItemList = z.infer<typeof ItemListSchema>

export const ItemGroupSchema = z.object({
  groupCount: z.number(),
  groupId: z.string(),
  groupKey: z.string(),
  groupValue: z.string(),
  get items() {
    return z.union([z.array(ItemGroupSchema), z.array(ItemSchema)])
  },
})

export type ItemGroup = z.infer<typeof ItemGroupSchema>

export const ItemGroupListSchema = ItemListSchema.extend({
  data: z.array(ItemGroupSchema),
})

export type ItemGroupList = z.infer<typeof ItemGroupListSchema>
