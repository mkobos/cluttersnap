import { useCallback, useEffect, useRef, useState } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useAppContext } from '../context/AppContext';
import type { ClutterAnalyzer, AnalysisResult } from '../types';

interface CameraViewProps {
  analyzer: ClutterAnalyzer;
  onHistorySave: (result: AnalysisResult, imageDataUrl: string) => Promise<void>;
  historyAvailable: boolean;
  saveError: string | null;
  updateAvailable: boolean;
}

export function CameraView({
  analyzer,
  onHistorySave,
  historyAvailable,
  saveError,
  updateAvailable,
}: CameraViewProps) {
  const { dispatch } = useAppContext();
  const { videoRef, capture, streamError } = useCamera();
  const [isCapturing, setIsCapturing] = useState(false);
  const isCapturingRef = useRef(false);
  const [toast, setToast] = useState<string | null>(null);
  const [idbNoticeShown, setIdbNoticeShown] = useState(false);

  // Show IDB unavailable notice once
  useEffect(() => {
    if (!historyAvailable && !idbNoticeShown) {
      setToast('History feature is disabled in this browser mode.');
      setIdbNoticeShown(true);
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [historyAvailable, idbNoticeShown]);

  // Show save error as toast
  useEffect(() => {
    if (saveError) {
      setToast(saveError);
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [saveError]);

  useEffect(() => {
    if (streamError) {
      setToast(streamError);
    }
  }, [streamError]);

  const handleCapture = useCallback(async () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    setIsCapturing(true);
    try {
      const { imageData, dataUrl } = capture();
      dispatch({ type: 'CAPTURE', imageUrl: dataUrl });

      const result = await analyzer.analyze(imageData);
      dispatch({ type: 'ANALYSIS_COMPLETE', result });

      if (historyAvailable) {
        await onHistorySave(result, dataUrl);
      }
    } catch (err) {
      dispatch({ type: 'ERROR', message: err instanceof Error ? err.message : 'Analysis failed' });
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  }, [analyzer, capture, dispatch, historyAvailable, onHistorySave]);

  return (
    <div className="relative h-screen bg-black">
      {/* Update banner — only shown on camera screen */}
      {updateAvailable && (
        <div
          className="absolute top-0 left-0 right-0 z-10 bg-blue-600 text-white text-center py-2 text-sm cursor-pointer"
          onClick={() => window.location.reload()}
        >
          New version available — tap to reload
        </div>
      )}

      {/* Camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* History button */}
      <button
        onClick={() => dispatch({ type: 'SHOW_HISTORY' })}
        className="absolute top-4 right-4 z-10 w-10 h-10 bg-slate-800/70 rounded-full flex items-center justify-center"
        aria-label="History"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Capture button */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <button
          onClick={handleCapture}
          disabled={isCapturing}
          className="rounded-full border-4 border-white bg-white/20 active:bg-white/40 disabled:opacity-50"
          style={{ width: 72, height: 72 }}
          aria-label="Capture"
        />
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="absolute bottom-28 left-4 right-4 bg-slate-800/90 text-white text-center py-2 px-4 rounded-lg text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}
