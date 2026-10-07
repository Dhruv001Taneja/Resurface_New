import Screenshot from '../../models/screenshot.js'
import { storeImage, getMissingCloudinaryConfig } from './storage.service.js'
import { extractTextFromImage } from '../ai-processing/ocr.service.js'
import { analyzeScreenshotWithVision } from '../ai-processing/vision.service.js'
import logger from '../../utils/logger.js'

/**
 * Upload single screenshot and trigger OCR + Vision AI processing pipeline.
 * POST /api/v1/screenshots/upload
 *
 * Pipeline:  Upload (Cloudinary) → OCR → Vision AI (Cloudinary image) → Information Extraction → MongoDB save
 */
export const uploadScreenshot = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided.' })
    }

    // Check Cloudinary environment configuration
    const missingConfig = getMissingCloudinaryConfig()
    if (missingConfig.length > 0) {
      const errorMsg = `Cloudinary storage is required but missing configuration in backend/.env: ${missingConfig.join(', ')}`
      logger.error(`Upload aborted: ${errorMsg}`)
      return res.status(500).json({
        success: false,
        error: errorMsg,
        missingVariables: missingConfig,
      })
    }

    logger.info(`Received screenshot upload for user ${req.userId}: ${req.file.originalname}`)

    // ─── STAGE 1: Upload directly to Cloudinary (in-memory stream, no local disk storage) ───
    const storageResult = await storeImage(req.file)

    // Create initial DB record with pipeline status
    const screenshot = new Screenshot({
      user: req.userId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storage: storageResult,
      imageUrl: storageResult.imageUrl,
      thumbnailUrl: storageResult.thumbnailUrl || storageResult.imageUrl,
      dimensions: {
        width: storageResult.width || 0,
        height: storageResult.height || 0,
      },
      ocr: { status: 'processing' },
      aiAnalysis: { status: 'pending' },
      processingPipeline: {
        upload: 'completed',
        ocr: 'processing',
        visionAI: 'pending',
        extraction: 'pending',
        overall: 'ocr_processing',
      },
    })

    await screenshot.save()

    // Respond immediately with initial data (processing happens next)
    // This allows the frontend to show the screenshot card right away
    res.status(201).json({
      success: true,
      message: 'Screenshot uploaded to Cloudinary — processing started.',
      data: screenshot,
    })

    // ─── Continue processing in background (after response sent) ───
    processScreenshotPipeline(screenshot, storageResult, req.file).catch((err) => {
      logger.error(`Background pipeline failed for screenshot ${screenshot._id}:`, err)
    })
  } catch (error) {
    logger.error('Error during screenshot upload:', error)
    next(error)
  }
}

/**
 * Background processing pipeline: OCR → Vision AI → Information Extraction → MongoDB save.
 * Runs after the initial response is sent to the client.
 */
