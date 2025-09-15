import type { infiniteQueryOptions } from '@tanstack/react-query'
import z from 'zod'
import { ItemListSchema, ItemSchema } from './item'

export const OptionSchema = ItemSchema.extend({
  description: z.string().optional(),
  disabled: z.boolean().optional(),
})

export type Option = z.infer<typeof OptionSchema>

export const OptionListSchema = ItemListSchema.extend({
  data: z.array(OptionSchema),
})

export type InfiniteQueryOptions = ReturnType<
  typeof infiniteQueryOptions<OptionList>
>

export type OptionList = z.infer<typeof OptionListSchema>
