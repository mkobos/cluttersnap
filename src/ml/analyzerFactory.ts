import type { ClutterAnalyzer } from '../types';
import { MockClutterAnalyzer } from './MockClutterAnalyzer';
import { OnnxClutterAnalyzer } from './OnnxClutterAnalyzer';

export function createAnalyzer(): ClutterAnalyzer {
  if (import.meta.env.VITE_USE_MOCK_MODEL === 'true') {
    return new MockClutterAnalyzer();
  }
  return new OnnxClutterAnalyzer('/models/clutter_model.onnx');
}
