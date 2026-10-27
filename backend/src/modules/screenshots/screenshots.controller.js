import Screenshot from '../../models/screenshot.js'
import {
  storeImage,
  getMissingCloudinaryConfig,
} from './storage.service.js'
import { extractTextFromImage } from '../ai-processing/ocr.service.js'
import { analyzeScreenshotWithVision } from '../ai-processing/vision.service.js'
import logger from '../../utils/logger.js'

/**
 * Upload a screenshot and trigger OCR + Vision AI processing.
 */
export const uploadScreenshot = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided.',
      })
    }

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

    // Stage 1: Upload image.
    const storageResult = await storeImage(req.file)

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

    res.status(201).json({
      success: true,
      message:
        'Screenshot uploaded to Cloudinary — processing started.',
      data: screenshot,
    })

    // Continue processing in the background.
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
 * OCR → Vision AI → Sensitive Information Detection → Vault classification.
 */
async function processScreenshotPipeline(
  screenshot,
  storageResult,
  file
) {
  try {
    // Stage 2: OCR.
    logger.info(
      `[Pipeline] Stage 2: OCR processing for ${screenshot._id}`
    )

    const ocrSource = file?.buffer || storageResult.imageUrl
    const ocrResult = await extractTextFromImage(ocrSource)

    screenshot.ocr = {
      status: ocrResult.error ? 'failed' : 'completed',
      extractedText: ocrResult.text || '',
      confidence: ocrResult.confidence || 0,
      processedAt: new Date(),
      error: ocrResult.error || null,
    }

    screenshot.processingPipeline.ocr =
      ocrResult.error ? 'failed' : 'completed'
    screenshot.processingPipeline.visionAI = 'processing'
    screenshot.processingPipeline.overall = 'vision_processing'
    screenshot.aiAnalysis.status = 'processing'

    await screenshot.save()

    // Stage 3: Vision AI.
    logger.info(
      `[Pipeline] Stage 3: Vision AI analysis for ${screenshot._id}`
    )

    const aiResult = await analyzeScreenshotWithVision({
      imageUrl: storageResult.imageUrl,
      buffer: file?.buffer || null,
      mimeType: file?.mimetype || 'image/png',
      ocrText: ocrResult.text || '',
    })

    // Stage 4: Save AI results.
    logger.info(
      `[Pipeline] Stage 4: Saving extracted information for ${screenshot._id}`
    )

    screenshot.processingPipeline.visionAI = 'completed'
    screenshot.processingPipeline.extraction = 'processing'
    screenshot.processingPipeline.overall = 'extraction'

    const parsedDates = (aiResult.entities?.dates || [])
      .map((dateString) => new Date(dateString))
      .filter((date) => !Number.isNaN(date.getTime()))

    screenshot.aiAnalysis = {
      status: 'completed',
      title: aiResult.title || 'Untitled Screenshot',
      summary: aiResult.summary || '',
      category: aiResult.category || 'Other',
      isSensitive: aiResult.isSensitive === true,
      sensitiveType: aiResult.sensitiveType || 'none',
      tags: aiResult.tags || [],
      entities: aiResult.entities || {
        dates: [],
        amounts: [],
        urls: [],
        emails: [],
        phoneNumbers: [],
        addresses: [],
        names: [],
      },
      extractedDates: aiResult.extractedDates || [],
      extractedTasks: aiResult.extractedTasks || [],
      extractedEvents: aiResult.extractedEvents || [],
      actionItems: aiResult.actionItems || [],
      processedAt: new Date(),
    }

    // Automatically classify sensitive screenshots into Vault.
    if (aiResult.isSensitive === true) {
      screenshot.isVault = true

      logger.info(
        `[Pipeline] Screenshot ${screenshot._id} automatically moved to Vault. ` +
        `Sensitive type: ${aiResult.sensitiveType || 'other'}`
      )
    } else {
      screenshot.isVault = false

      logger.info(
        `[Pipeline] Screenshot ${screenshot._id} is not sensitive. ` +
        'Keeping in normal Screenshots.'
      )
    }

    screenshot.dates = parsedDates
    screenshot.processingPipeline.extraction = 'completed'
    screenshot.processingPipeline.overall = 'completed'

    await screenshot.save()

    logger.info(
      `[Pipeline] Complete for ${screenshot._id}: ` +
      `"${aiResult.title}" [${aiResult.category}] — ` +
      `${(aiResult.tags || []).join(', ')} | Vault: ${screenshot.isVault}`
    )
  } catch (error) {
    logger.error(
      `[Pipeline] Failed for ${screenshot._id}:`,
      error
    )

    // Preserve partial results if processing fails.
    try {
      screenshot.aiAnalysis.status = 'failed'
      screenshot.aiAnalysis.error = error.message
      screenshot.processingPipeline.overall = 'failed'

      await screenshot.save()
    } catch (saveError) {
      logger.error('Failed to save error state:', saveError)
    }
  }
}

