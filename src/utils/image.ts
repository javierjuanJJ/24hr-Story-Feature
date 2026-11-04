/**
 * Utility for transforming image files.
 *
 * This file contains imageFileToBase64, the "transformer" utility referenced
 * in the project requirements: it transforms a raw File selected by the user
 * into a storable base64 representation, resizing it if needed.
 */

/**
 * Converts an uploaded image file into a base64 string, resizing it first
 * if it exceeds the maximum allowed dimensions while preserving aspect ratio.
 *
 * @param file - the image file selected by the user
 * @param maxWidth - maximum allowed width in pixels
 * @param maxHeight - maximum allowed height in pixels
 * @returns a Promise that resolves to the base64 payload (without the data URL
 *          prefix), or null if the image could not be processed
 */
export function imageFileToBase64(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<string | null> {
  return new Promise((resolve) => {
    // Create a temporary URL for the file so the browser can load it into an Image.
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      // Release the temporary URL as soon as we have the image data.
      URL.revokeObjectURL(blobUrl);

      let { width, height } = img;

      // Downscale only when the image exceeds the max dimensions, keeping aspect ratio.
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Draw the (possibly resized) image onto a canvas and export as JPEG.
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataURL = canvas.toDataURL("image/jpeg", 0.9);

      // Strip the "data:image/jpeg;base64," prefix to store only the payload.
      const base64 = dataURL.split(",")[1];
      resolve(base64);
    };

    img.src = blobUrl;
  });
}
