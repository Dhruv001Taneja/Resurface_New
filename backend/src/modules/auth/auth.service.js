import jwt from 'jsonwebtoken'
import User from '../../models/user.js'

/**
 * Auth Service — business logic for authentication.
 * Controllers should call these methods instead of
 * putting business logic inline.
 */

/**
 * Register a new user.
 * @param {Object} data - { name, email, password }
 * @returns {Object} - { user }
 */
export const registerUser = async ({ name, email, password, provider = 'local', providerId = null }) => {
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() })

  if (existingUser) {
    const error = new Error('An account with this email already exists. Please login instead.')
    error.statusCode = 409
    throw error
  }

  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    passwordHash: password, // pre-save hook will hash it
    authProvider: {
      provider: provider || 'local',
      providerId: providerId || null,
    },
    accountInfo: {
      status: 'active',
      role: 'user',
      isVerified: false,
      lastLoginAt: null,
      storageUsed: 0,
    },
  })

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      authProvider: user.authProvider,
      accountInfo: user.accountInfo,
    },
  }
}

/**
 * Login an existing user.
 * @param {Object} data - { email, password }
 * @returns {Object} - { user, accessToken, refreshToken }
 */
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim()
  const user = await User.findOne({ email: normalizedEmail })

  if (!user) {
    const error = new Error('Account not found. Please register first.')
    error.statusCode = 404
    throw error
  }

  const passwordMatch = await user.comparePassword(password)

  if (!passwordMatch) {
    const error = new Error('Incorrect password. Please try again.')
    error.statusCode = 401
    throw error
  }

  // Update last login
  user.lastLoginAt = new Date()
  if (user.accountInfo) {
    user.accountInfo.lastLoginAt = user.lastLoginAt
  }
  await user.save()

  const accessToken = generateAccessToken(user._id)
  const refreshToken = generateRefreshToken(user._id)

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      authProvider: user.authProvider,
      accountInfo: user.accountInfo,
    },
    accessToken,
    refreshToken,
  }
}

/**
 * Get the current authenticated user's profile.
 * @param {string} userId
 * @returns {Object} - { user }
 */
export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).select('-passwordHash')

  if (!user) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      authProvider: user.authProvider,
      accountInfo: user.accountInfo,
      createdAt: user.createdAt,
    },
  }
}

// ---------- Helper functions ----------

function generateAccessToken(userId) {
  return jwt.sign(
    { userId: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  )
}

function generateRefreshToken(userId) {
  return jwt.sign(
    { userId: userId.toString() },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  )
}
