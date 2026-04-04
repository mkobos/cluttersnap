import type { ClutterAnalyzer } from '../types';
import { MockClutterAnalyzer } from './MockClutterAnalyzer';

export function createAnalyzer(): ClutterAnalyzer {
  if (import.meta.env.VITE_USE_MOCK_MODEL === 'true') {
    return new MockClutterAnalyzer();
  }
  // OnnxClutterAnalyzer added in Task 7
  throw new Error('Real ONNX model not yet implemented. Set VITE_USE_MOCK_MODEL=true.');
}
