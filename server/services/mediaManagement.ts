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

function sanitizeFilename(filename: string): string {
  // Remove special characters and spaces, replace with hyphens
  const sanitized = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '-')
    .replace(/-+/g, '-'); // Replace multiple consecutive hyphens with a single one

  const [name, ext] = sanitized.split('.');
  // Ensure we don't exceed reasonable filename length
  const truncatedName = name.slice(0, 50);
  return `${truncatedName}.${ext}`;
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
      const sanitizedFilename = sanitizeFilename(originalFilename);
      const filename = `uploads/${randomUUID()}-${sanitizedFilename}`;

      // Validate file type
      const allowedTypes = ['jpg', 'jpeg', 'png', 'gif'];
      if (!allowedTypes.includes(ext)) {
        return {
          ok: false,
          error: 'Invalid file type. Only jpg, jpeg, png, and gif are allowed.'
        };
      }

      console.log(`[Storage] Starting upload for file: ${filename}`);
      console.log(`[Storage] File size: ${buffer.length} bytes`);

      const { ok, error } = await this.client.uploadFromBytes(filename, buffer);

      if (!ok) {
        console.error('[Storage] Upload failed:', error);
        return {
          ok: false,
          error: `Failed to upload file: ${error}`
        };
      }

      console.log(`[Storage] Upload successful for file: ${filename}`);

      // Return the URL for the uploaded file
      return {
        ok: true,
        url: `/api/storage/${encodeURIComponent(filename)}`
      };
    } catch (error) {
      console.error('[Storage] Upload error:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to upload image'
      };
    }
  }

  async getImage(filename: string): Promise<Buffer | null> {
    try {
      console.log(`[Storage] Getting image: ${filename}`);
      const result = await this.client.downloadAsBytes(filename);

      if (!result.ok || !result.value || result.value.length === 0) {
        console.error('[Storage] Error getting image:', result.error);
        return null;
      }

      // IMPORTANT: Return the first element of the array as per documentation
      return result.value[0];
    } catch (error) {
      console.error('[Storage] Error getting image:', error);
      return null;
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

      console.log(`[Storage] Deleting image: ${filename}`);
      const { ok, error } = await this.client.delete(filename);

      if (!ok) {
        console.error('[Storage] Delete failed:', error);
        return {
          ok: false,
          error: `Failed to delete file: ${error}`
        };
      }

      return { ok: true };
    } catch (error) {
      console.error('[Storage] Delete error:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to delete image'
      };
    }
  }
}

export const mediaManagement = new MediaManagementService();