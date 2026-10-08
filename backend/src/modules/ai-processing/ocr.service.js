import { createWorker } from 'tesseract.js'
import logger from '../../utils/logger.js'
import sharp from 'sharp'

/**
 * Extract OCR text from an image file using Tesseract.js.
 * Includes sharp preprocessing to improve OCR accuracy for posters and screenshots.
 * @param {string|Buffer} imageSource - Absolute file path, URL, or Buffer
 * @returns {Promise<Object>} { text, confidence }
 */
export const extractTextFromImage = async (imageSource) => {
  const sourceDesc = Buffer.isBuffer(imageSource)
    ? `in-memory buffer (${imageSource.length} bytes)`
    : (typeof imageSource === 'string' ? imageSource : 'image stream')
  logger.info(`Starting OCR extraction for: ${sourceDesc}`)
  let worker = null

  try {
    let processableSource = imageSource

    // Preprocessing with sharp
    if (Buffer.isBuffer(imageSource) || (typeof imageSource === 'string' && !imageSource.startsWith('http'))) {
      try {
        let image = sharp(imageSource)
        const metadata = await image.metadata()

        // Upscale the image if it's too small (helps OCR read small text)
        if (metadata.width && metadata.width < 1200) {
          image = image.resize({ width: metadata.width * 2 })
        }

        // Grayscale -> Normalize -> Sharpen -> Binarize(Threshold)
        image = image
          .grayscale()
          .normalize()
          .linear(1.2, 0) // slightly increase contrast
          .sharpen()
          .threshold(128) // apply threshold to create a clean black & white image
          .png()

        processableSource = await image.toBuffer()
        logger.info(`Sharp preprocessing completed successfully.`)
      } catch (sharpError) {
        logger.error(`Sharp preprocessing failed, using original buffer: ${sharpError.message}`)
      }
    } else if (typeof imageSource === 'string' && imageSource.startsWith('http')) {
      try {
        const response = await fetch(imageSource)
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        let image = sharp(buffer)
        const metadata = await image.metadata()

        if (metadata.width && metadata.width < 1200) {
          image = image.resize({ width: metadata.width * 2 })
        }

        image = image
          .grayscale()
          .normalize()
          .linear(1.2, 0)
          .sharpen()
          .threshold(128)
          .png()

        processableSource = await image.toBuffer()
        logger.info(`Sharp preprocessing (from URL) completed successfully.`)
      } catch (err) {
        logger.error(`URL fetch or sharp preprocessing failed, using original URL: ${err.message}`)
      }
    }

    worker = await createWorker('eng')
    
    // PSM 11 is Sparse text. Find as much text as possible in no particular order. Excellent for posters.
    await worker.setParameters({
      tessedit_pageseg_mode: '11',
    })

    const ret = await worker.recognize(processableSource)
    let text = ret.data.text ? ret.data.text.trim() : ''
    let confidence = ret.data.confidence || 0

    // Fallback: Test PSM 6 (Assume a single uniform block of text) if PSM 11 returned almost nothing
    if (text.length < 15) {
      logger.info(`PSM 11 returned low text length (${text.length} chars). Retrying with PSM 6.`)
      await worker.setParameters({
        tessedit_pageseg_mode: '6',
      })
      const ret6 = await worker.recognize(processableSource)
      const text6 = ret6.data.text ? ret6.data.text.trim() : ''
      if (text6.length > text.length) {
        text = text6
        confidence = ret6.data.confidence || 0
        logger.info(`PSM 6 yielded better results (${text.length} chars).`)
      }
    }

    await worker.terminate()

    logger.info(`OCR extraction completed (${confidence.toFixed(1)}% confidence, ${text.length} chars)`)
    
    // Log a safe preview of the OCR output (max 100 chars, no newlines)
    const preview = text.replace(/\n/g, ' ').substring(0, 100)
    logger.info(`OCR Preview: ${preview}${text.length > 100 ? '...' : ''}`)

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
