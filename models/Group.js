import mongoose from "mongoose";

const { Schema } = mongoose;

// Group member sub-schema - uses MongoDB default _id
const GroupMemberSchema = new Schema({
  userRef: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, "Member name is required"],
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}); // gets _id automatically



// Chosen movie sub-schema
const ChosenMovieSchema = new Schema({
  id: { type: Number, required: true },
  title: { type: String, required: true, trim: true },
  poster: { type: String, required: true },
  votePercentage: { type: Number, required: true, min: 0, max: 100 },
  totalVotes: { type: Number, required: true, min: 0 }
}, { _id: false });

const MovieRecommendationSchema = new Schema({
  title: { type: String, required: true },
  year: { type: Number, required: true },
  genre: { type: String, required: true },
  director: { type: String, required: true },
  plot: { type: String, required: true },
  rating: { type: String, required: true },
  duration: { type: String, required: true },
  reason: { type: String, required: true },
  groupCompatibility: { type: Number, required: true, min: 0, max: 10 },
  watchLinks: {
    imdb: { type: String, default: '' },
    justwatch: { type: String, default: '' },
    netflix: { type: String, default: '' },
    amazonPrime: { type: String, default: '' },
    hulu: { type: String, default: '' },
    disneyPlus: { type: String, default: '' },
    hboMax: { type: String, default: '' },
    appleTV: { type: String, default: '' },
    googlePlay: { type: String, default: '' },
    vudu: { type: String, default: '' },
    google: { type: String, default: '' },
    youtube: { type: String, default: '' }
  },
  enrichedAt: { type: Date, default: Date.now }
}, { _id: false });

