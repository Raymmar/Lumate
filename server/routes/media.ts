import { Router } from 'express';
import multer from 'multer';
import { storage } from '../storage';

const router = Router();
const upload = multer();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'media-service',
    timestamp: new Date().toISOString()
  });
});

// Upload endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      console.log('[MediaRoutes] No file provided in request');
      return res.status(400).json({
        ok: false,
        error: "No file provided"
      });
    }

    console.log('[MediaRoutes] Processing upload:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    try {
      // Upload file to storage
      await storage.uploadFile(
        'default-bucket',
        req.file.originalname,
        req.file.buffer,
        req.file.mimetype
      );

      // Get the file URL
      const url = await storage.getFileUrl('default-bucket', req.file.originalname);

      // Create image record
      await storage.createImage({
        filename: req.file.originalname,
        url,
        contentType: req.file.mimetype,
        size: req.file.size
      });

      const response = { ok: true, url };
      console.log('[MediaRoutes] Upload successful:', response);
      return res.json(response);

    } catch (error) {
      console.error('[MediaRoutes] Upload operation failed:', error);
      return res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to upload file'
      });
    }
  } catch (error) {
    console.error('[MediaRoutes] Unexpected error:', error);
    return res.status(500).json({
      ok: false,
      error: 'Internal server error'
    });
  }
});

// Serve images endpoint
router.get('/:filename(*)', async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    console.log(`[MediaRoutes] Fetching image: ${filename}`);

    const result = await storage.client.downloadAsBytes(filename);

    if (!result.ok || !result.value || !result.value.length) {
      console.log(`[MediaRoutes] Image not found: ${filename}`);
      return res.status(404).json({
        ok: false,
        error: 'Image not found'
      });
    }

    // Set content type based on file extension
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'png'
        ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'gif'
        ? 'image/gif'
        : 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    return res.send(result.value[0]);
  } catch (error) {
    console.error('[MediaRoutes] Error serving image:', error);
    return res.status(500).json({
      ok: false,
      error: 'Internal server error'
    });
  }
});

export default router;