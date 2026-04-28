import { useRef } from 'react';
import PrivacyNotice from './PrivacyNotice';
import { mimeTypeToExtension } from '../utils/videoProcessor';

export default function ResultView({ blobUrl, mimeType, fileName, onReset }) {
  const downloadRef = useRef(null);

  const ext = mimeTypeToExtension(mimeType ?? '');
  const baseName = fileName?.replace(/\.[^.]+$/, '') ?? 'blurred-video';
  const outName = `${baseName}-blurred.${ext}`;

  function handleDownload() {
    // Revoke the blob URL 60 s after download is triggered (enough time for browser to grab it)
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 60_000);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-800">Faces blurred — ready to download</p>
        <p className="text-sm text-gray-500 mt-1">Review the preview below, then download your video.</p>
      </div>

      {/* Video preview */}
      <video
        src={blobUrl}
        controls
        className="w-full max-h-[60vh] rounded-xl bg-black shadow-md"
      />

      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        <PrivacyNotice compact />

        <a
          ref={downloadRef}
          href={blobUrl}
          download={outName}
          onClick={handleDownload}
          className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          Download {outName}
        </a>

        <button
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2 transition-colors"
        >
          Process another video
        </button>
      </div>
    </div>
  );
}
