/** Compress an image in-browser before admin upload (WebP, longest edge capped). */
export async function compressImageForAdminUpload(
  file: File,
  options?: { maxEdge?: number; quality?: number },
): Promise<{ base64: string; contentType: string; fileName: string }> {
  const maxEdge = options?.maxEdge ?? 1600;
  const quality = options?.quality ?? 0.82;

  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    const base64 = await readFileAsDataUrl(file);
    return {
      base64,
      contentType: file.type || 'image/jpeg',
      fileName: file.name,
    };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    const base64 = await readFileAsDataUrl(file);
    return {
      base64,
      contentType: file.type || 'image/jpeg',
      fileName: file.name,
    };
  }

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    const base64 = await readFileAsDataUrl(file);
    return {
      base64,
      contentType: file.type || 'image/jpeg',
      fileName: file.name,
    };
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvasToBlob(canvas, quality);
  const base64 = await blobToDataUrl(blob);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';

  return {
    base64,
    contentType: blob.type,
    fileName: `${baseName}.${ext}`,
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (webp) => {
        if (webp && webp.size > 0) {
          resolve(webp);
          return;
        }
        canvas.toBlob(
          (jpeg) => {
            if (jpeg && jpeg.size > 0) resolve(jpeg);
            else reject(new Error('Failed to compress image'));
          },
          'image/jpeg',
          quality,
        );
      },
      'image/webp',
      quality,
    );
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Failed to read file'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Failed to encode image'));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error('File encode error'));
    reader.readAsDataURL(blob);
  });
}
