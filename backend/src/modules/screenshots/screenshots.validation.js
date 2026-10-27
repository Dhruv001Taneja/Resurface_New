import { z } from 'zod'

/**
 * Validation schema for updating an extracted date
 */
export const updateDateSchema = z.object({
  category: z.enum(
    ['extractedDates', 'extractedTasks', 'extractedEvents', 'actionItems'],
    {
      required_error: 'Category is required',
      invalid_type_error: 'Invalid category specified',
    }
  ),
  itemIndex: z
    .number({ required_error: 'Item index is required' })
    .int('Item index must be an integer')
    .min(0, 'Item index must be non-negative'),
  newDate: z
    .string({ required_error: 'New date is required' })
    .refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'Invalid date provided',
    }),
})

/**
 * Validation schema for dismissing an action item
 */
export const dismissActionItemSchema = z.object({
  category: z.enum(
    ['extractedDates', 'extractedTasks', 'extractedEvents', 'actionItems'],
    {
      required_error: 'Category is required',
      invalid_type_error: 'Invalid category specified',
    }
  ),
  itemIndex: z
    .number({ required_error: 'Item index is required' })
    .int('Item index must be an integer')
    .min(0, 'Item index must be non-negative'),
})
