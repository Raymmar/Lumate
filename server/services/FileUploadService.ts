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
      throw new Error('Invalid file type. Only images are allowed.');
    }

    const filename = this.generateUniqueFilename(file.originalname);
    const key = `uploads/${filename}`;

    try {
      // Store file in Replit Database with base64 encoding
      const base64Data = file.buffer.toString('base64');
      await this.replDb.set(key, base64Data);

      // Log successful storage
      console.log('File data stored successfully:', { key });

      // Generate URL for our new route handler
      const url = `/uploads/${filename}`;

      // Verify the file was stored
      const storedData = await this.replDb.get(key);
      if (!storedData) {
        throw new Error('File was not stored properly');
      }

      console.log('File uploaded successfully:', { key, url });
      return url;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  async getFile(key: string): Promise<Buffer | null> {
    try {
      const base64Data = await this.replDb.get(key);
      if (!base64Data) {
        return null;
      }
      return Buffer.from(base64Data, 'base64');
    } catch (error) {
      console.error('Failed to retrieve file:', error);
      return null;
    }
  }

  async deleteFile(url: string): Promise<void> {
    try {
      // Extract filename from URL
      const filename = url.split('/uploads/')[1];
      if (!filename) {
        throw new Error('Invalid file URL');
      }
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