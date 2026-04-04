const POWER_ITERATIONS = 25;

/**
 * Computes Eigen-CAM heatmap from a feature map tensor.
 * @param featureMap - flat Float32Array of shape [C, H, W]
 * @param C - number of channels
 * @param H - spatial height
 * @param W - spatial width
 * @returns Float32Array of length H*W, normalized to [0, 1], row-major
 */
export function computeEigenCam(
  featureMap: Float32Array,
  C: number,
  H: number,
  W: number
): Float32Array {
  const spatialSize = H * W;

  if (featureMap.length !== C * spatialSize) {
    throw new Error(
      `featureMap length ${featureMap.length} does not match C*H*W = ${C}*${H}*${W} = ${C * spatialSize}`
    );
  }

  // M is [C, spatialSize] — featureMap is already in this layout
  // We need the dominant right singular vector of M via power iteration on M^T M

  // v = ones(spatialSize)
  let v = new Float32Array(spatialSize);
  v.fill(1);

  for (let iter = 0; iter < POWER_ITERATIONS; iter++) {
    // Compute Mv = M * v → result has length C
    const mv = new Float32Array(C);
    for (let c = 0; c < C; c++) {
      let sum = 0;
      const offset = c * spatialSize;
      for (let j = 0; j < spatialSize; j++) {
        sum += featureMap[offset + j] * v[j];
      }
      mv[c] = sum;
    }

    // Compute M^T * (Mv) → result has length spatialSize
    const mtmv = new Float32Array(spatialSize);
    for (let j = 0; j < spatialSize; j++) {
      let sum = 0;
      for (let c = 0; c < C; c++) {
        sum += featureMap[c * spatialSize + j] * mv[c];
      }
      mtmv[j] = sum;
    }

    // Normalize
    let norm = 0;
    for (let j = 0; j < spatialSize; j++) {
      norm += mtmv[j] * mtmv[j];
    }
    norm = Math.sqrt(norm);

    if (norm === 0) {
      return new Float32Array(spatialSize); // all zeros
    }

    for (let j = 0; j < spatialSize; j++) {
      v[j] = mtmv[j] / norm;
    }
  }

  // ReLU: clamp negatives to zero
  for (let j = 0; j < spatialSize; j++) {
    if (v[j] < 0) v[j] = 0;
  }

  // Normalize to [0, 1]
  let max = 0;
  for (let j = 0; j < spatialSize; j++) {
    if (v[j] > max) max = v[j];
  }

  if (max > 0) {
    for (let j = 0; j < spatialSize; j++) {
      v[j] /= max;
    }
  }

  return v;
}
