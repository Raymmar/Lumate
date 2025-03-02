import { Client } from '@replit/object-storage';
import type { Result, RequestError, StorageObject } from '@replit/object-storage';

export class ObjectStorageService {
  private static instance: ObjectStorageService;
  private client: Client;
  private bucketId: string;

  private constructor() {
    console.log('Starting ObjectStorageService initialization');

    if (!process.env.REPLIT_DEFAULT_BUCKET_ID) {
      console.error('ObjectStorageService initialization failed: REPLIT_DEFAULT_BUCKET_ID is not set');
      throw new Error('REPLIT_DEFAULT_BUCKET_ID is not set');
    }

    this.bucketId = process.env.REPLIT_DEFAULT_BUCKET_ID;
    console.log('Initializing ObjectStorageService with bucket:', this.bucketId);

    try {
      this.client = new Client({
        bucketId: this.bucketId
      });
      console.log('Successfully initialized ObjectStorageService client');
    } catch (error) {
      console.error('Failed to initialize ObjectStorageService client:', error);
      throw error;
    }
  }

  public static getInstance(): ObjectStorageService {
    if (!ObjectStorageService.instance) {
      console.log('Creating new ObjectStorageService instance');
      ObjectStorageService.instance = new ObjectStorageService();
    }
    return ObjectStorageService.instance;
  }

  async uploadFile(file: Buffer, fileName: string, contentType: string): Promise<string> {
    try {
      console.log('Starting file upload:', { 
        fileName, 
        contentType, 
        size: file.length,
        bucketId: this.bucketId 
      });

      const key = `uploads/${Date.now()}-${fileName}`;

      // Test bucket access by trying to list objects
      try {
        await this.client.listObjects({ prefix: 'uploads/' });
        console.log('Successfully tested bucket access');
      } catch (error) {
        console.error('Bucket access test failed:', error);
        throw error;
      }

      await this.client.putObject(key, file, {
        contentType
      });
      console.log('File uploaded successfully:', { key });
      return key;
    } catch (error) {
      console.error('Failed to upload file:', {
        error,
        fileName,
        contentType,
        fileSize: file.length,
        bucketId: this.bucketId
      });
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      console.log('Deleting file:', { key, bucketId: this.bucketId });
      await this.client.deleteObject(key);
      console.log('File deleted successfully:', { key });
    } catch (error) {
      console.error('Failed to delete file:', { error, key, bucketId: this.bucketId });
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFileUrl(key: string): Promise<string> {
    try {
      console.log('Generating signed URL for:', { key, bucketId: this.bucketId });
      const url = await this.client.getSignedDownloadUrl(key);
      console.log('Generated signed URL:', { key, bucketId: this.bucketId });
      return url.toString();
    } catch (error) {
      console.error('Failed to get file URL:', { error, key, bucketId: this.bucketId });
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listFiles(prefix: string = 'uploads/'): Promise<string[]> {
    try {
      console.log('Listing files with prefix:', { prefix, bucketId: this.bucketId });

      const result = await this.client.listObjects({ prefix });

      console.log('Raw list response:', { result });

      if (!result || !result.data) {
        console.log('No files found or empty response');
        return [];
      }

      const fileKeys = result.data.map(obj => obj.key);
      console.log('Files found:', { 
        count: fileKeys.length, 
        prefix,
        bucketId: this.bucketId,
        files: fileKeys 
      });
      return fileKeys;
    } catch (error) {
      console.error('Failed to list files:', { error, prefix, bucketId: this.bucketId });
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}