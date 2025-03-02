import { createClient } from '@replit/object-storage';
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
  readonly bucketId: string;
  private readonly objectStore;

  private constructor() {
    this.bucketId = process.env.REPLIT_DEFAULT_BUCKET_ID || 'replit-objstore-fdb314e8-358e-4080-9f92-57e210181986';
    if (!this.bucketId) {
      throw new Error('Object storage bucket ID not found');
    }
    this.objectStore = createClient();
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
      console.error('Invalid file type rejected:', file.mimetype);
      throw new Error('Invalid file type. Only images are allowed.');
    }

    const filename = this.generateUniqueFilename(file.originalname);
    const key = `uploads/${filename}`;

    try {
      console.log('Attempting to upload file to object storage:', key);

      // Upload buffer to object storage with proper CORS and caching headers
      await this.objectStore.uploadFromBuffer(key, file.buffer, {
        contentType: file.mimetype,
        metadata: {
          'Cache-Control': 'public, max-age=31536000',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Expose-Headers': 'Content-Length, Content-Type'
        }
      });

      // Construct the URL with the proper domain
      const url = `https://${this.bucketId}.id.repl.co/${key}`;
      console.log('File uploaded successfully to object storage:', { key, url });

      // Verify the file is accessible
      console.log('Verifying file accessibility:', url);
      try {
        console.time('fileAccessibilityCheck');
        const response = await fetch(url, {
          method: 'HEAD',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        console.timeEnd('fileAccessibilityCheck');

        if (!response.ok) {
          throw new Error(`File not accessible after upload: ${response.status}`);
        }
        console.log('File accessibility verified with status:', response.status);
      } catch (error) {
        console.error('File accessibility check failed:', error);
        throw new Error('File not accessible after upload');
      }

      return url;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw new Error('Failed to upload file to object storage');
    }
  }

  async deleteFile(url: string): Promise<void> {
    try {
      const key = url.split('.id.repl.co/')[1];
      if (!key) {
        throw new Error('Invalid file URL');
      }
      console.log('Deleting file:', { url, key });
      await this.objectStore.deleteObject(key);
      console.log('File deleted successfully');
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw new Error('Failed to delete file from object storage');
    }
  }
}

export const fileUploadService = FileUploadService.getInstance();