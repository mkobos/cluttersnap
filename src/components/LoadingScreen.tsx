interface LoadingScreenProps {
  error: string | null;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unsupported';
  isIos: boolean;
  onRetry: () => void;
  onRequestPermission: () => void;
}

export function LoadingScreen({
  error,
  permissionState,
  isIos,
  onRetry,
  onRequestPermission,
}: LoadingScreenProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-6 text-center">
        <p className="text-xl text-red-400">{error}</p>
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-blue-600 rounded-lg text-white font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (permissionState === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-6 text-center">
        <p className="text-xl text-amber-400">Camera access is required</p>
        <p className="text-slate-300">
          Please enable camera access in your browser settings and reload the page.
        </p>
      </div>
    );
  }

  if (permissionState === 'unsupported') {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-6 text-center">
        <p className="text-xl text-amber-400">Browser not supported</p>
        <p className="text-slate-300">
          Your browser does not support camera access. Please use Chrome or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6">
      <div className="w-12 h-12 border-4 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
      <p className="text-lg text-slate-300">Loading model...</p>
      {isIos && permissionState === 'prompt' && (
        <button
          onClick={onRequestPermission}
          className="px-6 py-3 bg-blue-600 rounded-lg text-white font-semibold"
        >
          Enable Camera
        </button>
      )}
    </div>
  );
}
