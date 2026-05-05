const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const DEFAULT_QUALITY = 0.8;
const TARGET_BYTES = 500 * 1024;

export function formatBytes(bytes = 0) {
  if (!bytes) return "0KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function calculateSize(width, height) {
  const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height, 1);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Photo read nahi ho paayi."));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Photo compress nahi ho paayi."));
      },
      "image/jpeg",
      quality
    );
  });
}

async function loadBitmap(file) {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      return createImageBitmap(file);
    }
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Photo preview nahi ban paayi."));
    };
    image.src = url;
  });
}

export async function compressImage(file) {
  const bitmap = await loadBitmap(file);
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  const { width, height } = calculateSize(sourceWidth, sourceHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, width, height);

  let quality = DEFAULT_QUALITY;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > TARGET_BYTES && quality > 0.55) {
    quality = Math.max(quality - 0.08, 0.55);
    blob = await canvasToBlob(canvas, quality);
  }

  const base64 = await blobToBase64(blob);

  return {
    base64,
    blob,
    fileName: file.name || "crop-photo.jpg",
    mimeType: blob.type || "image/jpeg",
    originalSize: file.size,
    compressedSize: blob.size,
    width,
    height,
    quality,
    compressionText: `Photo ${formatBytes(file.size)} → ${formatBytes(blob.size)} mein convert ki`,
  };
}
