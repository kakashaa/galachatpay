/**
 * Compress an image file by resizing and reducing quality.
 * Returns a compressed File object.
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.7
): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith("image/")) return file;

  // Skip small files (< 500KB)
  if (file.size < 500 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const ext = file.name.split(".").pop()?.toLowerCase();
            const name = file.name.replace(/\.[^.]+$/, "") + "_compressed." + (ext || "jpg");
            resolve(new File([blob], name, { type: "image/jpeg" }));
          } else {
            resolve(file); // fallback
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback on error
    };

    img.src = url;
  });
}

/**
 * Compress an image file then convert to base64 string.
 * Much faster than raw fileToBase64 for large camera photos.
 */
export async function compressImageToBase64(
  file: File,
  maxWidth = 1200,
  quality = 0.7
): Promise<string> {
  const compressed = await compressImage(file, maxWidth, maxWidth, quality);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(compressed);
  });
}
