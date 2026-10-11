import { Router } from 'express'
import * as screenshotsController from './screenshots.controller.js'
import authenticateToken from '../../middleware/auth.js'
import { uploadSingle } from '../../middleware/upload.js'
import { uploadLimiter } from '../../middleware/rateLimiter.js'
import { validateFileSignature } from '../../middleware/fileSignature.js'
import { validateRequest } from '../../middleware/validator.js'
import { updateDateSchema, dismissActionItemSchema } from './screenshots.validation.js'

const router = Router()

// All routes are protected by JWT auth middleware
router.use(authenticateToken)

// Upload with rate limiting and file signature validation (magic bytes)
router.post(
  '/upload',
  uploadLimiter,
  uploadSingle,
  validateFileSignature,
  screenshotsController.uploadScreenshot
)

// Vault — MUST come before /:id
router.get('/vault', screenshotsController.getVaultScreenshots)
router.patch('/:id/vault', screenshotsController.toggleVault)

// Screenshots
router.get('/', screenshotsController.getScreenshots)
router.get('/:id', screenshotsController.getScreenshotById)
router.patch('/:id/favorite', screenshotsController.toggleFavorite)
router.patch(
  '/:id/dismiss',
  validateRequest({ body: dismissActionItemSchema }),
  screenshotsController.dismissActionItem
)
router.put(
  '/:id/date',
  validateRequest({ body: updateDateSchema }),
  screenshotsController.updateExtractedDate
)
router.delete('/:id', screenshotsController.deleteScreenshot)

export default router