import Screenshot from '../../models/screenshot.js'

import { storeImage, getMissingCloudinaryConfig } from './storage.service.js'

import { extractTextFromImage } from '../ai-processing/ocr.service.js'

import { analyzeScreenshotWithVision } from '../ai-processing/vision.service.js'

import logger from '../../utils/logger.js'

/**
 * Upload single screenshot and trigger OCR + Vision AI processing pipeline.
 * POST /api/v1/screenshots/upload
 *
 * Pipeline:
 * Upload → OCR → Vision AI → Sensitive Detection → MongoDB
 *
 * If sensitive information is detected:
 * screenshot.isVault = true
 */
export const uploadScreenshot = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided.',
      })
    }

    // Check Cloudinary environment configuration
    const missingConfig = getMissingCloudinaryConfig()

    if (missingConfig.length > 0) {
      const errorMsg =
        `Cloudinary storage is required but missing configuration in backend/.env: ` +
        `${missingConfig.join(', ')}`

      logger.error(`Upload aborted: ${errorMsg}`)

      return res.status(500).json({
        success: false,
        error: errorMsg,
        missingVariables: missingConfig,
      })
    }

    logger.info(
      `Received screenshot upload for user ${req.userId}: ${req.file.originalname}`
    )

    // ─────────────────────────────────────────────
    // STAGE 1: Upload to Cloudinary
    // ─────────────────────────────────────────────
    const storageResult = await storeImage(req.file)

    // Create initial DB record
    const screenshot = new Screenshot({
      user: req.userId,

      originalName: req.file.originalname,

      mimeType: req.file.mimetype,

      size: req.file.size,

      storage: storageResult,

      imageUrl: storageResult.imageUrl,

      thumbnailUrl:
        storageResult.thumbnailUrl || storageResult.imageUrl,

      dimensions: {
        width: storageResult.width || 0,
        height: storageResult.height || 0,
      },

      ocr: {
        status: 'processing',
      },

      aiAnalysis: {
        status: 'pending',
      },

      // New screenshots start outside Vault.
      // AI will change this automatically if sensitive information is found.
      isVault: false,

      processingPipeline: {
        upload: 'completed',
        ocr: 'processing',
        visionAI: 'pending',
        extraction: 'pending',
        overall: 'ocr_processing',
      },
    })

    await screenshot.save()

    // Respond immediately
    res.status(201).json({
      success: true,
      message:
        'Screenshot uploaded to Cloudinary — processing started.',
      data: screenshot,
    })

    // Continue processing in background
    processScreenshotPipeline(
      screenshot,
      storageResult,
      req.file
    ).catch((err) => {
      logger.error(
        `Background pipeline failed for screenshot ${screenshot._id}:`,
        err
      )
    })
  } catch (error) {
    logger.error('Error during screenshot upload:', error)
    next(error)
  }
}

/**
 * Background processing pipeline:
 *
 * OCR
 * ↓
 * Vision AI
 * ↓
 * Sensitive Information Detection
 * ↓
 * Automatically move to Vault if sensitive
 */
