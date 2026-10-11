
import jwt from 'jsonwebtoken'
import { createHmac, randomInt } from 'node:crypto'
import User from '../../models/user.js'
import { sendOtpEmail } from './email.service.js'

/**
 * Auth Service — business logic for authentication.
 */

// ---------- Registration ----------

export const registerUser = async ({
  name,
  email,
  password,
  provider = 'local',
  providerId = null,
}) => {
  const normalizedEmail = email.toLowerCase().trim()

  const existingUser = await User.findOne({ email: normalizedEmail })

  if (existingUser) {
    const error = new Error(
      'An account with this email already exists. Please login instead.'
    )
    error.statusCode = 409
    throw error
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash: password,
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

// ---------- Login ----------

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

  // Require email verification for local accounts.
  if (
    user.authProvider?.provider === 'local' &&
    !user.accountInfo?.isVerified
  ) {
    const error = new Error(
      'Please verify your email before logging in.'
    )
    error.statusCode = 403
    error.code = 'EMAIL_NOT_VERIFIED'
    throw error
  }

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

// ---------- Send Email Verification OTP ----------

const hashOtp = (otp) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.')
  }

  return createHmac('sha256', process.env.JWT_SECRET)
    .update(String(otp))
    .digest('hex')
}

export const sendEmailVerificationOtp = async (email) => {
  const normalizedEmail = email.toLowerCase().trim()

  const user = await User.findOne({ email: normalizedEmail }).select(
    '+emailVerificationOtpHash ' +
    '+emailVerificationOtpExpiresAt ' +
    '+emailVerificationOtpAttempts ' +
    '+emailVerificationOtpSentAt'
  )

  if (!user) {
    const error = new Error(
      'Account not found. Please register first.'
    )
    error.statusCode = 404
    throw error
  }

  if (user.authProvider?.provider !== 'local') {
    const error = new Error(
      'Email verification is not available for this sign-in method.'
    )
    error.statusCode = 400
    throw error
  }

  if (user.accountInfo?.isVerified) {
    return { message: 'Email is already verified.' }
  }

  if (
    user.emailVerificationOtpSentAt &&
    Date.now() - user.emailVerificationOtpSentAt.getTime() < 60_000
  ) {
    const error = new Error(
      'Please wait 60 seconds before requesting another code.'
    )
    error.statusCode = 429
    throw error
  }

  const otp = String(randomInt(100000, 1000000))

  user.emailVerificationOtpHash = hashOtp(otp)
  user.emailVerificationOtpExpiresAt = new Date(
    Date.now() + 5 * 60_000
  )
  user.emailVerificationOtpAttempts = 0
  user.emailVerificationOtpSentAt = new Date()

  await user.save()

  try {
    await sendOtpEmail({
      to: normalizedEmail,
      otp,
    })
  } catch (err) {
    user.emailVerificationOtpHash = undefined
    user.emailVerificationOtpExpiresAt = undefined
    user.emailVerificationOtpAttempts = 0
    user.emailVerificationOtpSentAt = undefined

    await user.save()

    console.error(
      'Verification email delivery failed:',
      err.code || err.message
    )

    const error = new Error(
      'Unable to send verification email. Please try again later.'
    )
    error.statusCode = 503
    throw error
  }

  return {
    message: 'Verification code sent to your email.',
  }
}

// ---------- Verify Email OTP ----------

export const verifyEmailOtp = async (email, otp) => {
  const normalizedEmail = email.toLowerCase().trim()

  const user = await User.findOne({ email: normalizedEmail }).select(
    '+emailVerificationOtpHash ' +
    '+emailVerificationOtpExpiresAt ' +
    '+emailVerificationOtpAttempts ' +
    '+emailVerificationOtpSentAt'
  )

  if (!user) {
    const error = new Error(
      'Invalid email or verification code.'
    )
    error.statusCode = 400
    throw error
  }

  if (user.authProvider?.provider !== 'local') {
    const error = new Error(
      'Email verification is not available for this sign-in method.'
    )
    error.statusCode = 400
    throw error
  }

  if (user.accountInfo?.isVerified) {
    return { message: 'Email is already verified.' }
  }

  if (
    !user.emailVerificationOtpHash ||
    !user.emailVerificationOtpExpiresAt ||
    user.emailVerificationOtpExpiresAt.getTime() <= Date.now()
  ) {
    const error = new Error(
      'Verification code is missing or expired. Request a new code.'
    )
    error.statusCode = 400
    throw error
  }

  if ((user.emailVerificationOtpAttempts || 0) >= 5) {
    const error = new Error(
      'Too many incorrect attempts. Request a new code.'
    )
    error.statusCode = 429
    throw error
  }

  user.emailVerificationOtpAttempts =
    (user.emailVerificationOtpAttempts || 0) + 1

  if (hashOtp(String(otp)) !== user.emailVerificationOtpHash) {
    await user.save()

    const error = new Error('Incorrect verification code.')
    error.statusCode = 400
    throw error
  }

  // Mark the account as verified.
  user.accountInfo.isVerified = true

  // Clear OTP data after successful verification.
  user.emailVerificationOtpHash = undefined
  user.emailVerificationOtpExpiresAt = undefined
  user.emailVerificationOtpAttempts = 0
  user.emailVerificationOtpSentAt = undefined

  await user.save()

  return {
    message: 'Email verified successfully.',
  }
}

// ---------- Current User ----------

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

// ---------- JWT Helpers ----------

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
