import { useEffect, useRef, useState } from 'react';
import { initFaceDetector } from './utils/faceDetector';
import { processVideo } from './utils/videoProcessor';
import PrivacyNotice from './components/PrivacyNotice';
import DropZone from './components/DropZone';
import ProcessingView from './components/ProcessingView';
import ResultView from './components/ResultView';

// App states
const IDLE = 'idle';
const PROCESSING = 'processing';
const PREVIEW = 'preview';

export default function App() {
  const [appState, setAppState] = useState(IDLE);
  const [detectorReady, setDetectorReady] = useState(false);
  const [detectorError, setDetectorError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultMimeType, setResultMimeType] = useState(null);
  const [sourceFileName, setSourceFileName] = useState(null);
  const [processingError, setProcessingError] = useState(null);

  const detectorRef = useRef(null);
  const cancelTokenRef = useRef({ cancelled: false });

  // Initialize MediaPipe face detector once on mount
  useEffect(() => {
    initFaceDetector()
      .then((detector) => {
        detectorRef.current = detector;
        setDetectorReady(true);
      })
      .catch((err) => {
        console.error('Face detector init failed:', err);
        setDetectorError('Failed to load face detection model. Please refresh and try again.');
      });
  }, []);

  async function handleFile(file) {
    if (!detectorRef.current) return;
    setSourceFileName(file.name);
    setProcessingError(null);
    setProgress(0);
    setAppState(PROCESSING);

    const cancelToken = { cancelled: false };
    cancelTokenRef.current = cancelToken;

    try {
      const { url, mimeType } = await processVideo(
        file,
        detectorRef.current,
        setProgress,
        cancelToken
      );
      if (!cancelToken.cancelled) {
        setResultUrl(url);
        setResultMimeType(mimeType);
        setAppState(PREVIEW);
      }
    } catch (err) {
      if (err.message === 'cancelled') {
        reset();
        return;
      }
      setProcessingError(err.message || 'An error occurred while processing the video.');
      setAppState(IDLE);
    }
  }

  function handleCancel() {
    cancelTokenRef.current.cancelled = true;
  }

  function reset() {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setResultMimeType(null);
    setProgress(0);
    setProcessingError(null);
    setAppState(IDLE);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ClassBlur</h1>
          <p className="text-xs text-gray-500">Face blurring for educators</p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl flex flex-col gap-6">

          {appState === IDLE && (
            <>
              <div className="text-center">
                <img src="/icon.svg" alt="ClassBlur" className="w-36 h-36 rounded-3xl mx-auto mb-4"/>
                <h2 className="text-2xl font-bold text-gray-900">Blur faces in classroom videos</h2>
                <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto">
                  Select a video, and this tool will automatically detect and blur every face.
                  Save the result to share safely online.
                </p>
              </div>

              <PrivacyNotice />

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-center">
                <p className="font-semibold">Use a computer, not a phone.</p>
                <p className="mt-1">
                  Mobile devices aren't powerful enough to process the blur locally.
                  Transfer your video to a Mac or PC first, then run it through ClassBlur here.
                </p>
              </div>

              {detectorError ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 text-center">
                  {detectorError}
                </div>
              ) : (
                <DropZone onFile={handleFile} detectorReady={detectorReady} />
              )}

              {processingError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 text-center">
                  {processingError}
                </div>
              )}
            </>
          )}

          {appState === PROCESSING && (
            <ProcessingView progress={progress} onCancel={handleCancel} />
          )}

          {appState === PREVIEW && resultUrl && (
            <ResultView
              blobUrl={resultUrl}
              mimeType={resultMimeType}
              fileName={sourceFileName}
              onReset={reset}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-6 text-center flex flex-col gap-1">
        <p className="text-xs text-gray-400">
          No data is collected. No video is stored. Processing happens entirely in your browser.
        </p>
        <p className="text-xs text-gray-400">
          Developed by <a href="https://www.misterd.net" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">MisterD</a>, with help from Claude. Thanks to Binyomin for the idea.
        </p>
      </footer>
    </div>
  );
}
