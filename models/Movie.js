import mongoose from "mongoose";

const { Schema } = mongoose;

// Genre sub-schema
const GenreSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

// Movie schema based on your Movie interface from movieStore
const MovieSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: [true, "Movie ID is required"],
    unique: true,
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: "Movie ID must be a positive number"
    }
  },
  title: {
    type: String,
    required: [true, "Movie title is required"],
    trim: true,
    maxlength: [200, "Title cannot exceed 200 characters"]
  },
  poster_path: {
    type: String,
    required: [true, "Poster path is required"],
    trim: true
  },
  backdrop_path: {
    type: String,
    required: [true, "Backdrop path is required"],
    trim: true
  },
  overview: {
    type: String,
    required: [true, "Movie overview is required"],
    trim: true,
    maxlength: [1000, "Overview cannot exceed 1000 characters"]
  },
  release_date: {
    type: String,
    required: [true, "Release date is required"],
    validate: {
      validator: function(value) {
        // Validate YYYY-MM-DD format
        return /^\d{4}-\d{2}-\d{2}$/.test(value);
      },
      message: "Release date must be in YYYY-MM-DD format"
    }
  },
  vote_average: {
    type: Number,
    required: [true, "Vote average is required"],
    min: [0, "Vote average cannot be less than 0"],
    max: [10, "Vote average cannot be more than 10"]
  },
  genres: [GenreSchema]
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
      return ret;
    }
  }
});

// Indexes for better performance
MovieSchema.index({ id: 1 }, { unique: true });
MovieSchema.index({ title: 'text' }); // Text index for search
MovieSchema.index({ 'genres.id': 1 });
MovieSchema.index({ vote_average: -1 });
MovieSchema.index({ release_date: -1 });

// Static method to find by TMDB ID
MovieSchema.statics.findByTmdbId = function(tmdbId) {
  return this.findOne({ id: tmdbId });
};

// Static method to search movies by title
MovieSchema.statics.searchByTitle = function(query, limit = 20) {
  return this.find(
    { $text: { $search: query } },
    { score: { $meta: "textScore" } }
  )
  .sort({ score: { $meta: "textScore" } })
  .limit(limit);
};

// Static method to find by genre
MovieSchema.statics.findByGenre = function(genreId, limit = 20) {
  return this.find({ 'genres.id': genreId })
    .sort({ vote_average: -1 })
    .limit(limit);
};

// Static method to find by minimum rating
MovieSchema.statics.findByMinRating = function(minRating, limit = 20) {
  return this.find({ vote_average: { $gte: minRating } })
    .sort({ vote_average: -1 })
    .limit(limit);
};

// Static method to find by release year
MovieSchema.statics.findByYear = function(year, limit = 20) {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  return this.find({
    release_date: {
      $gte: startDate,
      $lte: endDate
    }
  })
  .sort({ vote_average: -1 })
  .limit(limit);
};

// Static method to apply filters (matches your store filters)
MovieSchema.statics.findWithFilters = function(filters = {}, limit = 20) {
  const { genres = [], minRating = 0, year } = filters;
  
  let query = {};
  
  // Apply genre filter
  if (genres.length > 0) {
    query['genres.id'] = { $in: genres };
  }
  
  // Apply minimum rating filter
  if (minRating > 0) {
    query.vote_average = { $gte: minRating };
  }
  
  // Apply year filter
  if (year) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    query.release_date = {
      $gte: startDate,
      $lte: endDate
    };
  }
  
  return this.find(query)
    .sort({ vote_average: -1 })
    .limit(limit);
};

// Instance method to get release year
MovieSchema.methods.getReleaseYear = function() {
  return this.release_date ? parseInt(this.release_date.split('-')[0]) : null;
};

// Instance method to get formatted poster URL
MovieSchema.methods.getPosterUrl = function(size = 'w500') {
  return `https://image.tmdb.org/t/p/${size}${this.poster_path}`;
};

// Instance method to get formatted backdrop URL
MovieSchema.methods.getBackdropUrl = function(size = 'w1280') {
  return `https://image.tmdb.org/t/p/${size}${this.backdrop_path}`;
};

// Instance method to check if movie has specific genre
MovieSchema.methods.hasGenre = function(genreId) {
  return this.genres.some(genre => genre.id === genreId);
};

export default mongoose.model("Movie", MovieSchema);