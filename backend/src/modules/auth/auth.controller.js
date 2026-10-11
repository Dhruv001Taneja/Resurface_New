
import logger from '../../utils/logger.js'
import * as authService from './auth.service.js'

/**
 * Auth Controller — handles HTTP requests and responses.
 * Business logic is delegated to authService.
 */

/**
 * POST /api/v1/auth/register
 */
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {}

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      })
    }

    if (name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 100 characters.',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      })
    }

    const result = await authService.registerUser({
      name: name.trim(),
      email: normalizedEmail,
      password,
    })

    logger.security('REGISTRATION_SUCCESS', {
      email: normalizedEmail,
      ip: req.ip,
    })

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Verify your email to continue.',
      user: result.user,
    })
  } catch (error) {
    logger.security('REGISTRATION_FAILED', {
      ip: req.ip,
      reason: error.statusCode ? 'REGISTRATION_REJECTED' : 'SERVER_ERROR',
    })

    console.error('Registration error:', error.message)

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error.',
    })
  }
}

/**
 * POST /api/v1/auth/login
 */
export const login = async (req, res) => {
  const rawEmail = req.body?.email
  const email =
    typeof rawEmail === 'string'
      ? rawEmail.trim().toLowerCase()
      : undefined

  const ip = req.ip

  try {
    const password = req.body?.password

    if (
      !email ||
      typeof password !== 'string' ||
      !password
    ) {
      logger.security('LOGIN_VALIDATION_FAILED', { ip })

      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      })
    }

    const result = await authService.loginUser({
      email,
      password,
    })

    logger.security('LOGIN_SUCCESS', {
      email,
      ip,
    })

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: result.user,
      token: result.accessToken,
      refreshToken: result.refreshToken,
    })
  } catch (error) {
    logger.security('LOGIN_FAILED', {
      email,
      ip,
      reason:
        error.statusCode === 403
          ? 'EMAIL_NOT_VERIFIED_OR_FORBIDDEN'
          : error.statusCode === 401
            ? 'INVALID_CREDENTIALS'
            : 'AUTHENTICATION_ERROR',
    })

    console.error('Login error:', error.message)

    return res.status(error.statusCode || 500).json({
      success: false,
      ...(error.code && { code: error.code }),
      message: error.message || 'Server error.',
    })
  }
}

/**
 * POST /api/v1/auth/send-otp
 */
export const sendVerificationOtp = async (req, res) => {
  try {
    const { email } = req.body || {}

    if (typeof email !== 'string' || !email.trim()) {
      logger.security('OTP_REQUEST_VALIDATION_FAILED', {
        ip: req.ip,
      })

      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(normalizedEmail)) {
      logger.security('OTP_REQUEST_VALIDATION_FAILED', {
        ip: req.ip,
      })

      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      })
    }

    const result = await authService.sendEmailVerificationOtp(
      normalizedEmail
    )

    logger.security('OTP_REQUEST_SUCCESS', {
      email: normalizedEmail,
      ip: req.ip,
    })

    return res.status(200).json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    logger.security('OTP_REQUEST_FAILED', {
      ip: req.ip,
      reason: error.statusCode ? 'REQUEST_REJECTED' : 'SERVER_ERROR',
    })

    console.error('Send OTP error:', error.message)

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Unable to send verification code.',
    })
  }
}

/**
 * POST /api/v1/auth/verify-otp
 */
export const verifyEmail = async (req, res) => {
  const { email, otp } = req.body || {}

  if (
    typeof email !== 'string' ||
    !email.trim() ||
    typeof otp !== 'string' ||
    !/^\d{6}$/.test(otp)
  ) {
    logger.security('OTP_VALIDATION_FAILED', {
      ip: req.ip,
    })

    return res.status(400).json({
      success: false,
      message: 'A valid email and six-digit OTP are required.',
    })
  }

  const normalizedEmail = email.trim().toLowerCase()

  try {
    const result = await authService.verifyEmailOtp(
      normalizedEmail,
      otp
    )

    logger.security('OTP_VERIFICATION_SUCCESS', {
      email: normalizedEmail,
      ip: req.ip,
    })

    return res.status(200).json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    logger.security('OTP_VERIFICATION_FAILED', {
      email: normalizedEmail,
      ip: req.ip,
      reason: error.statusCode
        ? 'VERIFICATION_REJECTED'
        : 'SERVER_ERROR',
    })

    console.error('Email verification error:', error.message)

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Unable to verify email.',
    })
  }
}

/**
 * GET /api/v1/auth/me
 */
export const getMe = async (req, res) => {
  try {
    const result = await authService.getCurrentUser(req.userId)

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Get user error:', error.message)

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error.',
    })
  }
}

/**
 * POST /api/v1/auth/logout
 */
export const logout = async (_req, res) => {
  // Current logout implementation clears the token on the client.
  // Server-side token revocation is not implemented yet.
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  })
}
