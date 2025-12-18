import rateLimit from 'express-rate-limit';

// General API rate limiter
export const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// YouTube validation - more permissive
export const youtubeValidateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: { error: 'Too many validation requests. Please wait a moment.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// YouTube transcript save - stricter
export const youtubeTranscriptSaveLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 saves per minute
    message: { error: 'Too many save requests. Please wait a moment.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Content generation - strictest
export const generationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 generations per minute
    message: { error: 'Too many generation requests. Please wait a moment.' },
    standardHeaders: true,
    legacyHeaders: false,
});
