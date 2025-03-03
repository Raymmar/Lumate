import { Router } from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';

const router = Router();
const upload = multer();

interface UploadResponse {
  success: boolean;
  data: {
    id: number;
    filename: string;
    url: string;
    contentType: string;
    size: number;
  };
}

router.post('/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await fetch('https://file-upload.replit.app/api/upload', {
      method: 'POST',
      headers: {
        'X-API_KEY': process.env.REPLIT_FILE_UPLOAD_KEY || '',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json() as UploadResponse;

    if (!data.success) {
      throw new Error('Upload failed');
    }

    // Construct the full URL
    const fullUrl = `https://file-upload.replit.app${data.data.url}`;

    res.json({ url: fullUrl });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;