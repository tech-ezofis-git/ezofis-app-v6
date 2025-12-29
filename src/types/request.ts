import { z } from 'zod'
import { ItemGroupSchema, ItemListSchema, ItemSchema } from './item'

export const RequestSchema = ItemSchema.extend({
  amount: z.number(),
  createdAt: z.iso.datetime(),
  createdBy: z.email(),
  documentDate: z.iso.date(),
  documentNumber: z.string(),
  documentType: z.enum([
    'Purchase Order (PO)',
    'Invoice',
    'Goods Receipt Note (GRN)',
  ]),
  purchaseOrderNumber: z.string(),
  remarks: z.string().optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected' , 'Duplicated']),
  updatedAt: z.iso.datetime(),
  updatedBy: z.email(),
  vendor: z.string(),
})

export type Request = z.infer<typeof RequestSchema>

export const RequestListSchema = ItemListSchema.extend({
  data: z.array(RequestSchema),
})

export type RequestList = z.infer<typeof RequestListSchema>

export const RequestGroupSchema = ItemGroupSchema.extend({
  get items() {
    return z.union([z.array(RequestGroupSchema), z.array(RequestSchema)])
  },
})

export type RequestGroup = z.infer<typeof RequestGroupSchema>

export const RequestGroupListSchema = RequestListSchema.extend({
  data: z.array(RequestGroupSchema),
})

export type RequestGroupList = z.infer<typeof RequestGroupListSchema>
