
/**
 * Simple application and security logger.
 * Never log passwords, OTPs, tokens, or other secrets.
 */

const timestamp = () => new Date().toISOString()

const logger = {
  info: (message, ...args) => {
    console.log(`[INFO] ${timestamp()} — ${message}`, ...args)
  },

  warn: (message, ...args) => {
    console.warn(`[WARN] ${timestamp()} — ${message}`, ...args)
  },

  error: (message, ...args) => {
    console.error(`[ERROR] ${timestamp()} — ${message}`, ...args)
  },

  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${timestamp()} — ${message}`, ...args)
    }
  },

  // Dedicated security event logger
  security: (event, details = {}) => {
    const safeDetails = {
      event,
      timestamp: timestamp(),
      ...details,
    }

    console.warn(
      '[SECURITY]',
      JSON.stringify(safeDetails)
    )
  },
}

export default logger
