import createClient from '@replit/database';
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
  private readonly replDb;

  private constructor() {
    this.replDb = new (createClient as any)();
    console.log('FileUploadService initialized');
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
      // Store file in Replit Database with base64 encoding
      const base64Data = file.buffer.toString('base64');
      console.log('Storing file data with key:', key);
      await this.replDb.set(key, base64Data);

      // Log successful storage
      console.log('File data stored successfully:', { key });

      // Generate full URL using current host
      // This will be replaced with the actual host in routes.ts
      const url = `__HOST__/uploads/${filename}`;

      // Verify the file was stored
      const storedData = await this.replDb.get(key);
      if (!storedData) {
        console.error('File verification failed - no data found for key:', key);
        throw new Error('File was not stored properly');
      }

      console.log('File upload completed successfully:', { key, url });
      return url;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  async getFile(key: string): Promise<Buffer | null> {
    console.log('Attempting to retrieve file:', key);
    try {
      const base64Data = await this.replDb.get(key);
      if (!base64Data) {
        console.log('No file found for key:', key);
        return null;
      }
      console.log('File retrieved successfully:', key);
      return Buffer.from(base64Data, 'base64');
    } catch (error) {
      console.error('Failed to retrieve file:', error);
      return null;
    }
  }

  async deleteFile(url: string): Promise<void> {
    try {
      // Extract filename from URL
      const matches = url.match(/\/uploads\/([^?#]+)/);
      if (!matches) {
        console.error('Invalid file URL format:', url);
        throw new Error('Invalid file URL');
      }
      const filename = matches[1];
      const key = `uploads/${filename}`;

      console.log('Deleting file:', { url, key });
      await this.replDb.delete(key);
      console.log('File deleted successfully');
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw new Error('Failed to delete file from storage');
    }
  }
}

export const fileUploadService = FileUploadService.getInstance();