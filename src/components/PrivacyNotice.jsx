export default function PrivacyNotice({ compact = false }) {
  if (compact) {
    return (
      <p className="text-center text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1.5">
        Your video never leaves your device — nothing is uploaded or saved.
      </p>
    );
  }

  return (
    <div className="bg-green-50 border border-green-300 rounded-xl p-4 text-center">
      <p className="text-sm font-semibold text-green-800">
        Your video never leaves your device.
      </p>
      <p className="text-sm text-green-700 mt-0.5">
        Nothing is uploaded. Nothing is saved. All processing happens locally in your browser.
      </p>
    </div>
  );
}
