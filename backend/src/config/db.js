import mongoose from 'mongoose'
import dns from 'dns'
import logger from '../utils/logger.js'

let isListenersAttached = false

/**
 * Connect to MongoDB Atlas using Mongoose.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI

  if (!uri || uri.trim() === '' || uri.includes('<username>') || uri.includes('<cluster>')) {
    logger.error('MONGODB_URI is missing or contains default placeholders in backend/.env.')
    throw new Error('MONGODB_URI is not properly configured in environment variables.')
  }

  // Override local ISP DNS resolution issues for MongoDB Atlas SRV records
  try {
    dns.setDefaultResultOrder?.('ipv4first')
    dns.setServers(['8.8.8.8', '1.1.1.1'])
  } catch (_dnsErr) {
    // ignore if environment restricts custom DNS servers
  }

  if (!isListenersAttached) {
    mongoose.connection.on('connected', () => {
      logger.info('✅ Mongoose connected to MongoDB Atlas')
    })

    mongoose.connection.on('error', (err) => {
      logger.error(`❌ Mongoose connection error: ${err.message}`)
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ Mongoose disconnected from MongoDB Atlas')
    })

    isListenersAttached = true
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    })
    logger.info(`✅ MongoDB Connected: Host=${conn.connection.host}, DB=${conn.connection.name}`)
    return conn
  } catch (error) {
    logger.error(`❌ MongoDB Atlas connection failed: ${error.message}`)
    throw error
  }
}

export default connectDB
