import pkg from "@replit/object-storage";
const { ObjectStore } = pkg;

export class MediaManagementService {
  private static instance: MediaManagementService;
  private objectStore: ObjectStore;

  private constructor() {
    if (!process.env.REPLIT_DEFAULT_BUCKET_ID) {
      throw new Error("Object storage credentials not found");
    }

    this.objectStore = new ObjectStore();
  }

  public static getInstance(): MediaManagementService {
    if (!MediaManagementService.instance) {
      MediaManagementService.instance = new MediaManagementService();
    }
    return MediaManagementService.instance;
  }

  public async uploadImage(file: Buffer, filename: string): Promise<string> {
    try {
      // Generate a unique key for the image
      const key = `images/${Date.now()}-${filename}`;

      // Upload the file
      await this.objectStore.put(key, file);

      // Get the public URL
      const url = await this.objectStore.getSignedUrl(key);

      return url;
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw new Error('Failed to upload image');
    }
  }

  public async deleteImage(url: string): Promise<void> {
    try {
      // Extract key from URL
      const key = url.split('/').slice(-2).join('/');
      await this.objectStore.delete(key);
    } catch (error) {
      console.error('Failed to delete image:', error);
      throw new Error('Failed to delete image');
    }
  }
}