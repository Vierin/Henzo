export async function convertImageToWebp(
	file: File,
	maxDimension = 1400,
	quality = 0.85,
): Promise<File> {
	if (!file.type.startsWith('image/')) return file;

	const objectUrl = URL.createObjectURL(file);

	try {
		const img = await new Promise<HTMLImageElement>((resolve, reject) => {
			const image = new Image();
			image.onload = () => resolve(image);
			image.onerror = () => reject(new Error('Failed to load image'));
			image.src = objectUrl;
		});

		const maxSide = Math.max(img.width, img.height);
		const scale = maxSide > maxDimension ? maxDimension / maxSide : 1;
		const targetWidth = Math.round(img.width * scale);
		const targetHeight = Math.round(img.height * scale);

		const canvas = document.createElement('canvas');
		canvas.width = targetWidth;
		canvas.height = targetHeight;

		const ctx = canvas.getContext('2d');
		if (!ctx) return file;

		ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(resolve, 'image/webp', quality);
		});

		if (!blob) return file;

		const baseName = file.name.replace(/\.[^.]+$/, '');
		return new File([blob], `${baseName}.webp`, {
			type: 'image/webp',
			lastModified: Date.now(),
		});
	} catch {
		return file;
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}
