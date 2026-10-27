import { z } from 'zod'
import logger from '../utils/logger.js'

/**
 * Mask sensitive strings for safe logging (e.g. "abcd...wxyz")
 * @param {string} secret
 * @returns {string}
 */
export const maskSecret = (secret) => {
  if (!secret || typeof secret !== 'string') return '[not set]'
  if (secret.length <= 8) return '****'
  return `${secret.slice(0, 4)}****${secret.slice(-4)}`
}

/**
 * Environment variable schema definition with Zod
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10)),
  MONGODB_URI: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        return (
          !val.includes('<username>') &&
          !val.includes('<cluster>') &&
          (val.startsWith('mongodb://') || val.startsWith('mongodb+srv://'))
        )
      },
      {
        message:
          'MONGODB_URI must be a valid MongoDB URI and not contain placeholders',
      }
    ),
  JWT_SECRET: z
    .string()
    .min(10, 'JWT_SECRET should be at least 10 characters long for cryptographic security')
    .default('development-default-jwt-secret-do-not-use-in-production-32chars!'),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('1d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
})

/**
 * Validates process.env at startup without crashing in non-fatal dev setups.
 * Enforces strict requirements in production.
 * @returns {Object} Validated environment configuration
 */
export const validateEnv = () => {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    logger.error(`❌ Environment configuration validation failed:\n${errorMessages}`)

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Fatal: Invalid production environment configuration.')
    }
  }

  // Security checks
  if (process.env.NODE_ENV === 'production') {
    if (
      !process.env.JWT_SECRET ||
      process.env.JWT_SECRET.includes('development-default')
    ) {
      throw new Error(
        'Fatal Security Risk: Production requires a unique, strong JWT_SECRET.'
      )
    }

    if (!process.env.MONGODB_URI) {
      throw new Error('Fatal: MONGODB_URI is required in production.')
    }
  }

  logger.info(`🛡️ Environment validated (Mode: ${process.env.NODE_ENV || 'development'})`)

  return result.data || process.env
}

export default validateEnv
