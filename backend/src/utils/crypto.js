import crypto from 'crypto'
import logger from './logger.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96-bit IV recommended for GCM
const TAG_LENGTH = 16 // 128-bit authentication tag
const SALT = 'resurface-secure-crypto-salt-2026'

/**
 * Derives a consistent 32-byte (256-bit) encryption key
 * from ENCRYPTION_KEY or JWT_SECRET using scrypt.
 * @returns {Buffer}
 */
const getEncryptionKey = (customKey) => {
  const secret =
    customKey ||
    process.env.ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'default-resurface-fallback-secret-key-32-chars!'

  return crypto.scryptSync(secret, SALT, 32)
}

/**
 * Encrypt plaintext using AES-256-GCM authenticated encryption.
 * Format: iv:authTag:encryptedData (all in hex)
 *
 * @param {string} text - Plaintext to encrypt
 * @param {string} [customKey] - Optional override key
 * @returns {string} Encrypted string format "iv:tag:ciphertext"
 */
export const encryptAES256GCM = (text, customKey) => {
  if (text === null || text === undefined) return text
  if (typeof text !== 'string') text = String(text)

  const key = getEncryptionKey(customKey)
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  })

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt AES-256-GCM ciphertext and verify authentication tag.
 * Throws an error if ciphertext or tag was tampered with.
 *
 * @param {string} encryptedString - String in "iv:tag:ciphertext" format
 * @param {string} [customKey] - Optional override key
 * @returns {string} Decrypted plaintext
 */
export const decryptAES256GCM = (encryptedString, customKey) => {
  if (!encryptedString || typeof encryptedString !== 'string') {
    return encryptedString
  }

  const parts = encryptedString.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format. Expected iv:tag:ciphertext')
  }

  const [ivHex, tagHex, encryptedHex] = parts
  const key = getEncryptionKey(customKey)
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  })

  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Helper to mask sensitive strings for display (e.g., credit card or password preview)
 * @param {string} text
 * @returns {string}
 */
export const maskSensitiveString = (text) => {
  if (!text || typeof text !== 'string') return ''
  if (text.length <= 4) return '****'
  return `${text.slice(0, 2)}****${text.slice(-2)}`
}
