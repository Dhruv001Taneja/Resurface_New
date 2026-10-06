import multer from 'multer'

/**
 * In-memory storage for file uploads.
 * Images are kept in memory buffer (req.file.buffer) during the request cycle
 * and uploaded directly to Cloudinary. No files are stored permanently on local disk.
 */
const storage = multer.memoryStorage()

// File filter for image types only
const fileFilter = (_req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, GIF, and BMP image files are allowed.'), false)
  }
}

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
}).single('screenshot')

export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).array('screenshots', 10)
