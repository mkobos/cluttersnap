import { useEffect, useRef, useState, useCallback } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { createAnalyzer } from './ml/analyzerFactory';
import { useCameraPermission } from './hooks/useCameraPermission';
import { useHistory } from './hooks/useHistory';
import { LoadingScreen } from './components/LoadingScreen';
import { CameraView } from './components/CameraView';
import { AnalyzingView } from './components/AnalyzingView';
import { ResultView } from './components/ResultView';
import { HistoryList } from './components/HistoryList';
import type { ClutterAnalyzer } from './types';

function AppInner() {
  const { state, dispatch } = useAppContext();
  const analyzerRef = useRef<ClutterAnalyzer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { isIos, permissionState, requestPermission } = useCameraPermission();
  const history = useHistory();

  const loadModel = useCallback(async () => {
    setLoadError(null);
    try {
      const analyzer = createAnalyzer();
      await analyzer.load();
      analyzerRef.current = analyzer;
      dispatch({ type: 'MODEL_LOADED' });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load model');
    }
  }, [dispatch]);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  // Register service worker and listen for updates
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      import('workbox-window').then(({ Workbox }) => {
        const wb = new Workbox('/sw.js');
        wb.addEventListener('waiting', () => {
          dispatch({ type: 'UPDATE_AVAILABLE' });
        });
        wb.register();
      });
    }
  }, [dispatch]);

  // Show loading screen while model is initializing
  if (state.isModelLoading) {
    return (
      <LoadingScreen
        error={loadError}
        permissionState={permissionState}
        isIos={isIos}
        onRetry={loadModel}
        onRequestPermission={requestPermission}
      />
    );
  }

  // Handle permission errors on camera screen
  if (permissionState === 'denied' || permissionState === 'unsupported') {
    return (
      <LoadingScreen
        error={null}
        permissionState={permissionState}
        isIos={isIos}
        onRetry={() => {}}
        onRequestPermission={requestPermission}
      />
    );
  }

  switch (state.screen) {
    case 'analyzing':
      return <AnalyzingView capturedImageUrl={state.capturedImageUrl!} />;

    case 'result':
      return (
        <ResultView
          imageUrl={state.capturedImageUrl!}
          result={state.analysisResult!}
          resultSource={state.resultSource!}
          onRetake={() => dispatch({ type: 'RETAKE' })}
          onBack={() => dispatch({ type: 'BACK_TO_HISTORY' })}
        />
      );

    case 'history':
      return (
        <HistoryList
          entries={history.entries}
          isAvailable={history.isAvailable}
          onSelect={(imageUrl, result) =>
            dispatch({ type: 'VIEW_HISTORY_RESULT', imageUrl, result })
          }
          onDelete={history.deleteEntry}
          onClose={() => dispatch({ type: 'HIDE_HISTORY' })}
        />
      );

    case 'camera':
    default:
      return (
        <CameraView
          analyzer={analyzerRef.current!}
          onHistorySave={history.saveEntry}
          historyAvailable={history.isAvailable}
          saveError={history.saveError}
          updateAvailable={state.updateAvailable}
        />
      );
  }
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
