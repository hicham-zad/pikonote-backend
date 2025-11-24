import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// User schema based on your authStore and preferencesStore
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Please provide email"],
    validate: {
      validator: validator.isEmail,
      message: "Please provide a valid email",
    },
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "Please provide password"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false, // Don't include password in queries by default
  },
  name: {
    type: String,
    required: [true, "Please provide a name"],
    minlength: [2, "Name must be at least 2 characters"],
    maxlength: [50, "Name cannot exceed 50 characters"],
    trim: true,
  },
  avatar: {
    type: String,
    default: null,
    validate: {
      validator: function(value) {
        if (!value) return true; // Allow null/undefined
        return validator.isURL(value);
      },
      message: "Avatar must be a valid URL"
    }
  },
  joinedGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: []
  }],
  // User preferences from preferencesStore
  preferences: {
    categories: [{
      type: String,
      trim: true,
      lowercase: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [30, "Category name cannot exceed 30 characters"]
    }],
    dislikedCategories: [{
      type: String,
      trim: true,
      lowercase: true,
      minlength: [2, "Disliked category name must be at least 2 characters"],
      maxlength: [30, "Disliked category name cannot exceed 30 characters"]
    }],
    maxDuration: {
      type: Number,
      default: 180, // 3 hours in minutes
      min: [30, "Maximum duration must be at least 30 minutes"],
      max: [600, "Maximum duration cannot exceed 10 hours"]
    },
    mood: [{
      type: String,
      trim: true,
      lowercase: true,
      minlength: [2, "Mood must be at least 2 characters"],
      maxlength: [20, "Mood cannot exceed 20 characters"]
    }],
    streamingPlatforms: [{
      type: String,
      trim: true
    }],
    notifications: {
      groupInvites: {
        type: Boolean,
        default: true
      },
      votingReminders: {
        type: Boolean,
        default: true
      },
      newRecommendations: {
        type: Boolean,
        default: false
      }
    }
  },
  // User activity tracking
  lastActive: {
    type: Date,
    default: Date.now
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: '7d' // Auto-delete after 7 days
    }
  }]
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.refreshTokens;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance

UserSchema.index({ joinedGroups: 1 });
UserSchema.index({ 'preferences.categories': 1 });

// Middleware to hash password before saving
UserSchema.pre("save", async function (next) {
  // Only hash password if it's been modified (or is new)
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (_error) {
    next(_error);
  }
});

// Update lastActive on save
UserSchema.pre("save", function (next) {
  if (this.isModified() && !this.isNew) {
    this.lastActive = new Date();
  }
  next();
});

// Instance method to create JWT token
UserSchema.methods.createJWT = function () {
  return jwt.sign(
    { 
      userId: this._id,
      email: this.email,
      name: this.name 
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    }
  );
};

// Instance method to create refresh token
UserSchema.methods.createRefreshToken = function () {
  return jwt.sign(
    { userId: this._id }, 
    process.env.JWT_REFRESH_SECRET, 
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    }
  );
};

// Instance method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to add group to user
UserSchema.methods.addToGroup = function (groupId) {
  if (!this.joinedGroups.includes(groupId)) {
    this.joinedGroups.push(groupId);
  }
  return this.save();
};

// Instance method to remove group from user
UserSchema.methods.removeFromGroup = function (groupId) {
  this.joinedGroups = this.joinedGroups.filter(
    id => !id.equals(groupId)
  );
  return this.save();
};

// Instance method to update preferences
UserSchema.methods.updatePreferences = function (newPreferences) {
  this.preferences = { ...this.preferences.toObject(), ...newPreferences };
  return this.save();
};

// Static method to find user by email
UserSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find users by group
UserSchema.statics.findByGroup = function (groupId) {
  return this.find({ joinedGroups: groupId });
};

// Static method to find users who haven't completed preferences
UserSchema.statics.findIncompletePreferences = function () {
  return this.find({ 'preferences.isSetupCompleted': false });
};

export default mongoose.model("User", UserSchema);