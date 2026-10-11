import dns from 'dns'

// Override local ISP DNS resolution issues for MongoDB Atlas SRV records
try {
  dns.setDefaultResultOrder?.('ipv4first')
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch (_dnsErr) {
  // ignore if environment restricts custom DNS servers
}

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import connectDB from './config/db.js'
import logger from './utils/logger.js'
import validateEnv from './config/env.js'
import { apiLimiter } from './middleware/rateLimiter.js'
import authRoutes from './modules/auth/auth.routes.js'
import screenshotsRoutes from './modules/screenshots/screenshots.routes.js'
import calendarRoutes from './modules/calendar/calendar.routes.js'
import errorHandler from './middleware/errorHandler.js'

// Load environment variables
dotenv.config()

// Validate environment security & configuration
validateEnv()

const app = express()
const PORT = process.env.PORT || 5000

// Trust reverse proxies (Render, Vercel, Railway, Nginx) for TLS & IP rate limiting
app.set('trust proxy', 1)

// HTTP Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Enforce HSTS when running on HTTPS or in production
  if (
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV === 'production'
  ) {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    )
  }
  next()
})

// Permissive CORS for development
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow any local origin or requests with no origin
      callback(null, true)
    },
    credentials: true,
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Serve static uploaded files locally (legacy support for past test uploads)
const uploadsPath = path.join(process.cwd(), 'uploads')
app.use('/uploads', express.static(uploadsPath))

// Request logging middleware (path only, avoids logging sensitive query params)
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`)
  next()
})

// Global API rate limiting
app.use('/api', apiLimiter)

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'RESurface Backend API',
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'REsurface Backend API',
    timestamp: new Date().toISOString(),
  })
})

// API Routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/screenshots', screenshotsRoutes)
app.use('/api/v1/calendar', calendarRoutes)

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  })
})

// Global Error Handler
app.use(errorHandler)

// Start Server & Connect Database with Retry
const connectWithRetry = async () => {
  try {
    await connectDB()
  } catch (error) {
    logger.error('MongoDB Atlas connection attempt failed:', error.message)
    logger.info('Retrying MongoDB connection in 5 seconds...')
    setTimeout(connectWithRetry, 5000)
  }
}

const startServer = () => {
  // Always bind the HTTP server so port 5000 is open and never gives "Failed to fetch"
  app.listen(PORT, () => {
    logger.info(`RESurface Backend running on port ${PORT} (${process.env.NODE_ENV || 'development'} mode)`)
  })

  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('<username>')) {
    connectWithRetry()
  } else {
    logger.warn('MONGODB_URI is not configured in backend/.env. Please add your MongoDB Atlas connection string.')
  }
}

startServer()

export default app;
