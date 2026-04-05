interface AnalyzingViewProps {
  capturedImageUrl: string;
}

export function AnalyzingView({ capturedImageUrl }: AnalyzingViewProps) {
  return (
    <div className="relative flex items-center justify-center h-screen bg-black">
      <img
        src={capturedImageUrl}
        alt="Captured photo"
        className="w-full h-full object-contain"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
        <div className="w-12 h-12 border-4 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
        <p className="mt-4 text-lg text-white">Analyzing...</p>
      </div>
    </div>
  );
}
