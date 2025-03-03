import { Client } from '@replit/object-storage';

// Initialize the client with proper error handling
let client: Client;
try {
  console.log('Initializing object storage client...');
  const bucketId = process.env.REPLIT_DEFAULT_BUCKET_ID;
  if (!bucketId) {
    throw new Error('REPLIT_DEFAULT_BUCKET_ID environment variable is not set');
  }
  client = new Client({ bucket: bucketId });
  console.log('Object storage client initialized successfully');
} catch (error) {
  console.error('Failed to initialize object storage client:', error);
  throw new Error('Failed to initialize object storage client');
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
      const filename = `files/${Date.now()}-${file.originalname}`;
      console.log('Generated filename:', filename);

      const { ok, error } = await client.uploadFromBytes(filename, file.buffer, {
        metadata: { 'content-type': file.mimetype }
      });

      if (!ok) {
        throw new Error(`Failed to upload file: ${error}`);
      }

      console.log('File uploaded successfully:', filename);
      return filename;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  }

  async getFile(filename: string): Promise<Buffer | null> {
    try {
      console.log('Fetching file:', filename);
      const { ok, value: data, error } = await client.downloadAsBytes(filename);

      if (!ok || !data || data.length === 0) {
        console.log('File not found or error:', error);
        return null;
      }

      console.log('File retrieved successfully:', filename);
      // IMPORTANT: Return the first element of the array as per documentation
      return data[0];
    } catch (error) {
      console.error('Failed to get file:', error);
      return null;
    }
  }

  async deleteFile(filename: string): Promise<boolean> {
    try {
      console.log('Deleting file:', filename);
      const { ok, error } = await client.delete(filename);

      if (!ok) {
        throw new Error(`Failed to delete file: ${error}`);
      }

      console.log('File deleted successfully:', filename);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }
}

export const fileStorage = FileStorageService.getInstance();