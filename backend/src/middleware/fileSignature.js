import logger from '../utils/logger.js'

/**
 * Supported image signatures (Magic Numbers):
 * - JPEG: FF D8 FF
 * - PNG: 89 50 4E 47 0D 0A 1A 0A
 * - GIF: 47 49 46 38 (GIF87a or GIF89a)
 * - WebP: 52 49 46 46 ... 57 45 42 50 (RIFF....WEBP)
 * - BMP: 42 4D (BM)
 */

/**
 * Inspect buffer magic numbers to determine true image format.
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @returns {string|null} Detected format name or null if unsupported/unknown
 */
export const detectImageSignature = (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg'
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png'
  }

  // GIF: 47 49 46 38 (GIF87a or GIF89a)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'gif'
  }

  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp'
  }

  // BMP: 42 4D
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return 'bmp'
  }

  return null
}

/**
 * Express middleware to validate file signatures of uploaded files.
 * Protects against MIME-type spoofing and malicious files disguised as images.
 */
export const validateFileSignature = (req, res, next) => {
  const filesToVerify = []

  if (req.file) {
    filesToVerify.push(req.file)
  }

  if (Array.isArray(req.files)) {
    filesToVerify.push(...req.files)
  }

  for (const file of filesToVerify) {
    if (!file.buffer) {
      continue
    }

    const detectedType = detectImageSignature(file.buffer)

    if (!detectedType) {
      logger.warn(
        `[Security] File signature validation failed for uploaded file: "${file.originalname}" (claimed MIME: ${file.mimetype})`
      )

      return res.status(400).json({
        success: false,
        error: 'File signature validation failed',
        message: 'The uploaded file content does not match a valid image signature (JPEG, PNG, WebP, GIF, BMP).',
      })
    }

    // Attach verified format to file metadata
    file.verifiedFormat = detectedType
  }

  next()
}
