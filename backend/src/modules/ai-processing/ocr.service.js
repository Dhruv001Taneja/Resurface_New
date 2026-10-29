
import { createWorker, PSM } from 'tesseract.js'
import logger from '../../utils/logger.js'
import sharp from 'sharp'

const MIN_UPSCALE_WIDTH = 2200
const MAX_IMAGE_PIXELS = 40000000

/**
 * Extract text from screenshots, photographed documents and question papers.
 * Supports local paths, URLs and in-memory Buffers.
 */
export const extractTextFromImage = async (imageSource) => {
  const sourceDesc = Buffer.isBuffer(imageSource)
    ? `in-memory buffer (${imageSource.length} bytes)`
    : typeof imageSource === 'string'
      ? imageSource.startsWith('http')
        ? 'remote image URL'
        : imageSource
      : 'image stream'

  logger.info(`Starting OCR extraction for: ${sourceDesc}`)

  let worker = null

  try {
    let originalBuffer

    // Load remote images into memory first so preprocessing is consistent.
    if (
      typeof imageSource === 'string' &&
      /^https?:\/\//i.test(imageSource)
    ) {
      const response = await fetch(imageSource, {
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        throw new Error(`Image download failed: HTTP ${response.status}`)
      }

      const contentType = response.headers.get('content-type') || ''

      if (!contentType.startsWith('image/')) {
        throw new Error('The supplied URL did not return an image.')
      }

      const arrayBuffer = await response.arrayBuffer()

      if (arrayBuffer.byteLength > 25 * 1024 * 1024) {
        throw new Error('Image exceeds the 25 MB OCR processing limit.')
      }

      originalBuffer = Buffer.from(arrayBuffer)
    } else if (Buffer.isBuffer(imageSource)) {
      originalBuffer = imageSource
    } else if (typeof imageSource === 'string') {
      originalBuffer = imageSource
    } else {
      throw new Error('Unsupported OCR image source.')
    }

    // Auto-rotate according to EXIF metadata, preserve page details,
    // and create several preprocessing variants for comparison.
    const baseImage = sharp(originalBuffer, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: 'none',
    }).rotate()

    const metadata = await baseImage.metadata()

    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions.')
    }

    logger.info(
      `OCR image dimensions: ${metadata.width}x${metadata.height}`
    )

    const upscale =
      metadata.width < MIN_UPSCALE_WIDTH
        ? MIN_UPSCALE_WIDTH / metadata.width
        : 1

    const outputWidth = Math.min(
      Math.round(metadata.width * upscale),
      3200
    )

    // Variant 1: grayscale, enhanced contrast, sharpened.
    // Avoid aggressive thresholding as the default because it can
    // erase faint text, punctuation, and characters in photographed pages.
    const enhancedBuffer = await sharp(originalBuffer, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: 'none',
    })
      .rotate()
      .resize({
        width: outputWidth,
        withoutEnlargement: false,
        fit: 'inside',
      })
      .grayscale()
      .normalize()
      .sharpen({
        sigma: 1.2,
        m1: 0.7,
        m2: 2,
      })
      .png()
      .toBuffer()

    // Variant 2: a clean, thresholded image for cases where the
    // original photograph has shadows or an uneven background.
    const thresholdBuffer = await sharp(enhancedBuffer)
      .normalize()
      .threshold(165)
      .png()
      .toBuffer()

    // Variant 3: grayscale without hard thresholding. This can retain
    // faint text that disappears in black-and-white conversion.
    const grayscaleBuffer = await sharp(originalBuffer, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: 'none',
    })
      .rotate()
      .resize({
        width: outputWidth,
        withoutEnlargement: false,
        fit: 'inside',
      })
      .grayscale()
      .normalize()
      .png()
      .toBuffer()

    logger.info(
      `OCR preprocessing complete. Recognition width: ${outputWidth}px`
    )

    worker = await createWorker('eng')

    const variants = [
      {
        name: 'enhanced-document',
        buffer: enhancedBuffer,
        psm: PSM.AUTO,
      },
      {
        name: 'single-column',
        buffer: grayscaleBuffer,
        psm: PSM.SINGLE_COLUMN,
      },
      {
        name: 'uniform-block',
        buffer: grayscaleBuffer,
        psm: PSM.SINGLE_BLOCK,
      },
      {
        name: 'thresholded-document',
        buffer: thresholdBuffer,
        psm: PSM.AUTO,
      },
    ]

    let bestResult = {
      text: '',
      confidence: 0,
      score: -1,
      variant: 'none',
    }

    for (const variant of variants) {
      await worker.setParameters({
        tessedit_pageseg_mode: variant.psm,
        preserve_interword_spaces: '1',
      })

      const result = await worker.recognize(variant.buffer)

      const text = (result.data.text || '').trim()
      const confidence = Number(result.data.confidence) || 0

      // Prefer meaningful text and confidence, while avoiding a result
      // that contains only a few high-confidence characters.
      const wordCount = text.split(/\s+/).filter(Boolean).length
      const usefulCharacters = (text.match(/[a-zA-Z0-9]/g) || []).length
      const replacementCharacters = (text.match(/\uFFFD/g) || []).length

      const score =
        usefulCharacters +
        wordCount * 3 +
        confidence * 0.8 -
        replacementCharacters * 20

      logger.info(
        `OCR variant ${variant.name}: ${text.length} chars, ` +
          `${confidence.toFixed(1)}% confidence, score ${score.toFixed(1)}`
      )

      if (score > bestResult.score) {
        bestResult = {
          text,
          confidence,
          score,
          variant: variant.name,
        }
      }
    }

    await worker.terminate()
    worker = null

    const text = bestResult.text

    logger.info(
      `OCR completed using ${bestResult.variant}: ` +
        `${bestResult.confidence.toFixed(1)}% confidence, ` +
        `${text.length} characters`
    )

    // Keep original paragraph boundaries while removing excessive
    // blank lines and trailing whitespace.
    const cleanedText = text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Log only a short preview.
    const preview = cleanedText
      .replace(/\s+/g, ' ')
      .slice(0, 120)

    logger.info(
      `OCR preview: ${preview}${cleanedText.length > 120 ? '...' : ''}`
    )

    return {
      text: cleanedText,
      confidence: bestResult.confidence,
      variant: bestResult.variant,
    }
  } catch (error) {
    logger.error(
      `OCR processing failed for ${sourceDesc}:`,
      error.message
    )

    return {
      text: '',
      confidence: 0,
      error: error.message,
    }
  } finally {
    if (worker) {
      try {
        await worker.terminate()
      } catch (cleanupError) {
        logger.error(
          'Failed to terminate OCR worker:',
          cleanupError.message
        )
      }
    }
  }
}
