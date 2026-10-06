import { Router } from 'express'
import * as authController from './auth.controller.js'
import authenticateToken from '../../middleware/auth.js'

const router = Router()

// Public routes
router.post('/register', authController.register)
router.post('/login', authController.login)

// Protected routes
router.get('/me', authenticateToken, authController.getMe)
router.post('/logout', authenticateToken, authController.logout)

export default router
