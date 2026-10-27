import { z } from 'zod'

/**
 * Calendar event creation schema
 */
export const createEventSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().optional().default(''),
  date: z
    .string({ required_error: 'Date is required' })
    .or(z.date())
    .refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'Invalid date format',
    }),
  startTime: z.string().optional().default(''),
  endTime: z.string().optional().default(''),
  location: z.string().optional().default(''),
  type: z
    .enum(['event', 'task', 'date', 'deadline', 'reminder', 'other'])
    .optional()
    .default('event'),
  priority: z.string().optional().default(''),
  sourceScreenshotId: z.string().nullable().optional(),
})

/**
 * Calendar event update schema
 */
export const updateEventSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(200).optional(),
  description: z.string().optional(),
  date: z
    .string()
    .or(z.date())
    .refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'Invalid date format',
    })
    .optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  type: z
    .enum(['event', 'task', 'date', 'deadline', 'reminder', 'other'])
    .optional(),
  priority: z.string().optional(),
  sourceScreenshotId: z.string().nullable().optional(),
})
