import { Client } from '@replit/object-storage';
import type { Result, RequestError, StorageObject } from '@replit/object-storage';

export class ObjectStorageService {
  private static instance: ObjectStorageService;
  private client: Client;
  private bucketId: string;

  private constructor() {
    if (!process.env.REPLIT_DEFAULT_BUCKET_ID) {
      throw new Error('REPLIT_DEFAULT_BUCKET_ID is not set');
    }
    this.bucketId = process.env.REPLIT_DEFAULT_BUCKET_ID;
    this.client = new Client({
      bucketId: this.bucketId
    });
  }

  public static getInstance(): ObjectStorageService {
    if (!ObjectStorageService.instance) {
      ObjectStorageService.instance = new ObjectStorageService();
    }
    return ObjectStorageService.instance;
  }

  async uploadFile(file: Buffer, fileName: string, contentType: string): Promise<string> {
    try {
      const key = `uploads/${Date.now()}-${fileName}`;
      await this.client.putObject(key, file, {
        contentType
      });
      return key;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw new Error('Failed to upload file to object storage');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.client.deleteObject(key);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw new Error('Failed to delete file from object storage');
    }
  }

  async getFileUrl(key: string): Promise<string> {
    try {
      const signedUrl = await this.client.getSignedDownloadUrl(key);
      return signedUrl.toString();
    } catch (error) {
      console.error('Failed to get file URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  async listFiles(prefix: string = 'uploads/'): Promise<string[]> {
    try {
      const result = await this.client.listObjects({ prefix });
      if (result.data) {
        return result.data.map(obj => obj.key);
      }
      return [];
    } catch (error) {
      console.error('Failed to list files:', error);
      throw new Error('Failed to list files from object storage');
    }
  }
}