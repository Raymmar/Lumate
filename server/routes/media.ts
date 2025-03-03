import { Router } from 'express';
import multer from 'multer';
import { storage } from '../storage';

const router = Router();
const upload = multer();

// Upload endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        message: "No file provided" 
      });
    }

    console.log(`[MediaRoutes] Handling upload for file: ${req.file.originalname}`);
    console.log(`[MediaRoutes] File size: ${req.file.size} bytes`);
    console.log(`[MediaRoutes] File type: ${req.file.mimetype}`);

    try {
      await storage.uploadFile(
        'default-bucket',
        req.file.originalname,
        req.file.buffer,
        req.file.mimetype
      );

      const url = await storage.getFileUrl('default-bucket', req.file.originalname);

      // Create an image record
      const image = await storage.createImage({
        filename: req.file.originalname,
        url,
        contentType: req.file.mimetype,
        size: req.file.size
      });

      console.log('[MediaRoutes] Upload successful, returning URL:', url);
      res.json({ url });
    } catch (error) {
      console.error('[MediaRoutes] Upload failed:', error);
      return res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Upload failed' 
      });
    }
  } catch (error) {
    console.error('[MediaRoutes] Error in upload route:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// Serve images endpoint
router.get('/:filename(*)', async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    console.log(`[MediaRoutes] Fetching image: ${filename}`);

    const result = await storage.client.downloadAsBytes(filename);

    if (!result.ok || !result.value || result.value.length === 0) {
      console.log(`[MediaRoutes] Image not found: ${filename}`);
      return res.status(404).json({ 
        message: 'Image not found' 
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

    // Set caching headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(result.value[0]);
  } catch (error) {
    console.error('[MediaRoutes] Error serving image:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

export default router;