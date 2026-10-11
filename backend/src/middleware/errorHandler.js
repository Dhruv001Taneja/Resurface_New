
import logger from '../utils/logger.js'

const errorHandler = (err, req, res, _next) => {
  logger.error(
    `[${req.method}] ${req.path} - ${err.message}`,
    process.env.NODE_ENV === 'development' ? err.stack : undefined
  )

  // Multer upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File exceeds the 10 MB upload limit.',
    })
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid upload request.',
    })
  }

  // Rejected file types
  if (err.message?.startsWith('Invalid file type.')) {
    return res.status(400).json({
      success: false,
      error: err.message,
    })
  }

  const statusCode = err.statusCode || err.status || 500

  res.status(statusCode).json({
    success: false,
    error:
      statusCode >= 500
        ? 'An internal server error occurred.'
        : err.message || 'Request failed.',
  })
}

export default errorHandler
