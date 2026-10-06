import mongoose from 'mongoose'
import bcryptjs from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },

    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },

    authProvider: {
      provider: {
        type: String,
        enum: ['local', 'google', 'github', 'apple'],
        default: 'local',
      },
      providerId: {
        type: String,
        default: null,
      },
    },

    accountInfo: {
      status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active',
      },
      role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
      lastLoginAt: {
        type: Date,
        default: null,
      },
      storageUsed: {
        type: Number,
        default: 0,
      },
    },

    avatar: {
      type: String,
      default: null,
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Synchronize top-level fields with accountInfo before saving & hash password
userSchema.pre('save', async function () {
  if (this.accountInfo) {
    if (this.lastLoginAt) this.accountInfo.lastLoginAt = this.lastLoginAt
    if (this.role) this.accountInfo.role = this.role
    if (this.isActive !== undefined) {
      this.accountInfo.status = this.isActive ? 'active' : 'inactive'
    }
  }

  if (!this.isModified('passwordHash')) return

  const salt = await bcryptjs.genSalt(12)
  this.passwordHash = await bcryptjs.hash(this.passwordHash, salt)
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcryptjs.compare(candidatePassword, this.passwordHash)
}

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject()
  delete user.passwordHash
  delete user.__v
  return user
}

const User = mongoose.model('User', userSchema)

export default User

