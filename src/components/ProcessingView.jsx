export default function ProcessingView({ progress, onCancel }) {
  const pct = Math.round(progress * 100);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-800">Processing your video…</p>
        <p className="text-sm text-gray-500 mt-1">
          Detecting and blurring faces. This takes as long as your video.
        </p>
      </div>

      <div className="w-full max-w-md">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1.5">
        Everything is happening locally — your video is not being uploaded.
      </p>

      <button
        onClick={onCancel}
        className="text-sm text-gray-400 hover:text-red-500 underline underline-offset-2 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
