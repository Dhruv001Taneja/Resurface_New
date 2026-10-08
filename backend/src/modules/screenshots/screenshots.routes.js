import { Router } from 'express'
import * as screenshotsController from './screenshots.controller.js'
import authenticateToken from '../../middleware/auth.js'
import { uploadSingle } from '../../middleware/upload.js'

const router = Router()

// All routes are protected by JWT auth middleware
router.use(authenticateToken)

// Upload
router.post('/upload', uploadSingle, screenshotsController.uploadScreenshot)

// Vault — MUST come before /:id
router.get('/vault', screenshotsController.getVaultScreenshots)
router.patch('/:id/vault', screenshotsController.toggleVault)

// Screenshots
router.get('/', screenshotsController.getScreenshots)
router.get('/:id', screenshotsController.getScreenshotById)
router.patch('/:id/favorite', screenshotsController.toggleFavorite)
router.delete('/:id', screenshotsController.deleteScreenshot)

export default router