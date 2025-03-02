import pkg from "@replit/object-storage";
const { ObjectStore } = pkg;

export class MediaManagementService {
  private static instance: MediaManagementService;
  private store: typeof ObjectStore;

  private constructor() {
    const bucketId = process.env.REPLIT_DEFAULT_BUCKET_ID;
    if (!bucketId) {
      throw new Error("REPLIT_DEFAULT_BUCKET_ID is missing");
    }
    try {
      this.store = new ObjectStore(bucketId);
      console.log("Successfully initialized ObjectStore with bucket:", bucketId);
    } catch (error) {
      console.error("Failed to initialize ObjectStore:", error);
      throw error;
    }
  }

  public static getInstance(): MediaManagementService {
    if (!MediaManagementService.instance) {
      MediaManagementService.instance = new MediaManagementService();
    }
    return MediaManagementService.instance;
  }

  public async uploadImage(file: Buffer, originalFilename: string): Promise<string> {
    try {
      const ext = originalFilename.split('.').pop() || 'jpg';
      const key = `uploads/${Date.now()}.${ext}`;

      console.log('Attempting to upload file:', {
        key,
        size: file.length,
        extension: ext
      });

      await this.store.put(key, file);
      const url = await this.store.getSignedUrl(key);

      console.log('Successfully uploaded image:', { key, url });
      return url;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload image');
    }
  }
}