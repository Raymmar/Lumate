import { Client } from '@replit/object-storage';

// Your bucket ID should be in your .replit file
const client = new Client();

export interface StorageFile {
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: Date;
}

/**
 * Uploads a file to storage and returns the file URL
 */
export async function uploadFile(file: File): Promise<StorageFile> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `uploads/${Date.now()}-${file.name}`;

  // Use writeFile instead of upload
  const { error } = await client.writeFile(filename, buffer, {
    'content-type': file.type,
    'original-name': file.name,
    'size': file.size.toString(),
    'created-at': new Date().toISOString()
  });

  if (error) {
    throw new Error(`Failed to upload file: ${error}`);
  }

  return {
    name: file.name,
    url: `/api/storage/${encodeURIComponent(filename)}`,
    type: file.type,
    size: file.size,
    createdAt: new Date()
  };
}

/**
 * Deletes a file from storage
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    const filename = url.startsWith('/api/storage/')
      ? decodeURIComponent(url.split('/api/storage/')[1])
      : url;

    const { error } = await client.deleteFile(filename);
    if (error) {
      throw new Error(`Failed to delete file: ${error}`);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Gets a file's metadata from storage
 */
export async function getFileMetadata(filename: string): Promise<Record<string, string>> {
  const { metadata, error } = await client.getMetadata(filename);
  if (error || !metadata) {
    throw new Error(`Failed to get file metadata: ${error}`);
  }
  return metadata;
}

/**
 * Lists all files in storage
 */
export async function listFiles(): Promise<StorageFile[]> {
  const { files, error } = await client.listFiles({ prefix: 'uploads/' });
  if (error || !files) {
    throw new Error(`Failed to list files: ${error}`);
  }

  return Promise.all(files.map(async (file) => {
    const metadata = await getFileMetadata(file.name);
    return {
      name: metadata['original-name'] || file.name,
      url: `/api/storage/${encodeURIComponent(file.name)}`,
      type: metadata['content-type'] || 'application/octet-stream',
      size: parseInt(metadata['size'] || '0', 10),
      createdAt: new Date(metadata['created-at'] || Date.now())
    };
  }));
}