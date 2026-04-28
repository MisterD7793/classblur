export default function PrivacyNotice({ compact = false }) {
  if (compact) {
    return (
      <p className="text-center text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1.5">
        This video is yours. We don't want it. It never leaves your device.
      </p>
    );
  }

  return (
    <div className="bg-green-50 border border-green-300 rounded-xl p-5 text-center">
      <p className="text-base font-bold text-green-900">
        This video is yours. We don't want it.
      </p>
      <p className="text-sm text-green-800 mt-2 leading-relaxed">
        Nothing leaves your computer. Nothing is sent anywhere.
        Everything — the face detection, the blurring, all of it — runs
        locally in your browser, on your computer.
      </p>
      <p className="text-sm font-semibold text-green-900 mt-2">
        Really. We mean it.
      </p>
    </div>
  );
}
