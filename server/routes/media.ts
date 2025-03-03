import { Router } from 'express';
import multer from 'multer';
import { Client } from '@replit/object-storage';

const router = Router();
const upload = multer();
const client = new Client();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'media-service',
    timestamp: new Date().toISOString()
  });
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const filename = `files/${Date.now()}-${req.file.originalname}`;
    const { ok, error } = await client.uploadFromBytes(filename, req.file.buffer);

    if (!ok) {
      return res.status(400).json({ message: `Upload failed: ${error}` });
    }

    const url = `/api/storage/${encodeURIComponent(filename)}`;
    res.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:filename(*)', async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const result = await client.downloadAsBytes(filename);

    if (!result.ok || !result.value || !result.value.length) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Set content type based on file extension
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType = 
      ext === 'png' ? 'image/png' :
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      ext === 'gif' ? 'image/gif' :
      'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(result.value[0]);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;