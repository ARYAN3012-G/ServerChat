const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const fs = require('fs');
const { uploadToCloudinary } = require('../config/cloudinary');

// Upload a generic file (images, documents, videos, etc.)
router.post('/', auth, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            console.log('Upload error: No file uploaded');
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log(`Receiving file upload: ${req.file.originalname} (${req.file.mimetype})`);

        // Determine the correct Cloudinary resource_type
        const isAudioWebm = req.file.mimetype === 'audio/webm' || req.file.originalname.endsWith('.weba');
        const isDocument = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/zip',
            'text/plain',
        ].includes(req.file.mimetype);

        let resourceType = 'auto';
        if (isAudioWebm) resourceType = 'video';
        else if (isDocument) resourceType = 'raw';

        // Upload to Cloudinary
        const result = await uploadToCloudinary(req.file.path, 'serverchat', resourceType);

        // Remove local file after upload
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting temp file:', err);
        });

        res.json({
            url: result.url,
            type: req.file.mimetype,
            name: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        // Clean up temp file on error
        if (req.file) {
            fs.unlink(req.file.path, () => {});
        }
        next(error);
    }
});

module.exports = router;
