import { v2 as cloudinary } from 'cloudinary'
import logger from '../../utils/logger.js'

/**
 * Check which Cloudinary environment variables are missing from process.env.
 * @returns {string[]} Array of missing variable names.
 */
export const getMissingCloudinaryConfig = () => {
  const missing = []
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_CLOUD_NAME.trim()) {
    missing.push('CLOUDINARY_CLOUD_NAME')
  }
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_KEY.trim()) {
    missing.push('CLOUDINARY_API_KEY')
  }
  if (!process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_API_SECRET.trim()) {
    missing.push('CLOUDINARY_API_SECRET')
  }
  return missing
}

/**
 * Verify whether Cloudinary is fully configured.
 * @returns {boolean}
 */
export const isCloudinaryConfigured = () => {
  return getMissingCloudinaryConfig().length === 0
}

/**
 * Configure the Cloudinary SDK using environment variables.
 */
const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })
}

/**
 * Upload an in-memory image buffer to Cloudinary using upload_stream.
 * No file is written to or stored permanently on the local server.
 *
 * @param {Object} file - Multer file object with file.buffer and file.originalname
 * @returns {Promise<Object>} Storage metadata including Cloudinary secure_url and public_id
 */
export const storeImage = async (file) => {
  const missingVars = getMissingCloudinaryConfig()

  if (missingVars.length > 0) {
    const errorMsg = `Cloudinary credentials missing in backend/.env: ${missingVars.join(', ')}. Image cannot be stored locally because permanent local storage has been disabled.`
    logger.error(`❌ ${errorMsg}`)
    throw new Error(errorMsg)
  }

  configureCloudinary()

  if (!file.buffer && file.path) {
    // If somehow a path exists (e.g. from tests), read it or upload directly
    try {
      logger.info(`Uploading image "${file.originalname}" from file path to Cloudinary...`)
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'resecure/screenshots',
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
      })

      const thumbnailUrl = cloudinary.url(result.public_id, {
        width: 400,
        height: 400,
        crop: 'limit',
        secure: true,
      })

      logger.info(`✅ Cloudinary upload successful: ${result.secure_url} (Public ID: ${result.public_id})`)

      return {
        provider: 'cloudinary',
        imageUrl: result.secure_url,
        thumbnailUrl: thumbnailUrl || result.secure_url,
        publicId: result.public_id,
        localPath: null,
        width: result.width || 0,
        height: result.height || 0,
        format: result.format || '',
        bytes: result.bytes || 0,
      }
    } catch (error) {
      logger.error('❌ Cloudinary upload failed:', error.message)
      throw new Error(`Cloudinary upload failed: ${error.message}`)
    }
  }

  if (!file.buffer) {
    throw new Error('No image buffer provided for Cloudinary upload.')
  }

  return new Promise((resolve, reject) => {
    logger.info(`Uploading image buffer "${file.originalname || 'screenshot'}" (${file.size || file.buffer.length} bytes) to Cloudinary...`)

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'resecure/screenshots',
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          logger.error('❌ Cloudinary upload_stream failed:', error.message)
          return reject(new Error(`Cloudinary upload failed: ${error.message}`))
        }

        const thumbnailUrl = cloudinary.url(result.public_id, {
          width: 400,
          height: 400,
          crop: 'limit',
          secure: true,
        })

        logger.info(`✅ Cloudinary upload successful: ${result.secure_url} (Public ID: ${result.public_id})`)

        resolve({
          provider: 'cloudinary',
          imageUrl: result.secure_url,
          thumbnailUrl: thumbnailUrl || result.secure_url,
          publicId: result.public_id,
          localPath: null, // Never stored locally
          width: result.width || 0,
          height: result.height || 0,
          format: result.format || '',
          bytes: result.bytes || 0,
        })
      }
    )

    uploadStream.end(file.buffer)
  })
}

/**
 * Delete an image from Cloudinary using its public_id.
 * No local file is deleted since images are not stored permanently on the local server.
 *
 * @param {string} publicId - The Cloudinary public_id of the image
 * @returns {Promise<Object>} The Cloudinary deletion result
 */
export const deleteImage = async (publicId) => {
  if (!publicId) return null;

  const missingVars = getMissingCloudinaryConfig()
  if (missingVars.length > 0) {
    const errorMsg = `Cloudinary credentials missing in backend/.env: ${missingVars.join(', ')}`
    logger.error(`❌ ${errorMsg}`)
    throw new Error(errorMsg)
  }

  configureCloudinary()

  try {
    logger.info(`Deleting image with public ID "${publicId}" from Cloudinary...`)
    const result = await cloudinary.uploader.destroy(publicId)
    
    if (result.result === 'ok') {
      logger.info(`✅ Cloudinary delete successful: ${publicId}`)
    } else {
      logger.warn(`⚠️ Cloudinary delete returned: ${result.result} for ${publicId}`)
    }
    
    return result
  } catch (error) {
    logger.error('❌ Cloudinary delete failed:', error.message)
    throw new Error(`Cloudinary delete failed: ${error.message}`)
  }
}
