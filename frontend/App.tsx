import { useEffect, useRef } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ApiClutterAnalyzer } from './ml/ApiClutterAnalyzer';
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
  const analyzerRef = useRef<ClutterAnalyzer>(new ApiClutterAnalyzer('/api/analyze'));
  const { isIos, permissionState, requestPermission } = useCameraPermission();
  const history = useHistory();

  // Register service worker and listen for updates
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      import('workbox-window').then(({ Workbox }) => {
        const wb = new Workbox('/sw.js');
        wb.addEventListener('waiting', () => {
          dispatch({ type: 'UPDATE_AVAILABLE' });
        });
        wb.register();
      }).catch(console.error);
    }
  }, [dispatch]);

  if (permissionState !== 'granted') {
    return (
      <LoadingScreen
        permissionState={permissionState}
        isIos={isIos}
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
          analyzer={analyzerRef.current}
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