/**
 * Get normal screenshots with search, category filtering,
 * favorites filtering, sorting, and pagination.
 */
export const getScreenshots = async (req, res, next) => {
  try {
    const {
      category,
      search,
      favorite,
      page = 1,
      limit = 12,
      sort = 'newest',
    } = req.query

    // Vault screenshots must not appear in the normal gallery.
    const query = {
      user: req.userId,
      isArchived: false,
      isVault: false,
    }

    if (category && category !== 'All') {
      query['aiAnalysis.category'] = new RegExp(
        `^${category}$`,
        'i'
      )
    }

    if (favorite === 'true') {
      query.isFavorite = true
    }

    if (typeof search === 'string' && search.trim()) {
      const safeSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      const searchRegex = new RegExp(safeSearch, 'i')

      query.$or = [
        { 'aiAnalysis.title': searchRegex },
        { 'aiAnalysis.summary': searchRegex },
        { 'aiAnalysis.category': searchRegex },
        { 'aiAnalysis.tags': searchRegex },
        { 'ocr.extractedText': searchRegex },
        { originalName: searchRegex },
      ]
    }

    const sortOrder =
      sort === 'oldest'
        ? { createdAt: 1 }
        : { createdAt: -1 }

    const parsedLimit = Math.max(1, parseInt(limit, 10) || 12)
    const parsedPage = Math.max(1, parseInt(page, 10) || 1)
    const skip = (parsedPage - 1) * parsedLimit

    const [screenshots, total] = await Promise.all([
      Screenshot.find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(parsedLimit),
      Screenshot.countDocuments(query),
    ])

    return res.status(200).json({
      success: true,
      data: screenshots,
      pagination: {
        total,
        page: parsedPage,
        pages: Math.ceil(total / parsedLimit) || 1,
        limit: parsedLimit,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get a screenshot by ID.
 * Vault screenshots require verified Vault access middleware.
 */
export const getScreenshotById = async (req, res, next) => {
  try {
    const screenshot = await Screenshot.findOne({
      _id: req.params.id,
      user: req.userId,
    })

    if (!screenshot) {
      return res.status(404).json({
        success: false,
        error: 'Screenshot not found.',
      })
    }

    if (screenshot.isVault && !req.vaultUnlocked) {
      return res.status(403).json({
        success: false,
        error: 'Unlock Vault to view this screenshot.',
      })
    }

    return res.status(200).json({
      success: true,
      data: screenshot,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Toggle favorite status.
 */
export const toggleFavorite = async (req, res, next) => {
  try {
    const screenshot = await Screenshot.findOne({
      _id: req.params.id,
      user: req.userId,
    })

    if (!screenshot) {
      return res.status(404).json({
        success: false,
        error: 'Screenshot not found.',
      })
    }

    if (screenshot.isVault && !req.vaultUnlocked) {
      return res.status(403).json({
        success: false,
        error: 'Unlock Vault to modify this screenshot.',
      })
    }

    screenshot.isFavorite = !screenshot.isFavorite
    await screenshot.save()

    return res.status(200).json({
      success: true,
      data: screenshot,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Delete a screenshot by ID.
 */
export const deleteScreenshot = async (req, res, next) => {
  try {
    const screenshot = await Screenshot.findOne({
      _id: req.params.id,
      user: req.userId,
    })

    if (!screenshot) {
      return res.status(404).json({
        success: false,
        error: 'Screenshot not found.',
      })
    }

    if (screenshot.isVault && !req.vaultUnlocked) {
      return res.status(403).json({
        success: false,
        error: 'Unlock Vault to delete this screenshot.',
      })
    }

    // Attempt to delete the image from Cloudinary.
    const publicId = screenshot.storage?.publicId

    if (publicId) {
      const { deleteImage } = await import('./storage.service.js')
      await deleteImage(publicId)
    }

    await Screenshot.findByIdAndDelete(screenshot._id)

    return res.status(200).json({
      success: true,
      message: 'Screenshot deleted successfully.',
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
 * Get the user's Vault screenshots.
 * Protect this route with requireVaultAccess middleware.
 */
export const getVaultScreenshots = async (req, res, next) => {
  try {
    if (!req.vaultUnlocked) {
      return res.status(403).json({
        success: false,
        error: 'Unlock Vault to continue.',
      })
    }

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

    if (typeof search === 'string' && search.trim()) {
      const safeSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      const searchRegex = new RegExp(safeSearch, 'i')

      query.$or = [
        { 'aiAnalysis.title': searchRegex },
        { 'aiAnalysis.summary': searchRegex },
        { 'aiAnalysis.category': searchRegex },
        { 'aiAnalysis.tags': searchRegex },
        { originalName: searchRegex },
      ]
    }

    const sortOrder =
      sort === 'oldest'
        ? { createdAt: 1 }
        : { createdAt: -1 }

    const parsedLimit = Math.max(1, parseInt(limit, 10) || 12)
    const parsedPage = Math.max(1, parseInt(page, 10) || 1)
    const skip = (parsedPage - 1) * parsedLimit

    const [screenshots, total] = await Promise.all([
      Screenshot.find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(parsedLimit),
      Screenshot.countDocuments(query),
    ])

    return res.status(200).json({
      success: true,
      data: screenshots,
      pagination: {
        total,
        page: parsedPage,
        pages: Math.ceil(total / parsedLimit) || 1,
        limit: parsedLimit,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Move an existing screenshot into or out of Vault.
 * Protect this route with requireVaultAccess middleware.
 */
export const toggleVault = async (req, res, next) => {
  try {
    if (!req.vaultUnlocked) {
      return res.status(403).json({
        success: false,
        error: 'Unlock Vault to continue.',
      })
    }

    const screenshot = await Screenshot.findOne({
      _id: req.params.id,
      user: req.userId,
    })

    if (!screenshot) {
      return res.status(404).json({
        success: false,
        error: 'Screenshot not found.',
      })
    }

    screenshot.isVault = !screenshot.isVault
    await screenshot.save()

    return res.status(200).json({
      success: true,
      message: screenshot.isVault
        ? 'Screenshot moved to Vault.'
        : 'Screenshot removed from Vault.',
      data: screenshot,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update an extracted date in a screenshot.
 */
export const updateExtractedDate = async (req, res, next) => {
  try {
    const { category, itemIndex, newDate } = req.body

    if (
      !category ||
      itemIndex === undefined ||
      !newDate
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      })
    }

    const screenshot = await Screenshot.findOne({
      _id: req.params.id,
      user: req.userId,
    })

    if (!screenshot) {
      return res.status(404).json({
        success: false,
        error: 'Screenshot not found',
      })
    }

    if (screenshot.isVault && !req.vaultUnlocked) {
      return res.status(403).json({
        success: false,
        error: 'Unlock Vault to modify this screenshot.',
      })
    }

    const parsedDate = new Date(newDate)

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date provided',
      })
    }

    let targetArray
    let dateField

    switch (category) {
      case 'extractedTasks':
        targetArray = screenshot.aiAnalysis.extractedTasks
        dateField = 'dueDate'
        break
      case 'actionItems':
        targetArray = screenshot.aiAnalysis.actionItems
        dateField = 'dueDate'
        break
      case 'extractedEvents':
        targetArray = screenshot.aiAnalysis.extractedEvents
        dateField = 'date'
        break
      case 'extractedDates':
        targetArray = screenshot.aiAnalysis.extractedDates
        dateField = 'dateText'
        break
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid category',
        })
    }

    if (!targetArray || !targetArray[itemIndex]) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in specified category',
      })
    }

    targetArray[itemIndex][dateField] = newDate

    screenshot.markModified(`aiAnalysis.${category}`)
    await screenshot.save()

    return res.status(200).json({
      success: true,
      data: screenshot,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Dismiss an action item inside a screenshot.
 */
export const dismissActionItem = async (req, res, next) => {
  try {
    const { category, itemIndex } = req.body

    if (
      !category ||
      itemIndex === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      })
    }

    const screenshot = await Screenshot.findOne({
      _id: req.params.id,
      user: req.userId,
    })

    if (!screenshot) {
      return res.status(404).json({
        success: false,
        error: 'Screenshot not found',
      })
    }

    if (screenshot.isVault && !req.vaultUnlocked) {
      return res.status(403).json({
        success: false,
        error: 'Unlock Vault to modify this screenshot.',
      })
    }

    let targetArray

    switch (category) {
      case 'extractedTasks':
        targetArray = screenshot.aiAnalysis.extractedTasks
        break
      case 'actionItems':
        targetArray = screenshot.aiAnalysis.actionItems
        break
      case 'extractedEvents':
        targetArray = screenshot.aiAnalysis.extractedEvents
        break
      case 'extractedDates':
        targetArray = screenshot.aiAnalysis.extractedDates
        break
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid category',
        })
    }

    if (!targetArray || !targetArray[itemIndex]) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in specified category',
      })
    }

    targetArray[itemIndex].isDismissed = true

    screenshot.markModified(`aiAnalysis.${category}`)
    await screenshot.save()

    return res.status(200).json({
      success: true,
      data: screenshot,
    })
  } catch (error) {
    next(error)
  }
}