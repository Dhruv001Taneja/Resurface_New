import rateLimit from 'express-rate-limit'

/**
 * Standard JSON response handler for rate limit violations.
 */
const rateLimitHandler = (message) => (req, res) => {
  res.status(429).json({
    success: false,
    error: 'Too Many Requests',
    message,
    retryAfter: res.getHeader('Retry-After') || 60,
  })
}

/**
 * Global API rate limiter:
 * Limits general requests to 300 per 15 minutes per IP.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler('Too many requests from this IP. Please try again after 15 minutes.'),
  skip: (req) => {
    // Skip health check endpoints to allow monitoring probes
    return req.path === '/health' || req.path === '/api/v1/health'
  },
})

/**
 * Sensitive Auth rate limiter:
 * Limits login & registration attempts to 20 per 15 minutes per IP
 * to defend against brute force, credential stuffing, and automated registration spam.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler('Too many authentication attempts. Please try again after 15 minutes.'),
})

/**
 * Screenshot Upload rate limiter:
 * Limits upload requests to 40 per 15 minutes per IP to prevent storage abuse and DoS.
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler('Upload rate limit exceeded. Please wait a few minutes before uploading more screenshots.'),
})
