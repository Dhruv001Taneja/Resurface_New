import mongoose from 'mongoose'

const screenshotSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    storage: {
      provider: {
        type: String,
        enum: ['local', 'cloudinary'],
        default: 'cloudinary',
      },
      imageUrl: {
        type: String,
        required: true,
      },
      thumbnailUrl: {
        type: String,
        default: null,
      },
      publicId: {
        type: String,
        default: null,
      },
      localPath: {
        type: String,
        default: null,
      },
    },
    ocr: {
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
      },
      extractedText: {
        type: String,
        default: '',
      },
      confidence: {
        type: Number,
        default: 0,
      },
      processedAt: Date,
      error: String,
    },
    aiAnalysis: {
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
      },
      title: {
        type: String,
        default: '',
      },
      summary: {
        type: String,
        default: '',
      },
      category: {
        type: String,
        enum: [
          'Study',
          'Work',
          'Shopping',
          'Travel',
          'Finance',
          'Personal',
          'Notes',
          'Events',
          'Documents',
          'Other',
          // Legacy categories kept for backward compatibility
          'Receipt',
          'Chat',
          'Ticket',
          'Code',
          'Address',
          'Event',
          'Document',
          'Financial',
          'Social',
        ],
        default: 'Other',
      },
      tags: [{ type: String }],
      entities: {
        dates: [{ type: String }],
        amounts: [{ type: String }],
        urls: [{ type: String }],
        emails: [{ type: String }],
        phoneNumbers: [{ type: String }],
        addresses: [{ type: String }],
        names: [{ type: String }],
      },
      extractedDates: [
        {
          dateText: { type: String },
          context: { type: String },
        },
      ],
      extractedTasks: [
        {
          task: { type: String },
          dueDate: { type: String, default: null },
          priority: {
            type: String,
            enum: ['high', 'medium', 'low'],
            default: 'medium',
          },
        },
      ],
      extractedEvents: [
        {
          event: { type: String },
          date: { type: String, default: null },
          time: { type: String, default: null },
          location: { type: String, default: null },
        },
      ],
      actionItems: [
        {
          type: {
            type: String,
            enum: ['reminder', 'calendar', 'payment', 'todo'],
            default: 'todo',
          },
          description: String,
          dueDate: Date,
          amount: String,
          isCompleted: { type: Boolean, default: false },
        },
      ],
      processedAt: Date,
      error: String,
    },
    // Pipeline processing status for UI progress tracking
    processingPipeline: {
      upload: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
      },
      ocr: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
      },
      visionAI: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
      },
      extraction: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
      },
      overall: {
        type: String,
        enum: ['uploading', 'uploaded', 'ocr_processing', 'vision_processing', 'extraction', 'completed', 'failed'],
        default: 'uploading',
      },
    },
    imageUrl: {
      type: String,
      default: function () {
        return this.storage?.imageUrl || null
      },
    },
    thumbnailUrl: {
      type: String,
      default: function () {
        return this.storage?.thumbnailUrl || this.storage?.imageUrl || null
      },
    },
    dimensions: {
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },
    dates: [{ type: Date }],
    tasks: [
      {
        type: {
          type: String,
          enum: ['reminder', 'calendar', 'payment', 'todo'],
          default: 'todo',
        },
        description: String,
        dueDate: Date,
        amount: String,
        isCompleted: { type: Boolean, default: false },
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
      },
    ],
    isFavorite: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    isVault: {
      type: Boolean,
      default: false,
    },
    perceptualHash: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Synchronize imageUrl, dates, and tasks from storage & aiAnalysis before save
screenshotSchema.pre('save', function () {
  if (this.storage && this.storage.imageUrl) {
    this.imageUrl = this.storage.imageUrl
  }

  if (this.storage && this.storage.thumbnailUrl) {
    this.thumbnailUrl = this.storage.thumbnailUrl
  } else if (this.storage && this.storage.imageUrl) {
    this.thumbnailUrl = this.storage.imageUrl
  }

  if (this.storage && this.storage.width && this.storage.height) {
    this.dimensions = {
      width: this.storage.width,
      height: this.storage.height,
    }
  }

  if (this.aiAnalysis && Array.isArray(this.aiAnalysis.actionItems)) {
    this.tasks = this.aiAnalysis.actionItems.map((item) => ({
      type: item.type || 'todo',
      description: item.description || '',
      dueDate: item.dueDate || null,
      amount: item.amount || null,
      isCompleted: item.isCompleted || false,
      priority: item.priority || 'medium',
    }))
  }
})

// Index for full-text search on extracted text, title, summary, and tags
screenshotSchema.index({
  'ocr.extractedText': 'text',
  'aiAnalysis.title': 'text',
  'aiAnalysis.summary': 'text',
  'aiAnalysis.tags': 'text',
})

const Screenshot = mongoose.model('Screenshot', screenshotSchema)

export default Screenshot
