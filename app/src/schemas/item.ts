import z from 'zod'

export const ItemSchema = z.object({
  createdAt: z.iso.datetime(),
  createdBy: z.string(),
  id: z.number(),
  name: z.string(),
  updatedAt: z.iso.datetime(),
  updatedBy: z.string(),
})

export type Item = z.infer<typeof ItemSchema>
