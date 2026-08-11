import { z } from 'zod'

export const ItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
})

export type Item = z.infer<typeof ItemSchema>

export const ItemListSchema = z.object({
  data: z.array(ItemSchema),
  limit: z.number(),
  skip: z.number(),
  total: z.number(),
})

export type ItemList = z.infer<typeof ItemListSchema>

export const QueryParamsSchema = z.object({
  limit: z.number().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  skip: z.number().optional(),
  sortBy: z.string().optional(),
})

export type QueryParams = z.infer<typeof QueryParamsSchema>
