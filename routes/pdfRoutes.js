import express from 'express';
import multer from 'multer';
import * as pdfController from '../controllers/pdfController.js';
import * as pdfContentController from '../controllers/pdfContentController.js';
import { authenticateUser } from '../middleware/supabaseAuth.js';


const router = express.Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// Wrapper to handle multer errors
const uploadMiddleware = (req, res, next) => {
    const uploadSingle = upload.single('pdf');

    uploadSingle(req, res, (err) => {
        if (err) {
            console.error('❌ Multer error:', err);
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    error: 'Unexpected field name',
                    message: `Expected field name "pdf", but got something else. Please check your form-data keys.`,
                    details: err.message
                });
            }
            return res.status(400).json({ error: err.message });
        }
        next();
    });
};

// Extract text from PDF
// POST /api/pdf/extract
router.post('/extract', uploadMiddleware, pdfController.extractContent);

// Generate AI content from PDF
// POST /api/pdf/generate
router.post('/generate', authenticateUser, uploadMiddleware, pdfContentController.uploadAndGenerate);

// Check generation status
// GET /api/pdf/status/:requestId
router.get('/status/:requestId', authenticateUser, pdfContentController.getGenerationStatus);

export default router;
