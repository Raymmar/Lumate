import { Client } from '@replit/object-storage';
import { randomUUID } from 'crypto';

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
  client: Client;

  constructor() {
    this.client = new Client();
    console.log('Storage initialized with Object Storage client');
  }

  async uploadImage(
    buffer: Buffer,
    originalFilename: string
  ): Promise<{ ok: boolean; url?: string; error?: string }> {
    try {
      const sanitizedFilename = sanitizeFilename(originalFilename);
      // Store files in an 'images' directory
      const filepath = `images/${sanitizedFilename}`;
      console.log(`[Storage] Starting upload for file: ${originalFilename}`);
      console.log(`[Storage] Sanitized filepath: ${filepath}`);
      console.log(`[Storage] File size: ${buffer.length} bytes`);

      const { ok, error } = await this.client.uploadFromBytes(filepath, buffer);

      if (!ok) {
        console.error('[Storage] Upload failed:', error);
        return {
          ok: false,
          error: `Failed to upload file: ${error}`
        };
      }

      console.log(`[Storage] Upload successful for file: ${filepath}`);

      // Return URL to our API endpoint
      const url = `/api/storage/${encodeURIComponent(filepath)}`;
      console.log(`[Storage] Generated URL: ${url}`);
      return {
        ok: true,
        url
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

  async deleteImage(url: string): Promise<{ ok: boolean; error?: string }> {
    try {
      // Extract filename if it's a full URL
      const filename = url.startsWith('/api/storage/')
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