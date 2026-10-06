import { Router } from 'express'
import * as screenshotsController from './screenshots.controller.js'
import authenticateToken from '../../middleware/auth.js'
import { uploadSingle } from '../../middleware/upload.js'

const router = Router()

// All routes are protected by JWT auth middleware
router.use(authenticateToken)

router.post('/upload', uploadSingle, screenshotsController.uploadScreenshot)
router.get('/', screenshotsController.getScreenshots)
router.get('/:id', screenshotsController.getScreenshotById)
router.patch('/:id/favorite', screenshotsController.toggleFavorite)
router.delete('/:id', screenshotsController.deleteScreenshot)

export default router
