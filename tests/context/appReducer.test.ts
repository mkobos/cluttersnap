import { describe, it, expect } from 'vitest';
import { appReducer, initialState } from '../../src/context/AppContext';
import type { AppState, AnalysisResult } from '../../src/types';

const mockResult: AnalysisResult = {
  score: 7.3,
  heatmap: new Float32Array([0.1, 0.5, 0.9, 0.2]),
  heatmapWidth: 2,
  heatmapHeight: 2,
};

describe('appReducer', () => {
  it('initialState has screen=camera', () => {
    expect(initialState.screen).toBe('camera');
  });

  it('CAPTURE transitions to analyzing screen', () => {
    const state = appReducer(initialState, { type: 'CAPTURE', imageUrl: 'data:image/jpeg;base64,abc' });
    expect(state.screen).toBe('analyzing');
    expect(state.capturedImageUrl).toBe('data:image/jpeg;base64,abc');
    expect(state.resultSource).toBe('capture');
  });

  it('ANALYSIS_COMPLETE transitions to result screen', () => {
    const prev: AppState = { ...initialState, screen: 'analyzing', capturedImageUrl: 'url', resultSource: 'capture' };
    const state = appReducer(prev, { type: 'ANALYSIS_COMPLETE', result: mockResult });
    expect(state.screen).toBe('result');
    expect(state.analysisResult).toBe(mockResult);
  });

  it('ERROR returns to camera with error message', () => {
    const prev: AppState = { ...initialState, screen: 'analyzing', capturedImageUrl: 'url' };
    const state = appReducer(prev, { type: 'ERROR', message: 'Inference failed' });
    expect(state.screen).toBe('camera');
    expect(state.error).toBe('Inference failed');
    expect(state.capturedImageUrl).toBeNull();
  });

  it('RETAKE returns to camera and clears result', () => {
    const prev: AppState = { ...initialState, screen: 'result', capturedImageUrl: 'url', analysisResult: mockResult, resultSource: 'capture' };
    const state = appReducer(prev, { type: 'RETAKE' });
    expect(state.screen).toBe('camera');
    expect(state.capturedImageUrl).toBeNull();
    expect(state.analysisResult).toBeNull();
  });

  it('RETAKE clears error field', () => {
    const prev: AppState = { ...initialState, screen: 'result', error: 'some error', capturedImageUrl: 'url', analysisResult: null, resultSource: 'capture' };
    const state = appReducer(prev, { type: 'RETAKE' });
    expect(state.error).toBeNull();
  });

  it('SHOW_HISTORY transitions to history screen', () => {
    const state = appReducer(initialState, { type: 'SHOW_HISTORY' });
    expect(state.screen).toBe('history');
  });

  it('HIDE_HISTORY returns to camera', () => {
    const prev: AppState = { ...initialState, screen: 'history' };
    const state = appReducer(prev, { type: 'HIDE_HISTORY' });
    expect(state.screen).toBe('camera');
  });

  it('VIEW_HISTORY_RESULT transitions to result with history source', () => {
    const prev: AppState = { ...initialState, screen: 'history' };
    const state = appReducer(prev, { type: 'VIEW_HISTORY_RESULT', imageUrl: 'hist-url', result: mockResult });
    expect(state.screen).toBe('result');
    expect(state.capturedImageUrl).toBe('hist-url');
    expect(state.analysisResult).toBe(mockResult);
    expect(state.resultSource).toBe('history');
  });

  it('BACK_TO_HISTORY returns to history from result', () => {
    const prev: AppState = { ...initialState, screen: 'result', resultSource: 'history' };
    const state = appReducer(prev, { type: 'BACK_TO_HISTORY' });
    expect(state.screen).toBe('history');
  });

  it('UPDATE_AVAILABLE sets flag', () => {
    const state = appReducer(initialState, { type: 'UPDATE_AVAILABLE' });
    expect(state.updateAvailable).toBe(true);
  });
});
