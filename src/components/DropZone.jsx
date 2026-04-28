import { useRef, useState } from 'react';

function validateFile(file) {
  if (!file) return 'No file selected.';
  // Accept video/* and also files with no type but a video extension (some browsers omit type for MOV)
  const videoExtensions = /\.(mp4|mov|m4v|webm|ogv|3gp|3g2|avi|mkv)$/i;
  if (!file.type.startsWith('video/') && !videoExtensions.test(file.name)) {
    return 'Please select a video file.';
  }
  return null;
}

export default function DropZone({ onFile, detectorReady }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);

  function handleFile(file) {
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setError(null);
    onFile(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  function onInputChange(e) {
    handleFile(e.target.files[0]);
    e.target.value = '';
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 transition-colors cursor-pointer
        ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40'}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      aria-label="Select video file"
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onInputChange}
      />
      <div className="text-5xl select-none">🎬</div>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-700">
          {detectorReady ? 'Drop your video here' : 'Loading face detector…'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          or click to browse &mdash; MP4, MOV, WebM and more
        </p>
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-center max-w-sm">
          {error}
        </p>
      )}
    </div>
  );
}
