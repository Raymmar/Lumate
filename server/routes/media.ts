import { Router } from 'express';
import multer from 'multer';
import { mediaManagement } from '../services/mediaManagement';

const router = Router();
const upload = multer();

// Upload endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const result = await mediaManagement.uploadImage(
      req.file.buffer,
      req.file.originalname,
      { "content-type": req.file.mimetype }
    );

    if (!result.ok) {
      return res.status(400).json({ message: result.error });
    }

    res.json({ url: result.url });
  } catch (error) {
    console.error('Error in upload route:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// Serve images endpoint
router.get('/:filename(*)', async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const imageData = await mediaManagement.getImage(filename);
    
    if (!imageData) {
      return res.status(404).json({ message: 'Image not found' });
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
    res.send(imageData);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

export default router;
