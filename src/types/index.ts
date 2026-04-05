export interface AnalysisResult {
  score: number;           // 1.0–10.0
  heatmap: Float32Array;   // flattened [H*W], normalized 0–1, row-major
  heatmapWidth: number;    // e.g. 7
  heatmapHeight: number;   // e.g. 7
}

export interface ClutterAnalyzer {
  load(): Promise<void>;
  analyze(imageData: ImageData): Promise<AnalysisResult>;
}

export type Screen = 'camera' | 'analyzing' | 'result' | 'history';

export interface AppState {
  screen: Screen;
  capturedImageUrl: string | null;
  analysisResult: AnalysisResult | null;
  error: string | null;
  resultSource: 'capture' | 'history' | null;
  updateAvailable: boolean;
}

export type Action =
  | { type: 'CAPTURE'; imageUrl: string }
  | { type: 'ANALYSIS_COMPLETE'; result: AnalysisResult }
  | { type: 'ERROR'; message: string }
  | { type: 'RETAKE' }
  | { type: 'SHOW_HISTORY' }
  | { type: 'HIDE_HISTORY' }
  | { type: 'VIEW_HISTORY_RESULT'; imageUrl: string; result: AnalysisResult }
  | { type: 'BACK_TO_HISTORY' }
  | { type: 'UPDATE_AVAILABLE' };

export interface HistoryEntry {
  id?: number;
  score: number;
  imageDataUrl: string;
  thumbnailDataUrl: string;
  heatmap: Float32Array;
  heatmapWidth: number;
  heatmapHeight: number;
  timestamp: number;
}
