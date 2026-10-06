import jwt from 'jsonwebtoken'

/**
 * Middleware to verify JWT access token from the Authorization header.
 * Attaches `req.userId` on success.
 */
const authenticateToken = (req, res, next) => {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    return res.status(500).json({
      message: 'JWT secret is not configured',
    })
  }

  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Access token required',
    })
  }

  const token = authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      message: 'Access token required',
    })
  }

  try {
    const decoded = jwt.verify(token, jwtSecret)
    req.userId = decoded.userId
    next()
  } catch (error) {
    return res.status(403).json({
      message: 'Invalid or expired token',
    })
  }
}

export default authenticateToken
