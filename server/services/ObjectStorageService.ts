import { Client, ClientOptions } from '@replit/object-storage';

const client = new Client({
  endPoint: process.env.REPLIT_OBJECT_STORE_URL || '',
  port: 443,
  accessKey: process.env.REPLIT_OBJECT_STORE_ACCESS_KEY || '',
  secretKey: process.env.REPLIT_OBJECT_STORE_SECRET_KEY || '',
  bucket: process.env.REPLIT_OBJECT_STORE_BUCKET || '',
  useSSL: true,
} as ClientOptions);

export const uploadImage = async (file: Buffer, filename: string): Promise<string> => {
  try {
    await client.putObjectFile(filename, file);
    const url = await client.getPresignedGetUrl(filename);
    return url;
  } catch (error) {
    console.error('Failed to upload image:', error);
    throw error;
  }
};

export const getImageUrl = async (filename: string): Promise<string> => {
  try {
    const url = await client.getPresignedGetUrl(filename);
    return url;
  } catch (error) {
    console.error('Failed to get image URL:', error);
    throw error;
  }
};