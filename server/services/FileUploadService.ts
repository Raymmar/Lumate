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
  private readonly bucketId: string;
  private readonly replDb: ReturnType<typeof createClient>;

  private constructor() {
    // Get bucket ID from .replit file's objectStorage configuration
    this.bucketId = process.env.REPLIT_DEFAULT_BUCKET_ID || 'replit-objstore-fdb314e8-358e-4080-9f92-57e210181986';
    if (!this.bucketId) {
      throw new Error('Object storage bucket ID not found');
    }
    this.replDb = createClient();
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
      throw new Error('Invalid file type. Only images are allowed.');
    }

    const filename = this.generateUniqueFilename(file.originalname);
    const key = `uploads/${filename}`;

    try {
      await this.replDb.set(key, file.buffer);
      const url = `https://${this.bucketId}.id.repl.co/${key}`;
      console.log('File uploaded successfully:', { key, url });
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
      await this.replDb.delete(key);
      console.log('File deleted successfully');
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw new Error('Failed to delete file from object storage');
    }
  }
}

export const fileUploadService = FileUploadService.getInstance();