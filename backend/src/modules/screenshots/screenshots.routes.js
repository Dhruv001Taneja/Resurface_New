
import { Router } from 'express'
import * as screenshotsController from './screenshots.controller.js'
import authenticateToken from '../../middleware/auth.js'
import { uploadSingle } from '../../middleware/upload.js'
import { uploadLimiter } from '../../middleware/rateLimiter.js'
import { validateFileSignature } from '../../middleware/fileSignature.js'
import { validateRequest } from '../../middleware/validator.js'
import {
  updateDateSchema,
  dismissActionItemSchema,
} from './screenshots.validation.js'
import { unlockVault } from './vault.controller.js'
import requireVaultAccess from '../../middleware/requireVaultAccess.js'

const router = Router()

// All routes require normal user authentication
router.use(authenticateToken)

// Unlock Vault using the existing ReSurface account password
router.post('/vault/unlock', unlockVault)

// Upload screenshot with rate limiting and file signature validation
router.post(
  '/upload',
  uploadLimiter,
  uploadSingle,
  validateFileSignature,
  screenshotsController.uploadScreenshot
)

// Vault routes — keep these before /:id
router.get(
  '/vault',
  requireVaultAccess,
  screenshotsController.getVaultScreenshots
)

router.patch(
  '/:id/vault',
  requireVaultAccess,
  screenshotsController.toggleVault
)

// Regular screenshot routes
router.get('/', screenshotsController.getScreenshots)

router.get(
  '/:id',
  (req, res, next) => {
    const vaultToken = req.headers['x-vault-token']

    // Regular screenshots continue normally.
    if (!vaultToken) {
      return next()
    }

    // Verify the Vault token before accessing a protected screenshot.
    return requireVaultAccess(req, res, next)
  },
  screenshotsController.getScreenshotById
)

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
