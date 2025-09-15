import { z } from 'zod'
import { ItemSchema } from './item'

export const UserSchema = ItemSchema.extend({
  email: z.email(),
  profile: z.object({
    avatarUrl: z.string().optional(),
    department: z.string().optional(),
    jobTitle: z.string().optional(),
    phoneNumber: z.string().optional(),
    twoStepVerification: z.object({
      enabled: z.boolean().optional().default(false),
      method: z.enum(['app', 'email', 'sms']).optional().default('email'),
    }),
  }),
  role: z.enum(['Admin', 'Manager', 'User']),
  signUpMethod: z
    .enum(['email', 'google', 'microsoft'])
    .optional()
    .default('email'),
  onBoardingCompleted: z.boolean().optional().default(false),
})

export type User = z.infer<typeof UserSchema>
