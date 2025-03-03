import { createStorage } from '@replit/object-storage';
import { randomUUID } from 'crypto';
import path from 'path';

// Initialize object storage with error handling
let storage: any; // Temporarily use any until we have proper types
try {
  console.log('Initializing object storage...');
  storage = createStorage();
  console.log('Object storage initialized successfully');
} catch (error) {
  console.error('Failed to initialize object storage:', error);
  throw new Error('Failed to initialize object storage');
}

export class FileStorageService {
  private static instance: FileStorageService;

  private constructor() {
    console.log('Creating new FileStorageService instance');
  }

  static getInstance(): FileStorageService {
    if (!this.instance) {
      this.instance = new FileStorageService();
    }
    return this.instance;
  }

  async uploadFile(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Promise<string> {
    try {
      console.log('Starting file upload process for:', file.originalname);

      // Generate a unique filename
      const fileExtension = path.extname(file.originalname);
      const filename = `uploads/${Date.now()}-${randomUUID()}${fileExtension}`;

      console.log('Generated filename:', filename);

      // Upload to object storage
      await storage.put(filename, file.buffer, {
        'Content-Type': file.mimetype
      });

      console.log('File uploaded successfully:', filename);
      return filename;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw new Error('Failed to upload file');
    }
  }

  async getFile(filename: string): Promise<Buffer | null> {
    try {
      console.log('Fetching file:', filename);
      const data = await storage.get(filename);
      if (!data) {
        console.log('File not found:', filename);
        return null;
      }
      console.log('File retrieved successfully:', filename);
      return Buffer.from(data);
    } catch (error) {
      console.error('Failed to get file:', error);
      return null;
    }
  }

  async deleteFile(filename: string): Promise<boolean> {
    try {
      console.log('Deleting file:', filename);
      await storage.delete(filename);
      console.log('File deleted successfully:', filename);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }
}

export const fileStorage = FileStorageService.getInstance();