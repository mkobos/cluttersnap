const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];
const SIZE = 224;

/**
 * Resizes ImageData to 224x224 using an OffscreenCanvas (browser)
 * or works directly if already 224x224 (tests).
 * Returns CHW Float32Array normalized with ImageNet stats.
 */
export function preprocessImage(imageData: ImageData): Float32Array {
  let pixels: Uint8ClampedArray;

  if (imageData.width === SIZE && imageData.height === SIZE) {
    pixels = imageData.data;
  } else {
    pixels = resizeImageData(imageData);
  }

  return normalizePixels(pixels);
}

function resizeImageData(imageData: ImageData): Uint8ClampedArray {
  // Use OffscreenCanvas for browser resize
  const srcCanvas = new OffscreenCanvas(imageData.width, imageData.height);
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.putImageData(imageData, 0, 0);

  const dstCanvas = new OffscreenCanvas(SIZE, SIZE);
  const dstCtx = dstCanvas.getContext('2d')!;
  dstCtx.drawImage(srcCanvas, 0, 0, SIZE, SIZE);

  return dstCtx.getImageData(0, 0, SIZE, SIZE).data;
}

function normalizePixels(pixels: Uint8ClampedArray): Float32Array {
  const channelSize = SIZE * SIZE;
  const tensor = new Float32Array(3 * channelSize);

  for (let i = 0; i < channelSize; i++) {
    const r = pixels[i * 4] / 255;
    const g = pixels[i * 4 + 1] / 255;
    const b = pixels[i * 4 + 2] / 255;

    tensor[i] = (r - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    tensor[channelSize + i] = (g - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    tensor[2 * channelSize + i] = (b - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
  }

  return tensor;
}
