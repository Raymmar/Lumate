import { randomUUID } from 'crypto';
import { extname } from 'path';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
}

export class FileUploadService {
  private static instance: FileUploadService;
  private readonly bucketId: string;

  private constructor() {
    // Get bucket ID from environment
    this.bucketId = process.env.REPLIT_DEFAULT_BUCKET_ID;
    if (!this.bucketId) {
      throw new Error('Object storage bucket ID not found in environment');
    }
    console.log('FileUploadService initialized with bucket:', this.bucketId);
  }

  static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  private generateUniqueFilename(originalFilename: string): string {
    const ext = extname(originalFilename);
    const uuid = randomUUID();
    return `${uuid}${ext}`;
  }

  private validateFileType(mimetype: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    return allowedTypes.includes(mimetype);
  }

  async uploadFile(file: UploadedFile): Promise<string> {
    console.log('Starting file upload process:', {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.buffer.length
    });

    if (!this.validateFileType(file.mimetype)) {
      console.error('Invalid file type:', file.mimetype);
      throw new Error('Invalid file type. Only images are allowed.');
    }

    const filename = this.generateUniqueFilename(file.originalname);
    const key = `uploads/${filename}`;

    try {
      // Store file in Replit object storage
      const response = await fetch(`https://object-storage.${process.env.REPLIT_DB_HOST}/${this.bucketId}/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': file.mimetype,
        },
        body: file.buffer
      });

      if (!response.ok) {
        console.error('Failed to upload to object storage:', response.status, response.statusText);
        throw new Error('Failed to upload to object storage');
      }

      // Generate public URL for the uploaded file
      const url = `https://${this.bucketId}.id.repl.co/${key}`;

      console.log('File upload completed successfully:', { 
        key,
        url,
        size: file.buffer.length,
        type: file.mimetype
      });

      return url;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  async deleteFile(url: string): Promise<void> {
    try {
      // Extract key from URL
      const matches = url.match(/\.id\.repl\.co\/(uploads\/[^?#]+)/);
      if (!matches) {
        console.error('Invalid file URL format:', url);
        throw new Error('Invalid file URL');
      }

      const key = matches[1];
      console.log('Deleting file:', { url, key });

      const response = await fetch(`https://object-storage.${process.env.REPLIT_DB_HOST}/${this.bucketId}/${key}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status} ${response.statusText}`);
      }

      console.log('File deleted successfully');
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw new Error('Failed to delete file from storage');
    }
  }
}

export const fileUploadService = FileUploadService.getInstance();