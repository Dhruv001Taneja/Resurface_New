import * as authService from './auth.service.js'

/**
 * Auth Controller — thin layer that handles HTTP request/response.
 * All business logic is delegated to authService.
 */

/**
 * POST /api/v1/auth/register
 */
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required',
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters',
      })
    }

    const result = await authService.registerUser({ name, email, password })

    res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
    })
  } catch (error) {
    console.error('Registration error:', error.message)

    res.status(error.statusCode || 500).json({
      message: error.message || 'Server error',
    })
  }
}

/**
 * POST /api/v1/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      })
    }

    const result = await authService.loginUser({ email, password })

    res.status(200).json({
      message: 'Login successful',
      user: result.user,
      token: result.accessToken,
      refreshToken: result.refreshToken,
    })
  } catch (error) {
    console.error('Login error:', error.message)

    res.status(error.statusCode || 500).json({
      message: error.message || 'Server error',
    })
  }
}

/**
 * GET /api/v1/auth/me
 */
export const getMe = async (req, res) => {
  try {
    const result = await authService.getCurrentUser(req.userId)

    res.status(200).json(result)
  } catch (error) {
    console.error('Get user error:', error.message)

    res.status(error.statusCode || 500).json({
      message: error.message || 'Server error',
    })
  }
}

/**
 * POST /api/v1/auth/logout
 */
export const logout = async (req, res) => {
  // For now, logout is client-side (clear token).
  // In Phase 7 we will add Redis-based token blacklisting.
  res.status(200).json({
    message: 'Logged out successfully',
  })
}
