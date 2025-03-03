export function getFileUrl(filename: string): string {
  if (!filename) return '';
  
  // Handle different URL formats
  if (filename.startsWith('http')) {
    return filename;
  }
  
  return `/api/storage/${encodeURIComponent(filename)}`;
}

export function getImageUrl(filename: string): string {
  return getFileUrl(filename);
}

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  const data = await response.json();
  return data.url;
}
