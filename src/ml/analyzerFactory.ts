import type { ClutterAnalyzer } from '../types';
import { ApiClutterAnalyzer } from './ApiClutterAnalyzer';

export function createAnalyzer(): ClutterAnalyzer {
  return new ApiClutterAnalyzer('/api/analyze');
}
