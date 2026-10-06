import logger from '../utils/logger.js'

/**
 * Global error handling middleware for Express.
 * Formats all uncaught errors into standard JSON structure.
 */
const errorHandler = (err, req, res, _next) => {
  logger.error(`[${req.method}] ${req.originalUrl} — ${err.message}`, err.stack)

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : (err.statusCode || 500)

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export default errorHandler
