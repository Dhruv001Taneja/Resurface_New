import { Router } from 'express'
import * as authController from './auth.controller.js'
import authenticateToken from '../../middleware/auth.js'
import { authLimiter } from '../../middleware/rateLimiter.js'
import { validateRequest } from '../../middleware/validator.js'
import { registerSchema, loginSchema } from './auth.validation.js'

const router = Router()

// Public routes with brute-force rate limiting and input validation
router.post(
  '/register',
  authLimiter,
  validateRequest({ body: registerSchema }),
  authController.register
)

router.post(
  '/login',
  authLimiter,
  validateRequest({ body: loginSchema }),
  authController.login
)

// Protected routes
router.get('/me', authenticateToken, authController.getMe)
router.post('/logout', authenticateToken, authController.logout)

export default router
