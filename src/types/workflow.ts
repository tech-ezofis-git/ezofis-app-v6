import { z } from 'zod'
import { ItemGroupSchema, ItemListSchema, ItemSchema } from './item'

export const WorkflowSchema = ItemSchema.extend({
    createdAt: z.iso.datetime(),
    createdBy: z.email(),
    description: z.string().optional(),
    isFavourite: z.boolean(),
    name: z.string(),
    status: z.enum(['Published', 'Draft']),
    type: z.literal('Workflow'),
    updatedAt: z.iso.datetime(),
    updatedBy: z.email(),
})

export type Workflow = z.infer<typeof WorkflowSchema>

export const WorkflowListSchema = ItemListSchema.extend({
    data: z.array(WorkflowSchema),
})

export type WorkflowList = z.infer<typeof WorkflowListSchema>

export const WorkflowGroupSchema = ItemGroupSchema.extend({
    get items() {
        return z.union([z.array(WorkflowGroupSchema), z.array(WorkflowSchema)])
    },
})

export type WorkflowGroup = z.infer<typeof WorkflowGroupSchema>

export const WorkflowGroupListSchema = WorkflowListSchema.extend({
    data: z.array(WorkflowGroupSchema),
})

export type WorkflowGroupList = z.infer<typeof WorkflowGroupListSchema>
