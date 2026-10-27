import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as authController from './auth.controller.js'
import authenticateToken from '../../middleware/auth.js'
import { authLimiter } from '../../middleware/rateLimiter.js'
import { validateRequest } from '../../middleware/validator.js'
import { registerSchema, loginSchema } from './auth.validation.js'

const router = Router()

// Limit repeated login attempts from the same IP address.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many login attempts. Please try again after 15 minutes.',
    },
})

// Limit repeated OTP requests to reduce email abuse.
const otpRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many verification requests. Please try again later.',
    },
})

// Public routes with rate limiting and input validation.
router.post(
    '/register',
    authLimiter,
    validateRequest({ body: registerSchema }),
    authController.register
)

router.post(
    '/login',
    authLimiter,
    loginLimiter,
    validateRequest({ body: loginSchema }),
    authController.login
)

router.post(
    '/send-otp',
    otpRequestLimiter,
    authController.sendVerificationOtp
)

router.post('/verify-otp', authController.verifyEmail)

// Protected routes.
router.get('/me', authenticateToken, authController.getMe)
router.post('/logout', authenticateToken, authController.logout)

export default router
