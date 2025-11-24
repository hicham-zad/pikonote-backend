import mongoose from "mongoose";

const { Schema } = mongoose;

// Vote subdocument schema
const VoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  movieId: {
    type: Number,
    required: true,
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: "Movie ID must be a positive number"
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Movie metadata subdocument schema
const MovieMetadataSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number
  },
  poster: {
    type: String
  },
  genre: {
    type: String
  },
  rating: {
    type: String
  },
  director: {
    type: String
  },
  plot: {
    type: String
  },
  reason: {
    type: String
  },
  duration: {
    type: String
  },
  watchedBy: [{
    userId: {
      type: String,
      required: true,
      trim: true
    },
    userName: {
      type: String,
      required: true,
      trim: true
    }
  }]
}, { _id: false });

// Vote Session schema
const VoteSessionSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, "Group ID is required"]
  },
  groupName: {
    type: String,
    required: [true, "Group name is required"],
    trim: true
  },
  movieIds: [{
    type: Number,
    required: true,
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: "Movie ID must be a positive number"
    }
  }],
  movieMetadata: [MovieMetadataSchema], // Store movie details with the vote session
  duration: {
    type: Number,
    required: [true, "Duration is required"],
    min: [1, "Duration must be at least 1 minute"],
    max: [120, "Duration cannot exceed 120 minutes"]
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  votes: [VoteSchema],
  status: {
    type: String,
    enum: ['active', 'finished'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Creator ID is required"]
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
VoteSessionSchema.index({ groupId: 1 });
VoteSessionSchema.index({ status: 1 });
VoteSessionSchema.index({ endTime: 1 });
VoteSessionSchema.index({ createdBy: 1 });
VoteSessionSchema.index({ "votes.userId": 1 }); // Add index for vote queries

// Middleware to set endTime before saving
VoteSessionSchema.pre("save", function (next) {
  if (this.isNew) {
    // Ensure startTime is set if not already
    if (!this.startTime) {
      this.startTime = new Date();
    }
    // Calculate endTime from startTime + duration
    if (this.duration) {
      this.endTime = new Date(this.startTime.getTime() + this.duration * 60 * 1000);
    }
  }
  next();
});

// Instance method to check if session is expired
VoteSessionSchema.methods.isExpired = function() {
  return new Date() > this.endTime;
};

// Instance method to check if session is active
VoteSessionSchema.methods.isActive = function() {
  return this.status === 'active' && !this.isExpired();
};

// FIXED: Instance method to add or update vote
VoteSessionSchema.methods.addOrUpdateVote = function(userId, userName, movieId) {
  // Check if movieId is in the session
  if (!this.movieIds.includes(movieId)) {
    throw new Error('Invalid movie selection');
  }

  // Check if session is still active
  if (!this.isActive()) {
    throw new Error('Voting session has ended');
  }

  // Find existing vote by user (convert both to strings for comparison)
  const existingVoteIndex = this.votes.findIndex(vote => 
    vote.userId.toString() === userId.toString()
  );
  
  const isUpdate = existingVoteIndex !== -1;
  
  if (isUpdate) {
    // Update existing vote
    this.votes[existingVoteIndex].movieId = movieId;
    this.votes[existingVoteIndex].timestamp = new Date();
    console.log(`Updated vote for user ${userId} to movie ${movieId}`);
  } else {
    // Add new vote
    this.votes.push({
      userId,
      userName,
      movieId,
      timestamp: new Date()
    });
    console.log(`Added new vote for user ${userId} for movie ${movieId}`);
  }

  return { isUpdate, vote: this.votes[isUpdate ? existingVoteIndex : this.votes.length - 1] };
};

// DEPRECATED: Keep old method for backwards compatibility
VoteSessionSchema.methods.addVote = function(userId, userName, movieId) {
  console.warn('addVote method is deprecated, use addOrUpdateVote instead');
  
  // Check if user already voted (convert both to strings for comparison)
  const existingVote = this.votes.find(vote => 
    vote.userId.toString() === userId.toString()
  );
  
  if (existingVote) {
    throw new Error('User has already voted');
  }

  // Check if movieId is in the session
  if (!this.movieIds.includes(movieId)) {
    throw new Error('Invalid movie selection');
  }

  this.votes.push({
    userId,
    userName,
    movieId,
    timestamp: new Date()
  });

  return this.save();
};

// Instance method to get vote results with movie metadata, excluding watched films
VoteSessionSchema.methods.getResults = function() {
  const totalVotes = this.votes.length;
  const results = [];

  this.movieIds.forEach(movieId => {
    // Find movie metadata for this movieId
    const movieMetadata = this.movieMetadata ? 
      this.movieMetadata.find(movie => movie.id === movieId) : null;
    // Exclude films that have any watchedBy
    if (movieMetadata && movieMetadata.watchedBy && movieMetadata.watchedBy.length > 0) {
      return; // skip watched films
    }
    const movieVotes = this.votes.filter(vote => vote.movieId === movieId);
    const percentage = totalVotes > 0 ? Math.round((movieVotes.length / totalVotes) * 100) : 0;
    const result = {
      movieId,
      votes: movieVotes.length,
      percentage,
      voters: movieVotes.map(vote => vote.userName)
    };
    if (movieMetadata) {
      result.movieDetails = {
        title: movieMetadata.title,
        year: movieMetadata.year,
        poster: movieMetadata.poster,
        genre: movieMetadata.genre,
        rating: movieMetadata.rating,
        director: movieMetadata.director,
        plot: movieMetadata.plot,
        reason: movieMetadata.reason,
        duration: movieMetadata.duration
      };
    }
    results.push(result);
  });
  return results.sort((a, b) => b.votes - a.votes);
};

// Instance method to get user's vote
VoteSessionSchema.methods.getUserVote = function(userId) {
  return this.votes.find(vote => vote.userId.toString() === userId.toString()) || null;
};

// Instance method to check if user has voted
VoteSessionSchema.methods.hasUserVoted = function(userId) {
  return this.votes.some(vote => vote.userId.toString() === userId.toString());
};

// Instance method to get movie by ID with metadata
VoteSessionSchema.methods.getMovieById = function(movieId) {
  const movieMetadata = this.movieMetadata ? 
    this.movieMetadata.find(movie => movie.id === movieId) : null;
  
  return movieMetadata || { id: movieId, title: `Movie ${movieId}` };
};

// Instance method to finish session
VoteSessionSchema.methods.finish = function() {
  this.status = 'finished';
  return this.save();
};

// Instance method to get remaining time in seconds
VoteSessionSchema.methods.getRemainingTime = function() {
  if (this.status !== 'active') return 0;
  
  const now = new Date();
  const remaining = Math.max(0, Math.floor((this.endTime.getTime() - now.getTime()) / 1000));
  return remaining;
};

// Static method to find active sessions by group
VoteSessionSchema.statics.findActiveByGroup = function(groupId) {
  return this.find({ 
    groupId, 
    status: 'active',
    endTime: { $gt: new Date() }
  });
};

// Static method to find sessions created by user
VoteSessionSchema.statics.findByCreator = function(userId) {
  return this.find({ createdBy: userId }).sort({ createdAt: -1 });
};

// Static method to cleanup expired sessions
VoteSessionSchema.statics.cleanupExpired = function() {
  return this.updateMany(
    { 
      status: 'active',
      endTime: { $lt: new Date() }
    },
    { status: 'finished' }
  );
};

export default mongoose.model("VoteSession", VoteSessionSchema);