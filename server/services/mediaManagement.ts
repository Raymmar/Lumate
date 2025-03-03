import { Client } from '@replit/object-storage';
import { randomUUID } from 'crypto';

// Types for media management
interface UploadResult {
  ok: boolean;
  url?: string;
  error?: string;
}

interface DeleteResult {
  ok: boolean;
  error?: string;
}

export class MediaManagementService {
  private client: Client;
  private bucketId: string;

  constructor() {
    this.bucketId = process.env.REPLIT_OBJECT_STORE_BUCKET_ID || '';
    if (!this.bucketId) {
      throw new Error('Object Storage bucket ID not configured');
    }
    this.client = new Client({ bucketId: this.bucketId });
  }

  async uploadImage(
    buffer: Buffer,
    originalFilename: string,
    metadata?: { [key: string]: string }
  ): Promise<UploadResult> {
    try {
      // Generate unique filename
      const ext = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `images/${randomUUID()}.${ext}`;

      // Validate file type
      const allowedTypes = ['jpg', 'jpeg', 'png', 'gif'];
      if (!allowedTypes.includes(ext)) {
        return {
          ok: false,
          error: 'Invalid file type. Only jpg, jpeg, png, and gif are allowed.'
        };
      }

      // Upload to object storage
      const uploadResult = await this.client.uploadFromBytes(filename, buffer);
      if (!uploadResult.ok) {
        return {
          ok: false,
          error: uploadResult.error?.message || 'Failed to upload image'
        };
      }

      // Return the URL for the uploaded file
      return {
        ok: true,
        url: `/api/storage/${encodeURIComponent(filename)}`
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to upload image'
      };
    }
  }

  async deleteImage(url: string): Promise<DeleteResult> {
    try {
      // Extract filename from URL
      const filename = url.includes(this.bucketId)
        ? decodeURIComponent(url.split(`${this.bucketId}.id.repl.co/`)[1])
        : url.startsWith('/api/storage/')
          ? decodeURIComponent(url.split('/api/storage/')[1])
          : url;

      const deleteResult = await this.client.delete(filename);

      if (!deleteResult.ok) {
        return {
          ok: false,
          error: deleteResult.error?.message || 'Failed to delete image'
        };
      }

      return { ok: true };
    } catch (error) {
      console.error('Error deleting image:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to delete image'
      };
    }
  }

  async getImage(filename: string): Promise<Buffer | null> {
    try {
      const result = await this.client.downloadAsBytes(filename);

      if (!result.ok || !result.value || result.value.length === 0) {
        console.error('Error getting image:', result.error);
        return null;
      }

      // IMPORTANT: Return the first element of the array as per documentation
      return result.value[0];
    } catch (error) {
      console.error('Error getting image:', error);
      return null;
    }
  }
}

export const mediaManagement = new MediaManagementService();