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

    // Log the request attempt
    console.log('Attempting file upload to Replit service with content type:', req.file.mimetype);

    const response = await fetch('https://file-upload.replit.app/api/upload', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.REPLIT_FILE_UPLOAD_KEY || '', // Fixed header name
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Try to parse the error message from the API
      try {
        const errorJson = JSON.parse(errorText);
        
        // Check for specific error types based on the API update
        if (errorJson.message === 'File too large') {
          return res.status(413).json({
            error: true,
            message: 'The file exceeds the maximum allowed size. Please upload a smaller file.'
          });
        } else if (errorJson.message) {
          return res.status(response.status).json({
            error: true,
            message: errorJson.message
          });
        } else {
          return res.status(response.status).json({
            error: true,
            message: `Upload failed: ${response.statusText}`
          });
        }
      } catch (parseError) {
        // If we can't parse the error as JSON, use the status text
        return res.status(response.status).json({
          error: true,
          message: `Upload failed: ${response.statusText}`
        });
      }
    }

    const data = await response.json() as UploadResponse;

    if (!data.success) {
      throw new Error('Upload failed');
    }

    // Construct the full URL
    const fullUrl = `https://file-upload.replit.app${data.data.url}`;

    // Log successful upload
    console.log('File uploaded successfully:', {
      originalName: req.file.originalname,
      size: req.file.size,
      url: fullUrl
    });

    res.json({ url: fullUrl });
  } catch (error) {
    console.error('File upload error:', error);
    let errorMessage = 'Failed to upload file';
    let status = 500;
    
    // Extract the specific error message
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Adjust the status code for specific cases
      if (errorMessage.includes('too large')) {
        status = 413; // Payload Too Large
      }
    }
    
    res.status(status).json({ 
      error: true,
      message: errorMessage
    });
  }
});

export default router;