// Main Group schema
const GroupSchema = new Schema({
  name: {
    type: String,
    required: [true, "Group name is required"],
    minlength: [2, "Group name must be at least 2 characters"],
    maxlength: [50, "Group name cannot exceed 50 characters"],
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: 6,
    maxlength: 6,
    match: [/^[A-Z0-9]{6}$/, "Group code must be 6 alphanumeric characters"]
  },
  members: [GroupMemberSchema],
  heroImage: {
    type: String,
    default: function() {
      const imageIds = [
        '1489599003-24K',
        '1574267432553-4b4628081c31',
        '1446776877081-d282a0f896e2',
        '1478720568477-b2709362040e'
      ];
      const randomId = imageIds[Math.floor(Math.random() * imageIds.length)];
      return `https://images.unsplash.com/photo-${randomId}?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60`;
    }
  },
  status: {
    type: String,
    enum: ['active', 'voting', 'movie_chosen'],
    default: 'active'
  },
  activeVoteSessionId: { type: String, default: null },
  chosenMovie: { type: ChosenMovieSchema, default: null },
  lastRecommendations: {
    recommendations: [MovieRecommendationSchema],
    generatedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null } // Optional: auto-expire after 24 hours
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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



// Pre-save to cap vote history
GroupSchema.pre('save', function(next) {
  if (Array.isArray(this.voteHistory) && this.voteHistory.length > 20) {
    this.voteHistory = this.voteHistory
      .sort((a, b) => new Date(b.votedAt) - new Date(a.votedAt))
      .slice(0, 20);
  }
  next();
});

// Statics
GroupSchema.statics.generateUniqueCode = async function() {
  let code;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    if (/^[A-Z0-9]{6}$/.test(code)) {
      const exists = await this.exists({ code });
      if (!exists) break;
    }
  }
  return code;
};

GroupSchema.statics.findByCode = function(code) {
  return this.findOne({ code: code.toUpperCase() });
};

GroupSchema.statics.findUserGroups = function(userId) {
  return this.find({ 'members.userRef': userId });
};

// Methods
GroupSchema.methods.addMember = function(userId, userName, avatar = null, role = 'member') {
  const idStr = userId.toString();
  const existingMember = this.members.find(m => m.userRef?.toString() === idStr);
  if (existingMember) {
    const err = new Error('Member already in group');
    err.statusCode = 400;
    throw err;
  }
  this.members.push({
    userRef: userId,
    name: userName,
    avatar,
    role,
    joinedAt: new Date()
  });
  return this.save();
};

GroupSchema.methods.removeMember = function(userId) {
  const idStr = userId.toString();
  this.members = this.members.filter(m => m.userRef?.toString() !== idStr);
  return this.save();
};

GroupSchema.methods.removeMemberById = function(memberId) {
  const idStr = memberId.toString();
  this.members = this.members.filter(m => m._id?.toString() !== idStr);
  return this.save();
};

GroupSchema.methods.updateMemberRole = function(userId, newRole) {
  const idStr = userId.toString();
  const member = this.members.find(m => m.userRef?.toString() === idStr);
  if (!member) {
    const err = new Error('Member not found');
    err.statusCode = 404;
    throw err;
  }
  member.role = newRole;
  return this.save();
};

GroupSchema.methods.isMember = function(userId) {
  const idStr = userId.toString();
  return this.members.some(m => m.userRef?.toString() === idStr);
};

GroupSchema.methods.isAdmin = function(userId) {
  const idStr = userId.toString();
  const isCreator = this.createdBy?.toString() === idStr;
  const member = this.members.find(m => m.userRef?.toString() === idStr);
  const hasAdminRole = !!member && member.role === 'admin';
  return isCreator || hasAdminRole;
};

GroupSchema.methods.getMember = function(userId) {
  const idStr = userId.toString();
  return this.members.find(m => m.userRef?.toString() === idStr);
};

GroupSchema.methods.updateStatus = function(status) {
  this.status = status;
  return this.save();
};

GroupSchema.methods.setActiveVoteSession = function(sessionId) {
  this.activeVoteSessionId = sessionId;
  this.status = 'voting';
  return this.save();
};

GroupSchema.methods.setChosenMovie = function(movie) {
  this.chosenMovie = movie;
  this.status = 'movie_chosen';
  this.activeVoteSessionId = null;

  if (movie) {
    this.addToVoteHistory({
      movieId: movie.id,
      movieTitle: movie.title,
      moviePoster: movie.poster,
      votePercentage: movie.votePercentage,
      totalVotes: movie.totalVotes,
      votedAt: new Date(),
      voters: []
    });
  }

  return this.save();
};

GroupSchema.methods.clearActiveVote = function() {
  this.status = 'active';
  this.activeVoteSessionId = null;
  this.chosenMovie = null;
  return this.save();
};

GroupSchema.methods.addToVoteHistory = function(historyItem) {
  this.voteHistory.unshift(historyItem);
  if (this.voteHistory.length > 20) {
    this.voteHistory = this.voteHistory.slice(0, 20);
  }
  return this.save();
};

// Add method to save recommendations
GroupSchema.methods.saveRecommendations = function(recommendations) {
  this.lastRecommendations = {
    recommendations: recommendations,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  };
  return this.save();
};

// Add method to get recommendations
GroupSchema.methods.getLastRecommendations = function() {
  if (!this.lastRecommendations || !this.lastRecommendations.recommendations) {
    return null;
  }
  
  // Check if recommendations are expired (optional)
  if (this.lastRecommendations.expiresAt && new Date() > this.lastRecommendations.expiresAt) {
    return null;
  }
  
  return this.lastRecommendations;
};

// Add method to delete group
GroupSchema.methods.deleteGroup = async function() {
  // Import User model here to avoid circular dependency
  const User = mongoose.model('User');
  
  // Remove group from all members' joinedGroups array
  const memberUserIds = this.members.map(member => member.userRef);
  await User.updateMany(
    { _id: { $in: memberUserIds } },
    { $pull: { joinedGroups: this._id } }
  );
  
  // Delete the group
  return await this.deleteOne();
};

export default mongoose.model("Group", GroupSchema);