async function processScreenshotPipeline(
  screenshot,
  storageResult,
  file
) {
  try {
    // ─────────────────────────────────────────────
    // STAGE 2: OCR
    // ─────────────────────────────────────────────
    logger.info(
      `[Pipeline] Stage 2: OCR processing for ${screenshot._id}`
    )

    // Use memory buffer first.
    // This avoids Cloudinary 403 issues during processing.
    const ocrSource =
      file?.buffer || storageResult.imageUrl

    const ocrResult =
      await extractTextFromImage(ocrSource)

    screenshot.ocr = {
      status: ocrResult.error
        ? 'failed'
        : 'completed',

      extractedText: ocrResult.text || '',

      confidence: ocrResult.confidence || 0,

      processedAt: new Date(),

      error: ocrResult.error || null,
    }

    screenshot.processingPipeline.ocr =
      ocrResult.error
        ? 'failed'
        : 'completed'

    screenshot.processingPipeline.visionAI =
      'processing'

    screenshot.processingPipeline.overall =
      'vision_processing'

    screenshot.aiAnalysis.status =
      'processing'

    await screenshot.save()

    // ─────────────────────────────────────────────
    // STAGE 3: Vision AI
    // ─────────────────────────────────────────────
    logger.info(
      `[Pipeline] Stage 3: Vision AI analysis for ${screenshot._id}`
    )

    const aiResult =
      await analyzeScreenshotWithVision({
        imageUrl: storageResult.imageUrl,

        buffer: file?.buffer || null,

        mimeType:
          file?.mimetype || 'image/png',

        ocrText:
          ocrResult.text || '',
      })

    // ─────────────────────────────────────────────
    // STAGE 4: Save AI results
    // ─────────────────────────────────────────────
    logger.info(
      `[Pipeline] Stage 4: Saving extracted information for ${screenshot._id}`
    )

    screenshot.processingPipeline.visionAI =
      'completed'

    screenshot.processingPipeline.extraction =
      'processing'

    screenshot.processingPipeline.overall =
      'extraction'

    // Parse dates from entities
    const parsedDates =
      (aiResult.entities?.dates || [])
        .map((dStr) => new Date(dStr))
        .filter(
          (d) => !isNaN(d.getTime())
        )

    // Save AI analysis
    screenshot.aiAnalysis = {
      status: 'completed',

      title:
        aiResult.title ||
        'Untitled Screenshot',

      summary:
        aiResult.summary || '',

      category:
        aiResult.category || 'Other',

      tags:
        aiResult.tags || [],

      entities:
        aiResult.entities || {
          dates: [],
          amounts: [],
          urls: [],
          emails: [],
          phoneNumbers: [],
          addresses: [],
          names: [],
        },

      extractedDates:
        aiResult.extractedDates || [],

      extractedTasks:
        aiResult.extractedTasks || [],

      extractedEvents:
        aiResult.extractedEvents || [],

      actionItems:
        aiResult.actionItems || [],

      processedAt: new Date(),
    }
    // 🔐 Automatically move sensitive screenshots to Vault
    if (aiResult.isSensitive === true) {
      screenshot.isVault = true

      logger.info(
        `[Pipeline] 🔐 Screenshot ${screenshot._id} automatically moved to Vault. ` +
        `Sensitive type: ${aiResult.sensitiveType || 'other'}`
      )
    } else {
      screenshot.isVault = false
    }

    // ─────────────────────────────────────────────
    // 🔐 AUTOMATIC VAULT DETECTION
    // ─────────────────────────────────────────────

    if (aiResult.isSensitive === true) {
      screenshot.isVault = true

      logger.info(
        `[Pipeline] 🔐 Screenshot ${screenshot._id} ` +
        `automatically moved to Vault. ` +
        `Sensitive type: ${aiResult.sensitiveType || 'other'
        }`
      )
    } else {
      screenshot.isVault = false

      logger.info(
        `[Pipeline] Screenshot ${screenshot._id} ` +
        `is not sensitive. Keeping in normal Screenshots.`
      )
    }

    screenshot.dates = parsedDates

    // Mark pipeline completed
    screenshot.processingPipeline.extraction =
      'completed'

    screenshot.processingPipeline.overall =
      'completed'

    await screenshot.save()

    logger.info(
      `[Pipeline] ✅ Complete for ${screenshot._id}: ` +
      `"${aiResult.title}" ` +
      `[${aiResult.category}] — ` +
      `${(aiResult.tags || []).join(', ')} ` +
      `| Vault: ${screenshot.isVault}`
    )
  } catch (error) {
    logger.error(
      `[Pipeline] ❌ Failed for ${screenshot._id}:`,
      error
    )

    // Preserve partial results
    try {
      screenshot.aiAnalysis.status = 'failed'

      screenshot.aiAnalysis.error =
        error.message

      screenshot.processingPipeline.overall =
        'failed'

      await screenshot.save()
    } catch (saveErr) {
      logger.error(
        'Failed to save error state:',
        saveErr
      )
    }
  }
}

/**
 * Get user screenshots with search,
 * category filter, and pagination.
 *
 * GET /api/v1/screenshots
 */
