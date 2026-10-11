import { z } from 'zod'

/**
 * Registration validation schema
 */
export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please enter a valid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password cannot exceed 128 characters'),
})

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please enter a valid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
})
