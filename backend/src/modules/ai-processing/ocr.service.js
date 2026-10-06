import { createWorker } from 'tesseract.js'
import logger from '../../utils/logger.js'

/**
 * Extract OCR text from an image file using Tesseract.js.
 * @param {string} imagePath - Absolute file path or URL to the image
 * @returns {Promise<Object>} { text, confidence }
 */
export const extractTextFromImage = async (imageSource) => {
  const sourceDesc = Buffer.isBuffer(imageSource)
    ? `in-memory buffer (${imageSource.length} bytes)`
    : (typeof imageSource === 'string' ? imageSource : 'image stream')
  logger.info(`Starting OCR extraction for: ${sourceDesc}`)
  let worker = null

  try {
    worker = await createWorker('eng')
    const ret = await worker.recognize(imageSource)
    const text = ret.data.text ? ret.data.text.trim() : ''
    const confidence = ret.data.confidence || 0

    await worker.terminate()

    logger.info(`OCR extraction completed (${confidence.toFixed(1)}% confidence, ${text.length} chars)`)

    return {
      text,
      confidence,
    }
  } catch (error) {
    logger.error(`OCR processing failed for ${sourceDesc}:`, error.message)
    if (worker) {
      try {
        await worker.terminate()
      } catch (_e) {
        // ignore cleanup error
      }
    }
    return {
      text: '',
      confidence: 0,
      error: error.message,
    }
  }
}