async function processScreenshotPipeline(screenshot, storageResult, file) {
  try {
    // ─── STAGE 2: OCR Text Extraction ───
    logger.info(`[Pipeline] Stage 2: OCR processing for ${screenshot._id}`)

    // Process from memory buffer or Cloudinary secure_url (no local file path)
    const ocrSource = file?.buffer || storageResult.imageUrl
    const ocrResult = await extractTextFromImage(ocrSource)

    screenshot.ocr = {
      status: ocrResult.error ? 'failed' : 'completed',
      extractedText: ocrResult.text || '',
      confidence: ocrResult.confidence || 0,
      processedAt: new Date(),
      error: ocrResult.error || null,
    }

    screenshot.processingPipeline.ocr = ocrResult.error ? 'failed' : 'completed'
    screenshot.processingPipeline.visionAI = 'processing'
    screenshot.processingPipeline.overall = 'vision_processing'
    screenshot.aiAnalysis.status = 'processing'

    await screenshot.save()

    // ─── STAGE 3: Vision AI (Multimodal — Cloudinary image + OCR text) ───
    logger.info(`[Pipeline] Stage 3: Vision AI analysis for ${screenshot._id} using Cloudinary URL`)

    const aiResult = await analyzeScreenshotWithVision({
      imageUrl: storageResult.imageUrl,
      buffer: file?.buffer || null,
      mimeType: file?.mimetype || 'image/png',
      ocrText: ocrResult.text || '',
    })

    // ─── STAGE 4: Information Extraction & MongoDB Update ───
    logger.info(`[Pipeline] Stage 4: Saving extracted information for ${screenshot._id}`)

    screenshot.processingPipeline.visionAI = 'completed'
    screenshot.processingPipeline.extraction = 'processing'
    screenshot.processingPipeline.overall = 'extraction'

    // Parse dates from entities
    const parsedDates = (aiResult.entities?.dates || [])
      .map((dStr) => new Date(dStr))
      .filter((d) => !isNaN(d.getTime()))

    screenshot.aiAnalysis = {
      status: 'completed',
      title: aiResult.title || 'Untitled Screenshot',
      summary: aiResult.summary || '',
      category: aiResult.category || 'Other',
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

    screenshot.dates = parsedDates

    // Mark pipeline as completed
    screenshot.processingPipeline.extraction = 'completed'
    screenshot.processingPipeline.overall = 'completed'

    await screenshot.save()

    logger.info(
      `[Pipeline] ✅ Complete for ${screenshot._id}: "${aiResult.title}" [${aiResult.category}] — ${(aiResult.tags || []).join(', ')}`
    )
  } catch (error) {
    logger.error(`[Pipeline] ❌ Failed for ${screenshot._id}:`, error)

    // Mark as failed but preserve any partial results
    try {
      screenshot.aiAnalysis.status = 'failed'
      screenshot.aiAnalysis.error = error.message
      screenshot.processingPipeline.overall = 'failed'
      await screenshot.save()
    } catch (_saveErr) {
      logger.error('Failed to save error state:', _saveErr)
    }
  }
}

/**
 * Get user screenshots with search, category filter, and pagination.
 * GET /api/v1/screenshots
 */
export const getScreenshots = async (req, res, next) => {
  try {
    const { category, search, favorite, page = 1, limit = 12, sort = 'newest' } = req.query

    const query = { user: req.userId, isArchived: false, isVault: false }

    if (category && category !== 'All') {
      query['aiAnalysis.category'] = new RegExp(`^${category}$`, 'i')
    }

    if (favorite === 'true') {
      query.isFavorite = true
    }

    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

    const sortOrder = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 }
    const parsedLimit = Math.max(1, parseInt(limit) || 12)
    const parsedPage = Math.max(1, parseInt(page) || 1)
    const skip = (parsedPage - 1) * parsedLimit

    const [screenshots, total] = await Promise.all([
      Screenshot.find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(parsedLimit),
      Screenshot.countDocuments(query),
    ])

    res.status(200).json({
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
 * Get screenshot by ID.
 * GET /api/v1/screenshots/:id
 */
export const getScreenshotById = async (req, res, next) => {
  try {
    const screenshot = await Screenshot.findOne({ _id: req.params.id, user: req.userId })

    if (!screenshot) {
      return res.status(404).json({ success: false, error: 'Screenshot not found.' })
    }

    res.status(200).json({ success: true, data: screenshot })
  } catch (error) {
    next(error)
  }
}

/**
 * Toggle favorite status.
 * PATCH /api/v1/screenshots/:id/favorite
 */
export const toggleFavorite = async (req, res, next) => {
  try {
    const screenshot = await Screenshot.findOne({ _id: req.params.id, user: req.userId })

    if (!screenshot) {
      return res.status(404).json({ success: false, error: 'Screenshot not found.' })
    }

    screenshot.isFavorite = !screenshot.isFavorite
    await screenshot.save()

    res.status(200).json({ success: true, data: screenshot })
  } catch (error) {
    next(error)
  }
}

/**
 * Delete screenshot by ID.
 * DELETE /api/v1/screenshots/:id
 */
export const deleteScreenshot = async (req, res, next) => {
  try {
    const screenshot = await Screenshot.findOne({ _id: req.params.id, user: req.userId })

    if (!screenshot) {
      return res.status(404).json({ success: false, error: 'Screenshot not found.' })
    }

    // Attempt to delete from Cloudinary if publicId exists
    const publicId = screenshot.storage?.publicId
    if (publicId) {
      const { deleteImage } = await import('./storage.service.js')
      await deleteImage(publicId)
    }

    // If Cloudinary delete succeeds (or no publicId exists), delete from MongoDB
    await Screenshot.findByIdAndDelete(screenshot._id)

    res.status(200).json({ success: true, message: 'Screenshot deleted successfully.' })
  } catch (error) {
    logger.error(`Error deleting screenshot ${req.params.id}:`, error)
    next(error)
  }
}
