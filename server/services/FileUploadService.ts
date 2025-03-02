import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Client } from '@replit/object-storage';

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
  private readonly storage: Client;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  private constructor() {
    // Get bucket ID from environment
    const bucketId = process.env.REPLIT_DEFAULT_BUCKET_ID;
    if (!bucketId) {
      throw new Error('Object storage bucket ID not found in environment');
    }
    this.bucketId = bucketId;
    console.log('FileUploadService initialized with bucket:', this.bucketId);

    // Initialize Replit object storage client
    this.storage = new Client();
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Upload attempt ${attempt}/${this.maxRetries} for key:`, key);

        await this.storage.put(key, file.buffer, {
          contentType: file.mimetype,
        });

        // Generate public URL for the uploaded file
        const publicUrl = `https://${this.bucketId}.id.repl.co/${key}`;

        console.log('File upload completed successfully:', { 
          key,
          publicUrl,
          size: file.buffer.length,
          type: file.mimetype,
          attempt
        });

        return publicUrl;
      } catch (error) {
        lastError = error as Error;
        console.error(`Upload attempt ${attempt} failed:`, error);

        if (attempt < this.maxRetries) {
          const delayMs = this.retryDelay * attempt;
          console.log(`Retrying in ${delayMs}ms...`);
          await this.delay(delayMs);
        }
      }
    }

    console.error('All upload attempts failed');
    throw lastError || new Error('Failed to upload file after all retries');
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

      await this.storage.delete(key);

      console.log('File deleted successfully');
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw new Error('Failed to delete file from storage');
    }
  }
}

export const fileUploadService = FileUploadService.getInstance();