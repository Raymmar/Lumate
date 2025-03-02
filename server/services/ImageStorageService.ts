import { Client } from '@replit/object-storage';

export class ImageStorageService {
  private static instance: ImageStorageService;
  private client: Client;
  private bucketName: string = 'uploads';

  private constructor() {
    if (!process.env.REPLIT_DEFAULT_BUCKET_ID) {
      throw new Error('REPLIT_DEFAULT_BUCKET_ID environment variable is required');
    }

    this.client = new Client({
      bucketId: process.env.REPLIT_DEFAULT_BUCKET_ID,
    });
  }

  public static getInstance(): ImageStorageService {
    if (!ImageStorageService.instance) {
      ImageStorageService.instance = new ImageStorageService();
    }
    return ImageStorageService.instance;
  }

  async uploadImage(file: Buffer, fileName: string): Promise<string> {
    try {
      // Generate a unique file name to avoid collisions
      const uniqueFileName = `${Date.now()}-${fileName}`;
      const key = `${this.bucketName}/${uniqueFileName}`;

      // Upload the file using put method
      await this.client.put(key, file);

      // Get the public URL using getUrl
      const url = await this.client.getUrl(key);

      console.log('Successfully uploaded image:', {
        fileName: uniqueFileName,
        url
      });

      return url;
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw new Error('Failed to upload image');
    }
  }

  async deleteImage(url: string): Promise<void> {
    try {
      // Extract the key from the URL
      const urlObj = new URL(url);
      const key = urlObj.pathname.slice(1); // Remove leading slash

      await this.client.delete(key);
      console.log('Successfully deleted image:', key);
    } catch (error) {
      console.error('Failed to delete image:', error);
      throw new Error('Failed to delete image');
    }
  }
}

export const imageStorage = ImageStorageService.getInstance();