export const getScreenshots = async (
  req,
  res,
  next
) => {
  try {
    const {
      category,
      search,
      favorite,
      page = 1,
      limit = 12,
      sort = 'newest',
    } = req.query

    // Only normal screenshots.
    // Vault items are excluded.
    const query = {
      user: req.userId,
      isArchived: false,
      isVault: false,
    }

    if (
      category &&
      category !== 'All'
    ) {
      query['aiAnalysis.category'] =
        new RegExp(
          `^${category}$`,
          'i'
        )
    }

    if (favorite === 'true') {
      query.isFavorite = true
    }

    if (
      search &&
      search.trim()
    ) {
      const safeSearch =
        search
          .trim()
          .replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          )

      const searchRegex =
        new RegExp(
          safeSearch,
          'i'
        )

      query.$or = [
        {
          'aiAnalysis.title':
            searchRegex,
        },
        {
          'aiAnalysis.summary':
            searchRegex,
        },
        {
          'aiAnalysis.category':
            searchRegex,
        },
        {
          'aiAnalysis.tags':
            searchRegex,
        },
        {
          'ocr.extractedText':
            searchRegex,
        },
        {
          originalName:
            searchRegex,
        },
      ]
    }

    const sortOrder =
      sort === 'oldest'
        ? { createdAt: 1 }
        : { createdAt: -1 }

    const parsedLimit =
      Math.max(
        1,
        parseInt(limit) || 12
      )

    const parsedPage =
      Math.max(
        1,
        parseInt(page) || 1
      )

    const skip =
      (parsedPage - 1) *
      parsedLimit

    const [
      screenshots,
      total,
    ] = await Promise.all([
      Screenshot.find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(parsedLimit),

      Screenshot.countDocuments(
        query
      ),
    ])

    res.status(200).json({
      success: true,

      data: screenshots,

      pagination: {
        total,
        page: parsedPage,
        pages:
          Math.ceil(
            total / parsedLimit
          ) || 1,
        limit: parsedLimit,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get screenshot by ID.
 *
 * GET /api/v1/screenshots/:id
 */
export const getScreenshotById = async (
  req,
  res,
  next
) => {
  try {
    const screenshot =
      await Screenshot.findOne({
        _id: req.params.id,
        user: req.userId,
      })

    if (!screenshot) {
      return res.status(404).json({
        success: false,
        error: 'Screenshot not found.',
      })
    }

    res.status(200).json({
      success: true,
      data: screenshot,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Toggle favorite status.
 *
 * PATCH /api/v1/screenshots/:id/favorite
 */
export const toggleFavorite = async (
  req,
  res,
  next
) => {
  try {
    const screenshot =
      await Screenshot.findOne({
        _id: req.params.id,
        user: req.userId,
      })

    if (!screenshot) {
      return res.status(404).json({
        success: false,
        error: 'Screenshot not found.',
      })
    }

    screenshot.isFavorite =
      !screenshot.isFavorite

    await screenshot.save()

    res.status(200).json({
      success: true,
      data: screenshot,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Delete screenshot by ID.
 *
 * DELETE /api/v1/screenshots/:id
 */
export const deleteScreenshot = async (
  req,
  res,
  next
) => {
  try {
    const screenshot =
      await Screenshot.findOne({
        _id: req.params.id,
        user: req.userId,
      })

    if (!screenshot) {
      return res.status(404).json({
        success: false,
        error: 'Screenshot not found.',
      })
    }

    // Attempt to delete from Cloudinary
    const publicId =
      screenshot.storage?.publicId

    if (publicId) {
      const {
        deleteImage,
      } = await import(
        './storage.service.js'
      )

      await deleteImage(publicId)
    }

    // Delete MongoDB record
    await Screenshot.findByIdAndDelete(
      screenshot._id
    )

    res.status(200).json({
      success: true,
      message:
        'Screenshot deleted successfully.',
    })
  } catch (error) {
    logger.error(
      `Error deleting screenshot ${req.params.id}:`,
      error
    )

    next(error)
  }
}

/**
 * Get user's Vault screenshots.
 *
 * GET /api/v1/screenshots/vault
 */
export const getVaultScreenshots = async (
  req,
  res,
  next
) => {
  try {
    const {
      search,
      page = 1,
      limit = 12,
      sort = 'newest',
    } = req.query

    const query = {
      user: req.userId,
      isVault: true,
      isArchived: false,
    }

    // Search Vault items
    if (
      search &&
      search.trim()
    ) {
      const safeSearch =
        search
          .trim()
          .replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          )

      const searchRegex =
        new RegExp(
          safeSearch,
          'i'
        )

      query.$or = [
        {
          'aiAnalysis.title':
            searchRegex,
        },
        {
          'aiAnalysis.summary':
            searchRegex,
        },
        {
          'aiAnalysis.category':
            searchRegex,
        },
        {
          'aiAnalysis.tags':
            searchRegex,
        },
        {
          originalName:
            searchRegex,
        },
      ]
    }

    const sortOrder =
      sort === 'oldest'
        ? { createdAt: 1 }
        : { createdAt: -1 }

    const parsedLimit =
      Math.max(
        1,
        parseInt(limit) || 12
      )

    const parsedPage =
      Math.max(
        1,
        parseInt(page) || 1
      )

    const skip =
      (parsedPage - 1) *
      parsedLimit

    const [
      screenshots,
      total,
    ] = await Promise.all([
      Screenshot.find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(parsedLimit),

      Screenshot.countDocuments(
        query
      ),
    ])

    res.status(200).json({
      success: true,

      data: screenshots,

      pagination: {
        total,
        page: parsedPage,
        pages:
          Math.ceil(
            total / parsedLimit
          ) || 1,
        limit: parsedLimit,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Move an existing screenshot
 * into or out of Vault.
 *
 * PATCH /api/v1/screenshots/:id/vault
 */
export const toggleVault = async (
  req,
  res,
  next
) => {
  try {
    const screenshot =
      await Screenshot.findOne({
        _id: req.params.id,
        user: req.userId,
      })

    if (!screenshot) {
      return res.status(404).json({
        success: false,
        error: 'Screenshot not found.',
      })
    }

    screenshot.isVault =
      !screenshot.isVault

    await screenshot.save()

    res.status(200).json({
      success: true,

      message:
        screenshot.isVault
          ? 'Screenshot moved to Vault.'
          : 'Screenshot removed from Vault.',

      data: screenshot,
    })
  } catch (error) {
    next(error)
  }
}