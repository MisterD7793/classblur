import { detectFaces } from './faceDetector';

const PIXEL_BLOCK = 8;     // face region is downsampled to 1/PIXEL_BLOCK then scaled back up
const FACE_PADDING = 0.2;  // expand bounding box by 20% each side for full coverage

function bestMimeType() {
  for (const mime of [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

export function mimeTypeToExtension(mimeType) {
  return mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
}

function pad(box, vw, vh) {
  const px = box.width * FACE_PADDING;
  const py = box.height * FACE_PADDING;
  return {
    x: Math.max(0, box.originX - px),
    y: Math.max(0, box.originY - py),
    w: Math.min(vw - box.originX, box.width + px * 2),
    h: Math.min(vh - box.originY, box.height + py * 2),
  };
}

// Temp canvas for pixelation — reused across frames to avoid allocation churn
const _tempCanvas = document.createElement('canvas');
const _tempCtx = _tempCanvas.getContext('2d');

function pixelateFace(ctx, video, x, y, w, h) {
  // Step 1: draw the face region very small onto a temp canvas (with smoothing)
  const smallW = Math.max(1, Math.floor(w / PIXEL_BLOCK));
  const smallH = Math.max(1, Math.floor(h / PIXEL_BLOCK));
  _tempCanvas.width = smallW;
  _tempCanvas.height = smallH;
  _tempCtx.imageSmoothingEnabled = true;
  _tempCtx.drawImage(video, x, y, w, h, 0, 0, smallW, smallH);

  // Step 2: draw that tiny image back at full size without smoothing → pixelated
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_tempCanvas, 0, 0, smallW, smallH, x, y, w, h);
  ctx.imageSmoothingEnabled = true;
}

function blurFaces(ctx, canvas, video, detections) {
  for (const detection of detections) {
    const box = detection.boundingBox;
    if (!box) continue;
    const { x, y, w, h } = pad(box, canvas.width, canvas.height);
    if (w <= 0 || h <= 0) continue;
    pixelateFace(ctx, video, x, y, w, h);
  }
}

/**
 * Processes the given video file, blurring all detected faces frame by frame.
 * Returns a Promise that resolves to a Blob URL of the processed WebM video.
 *
 * @param {File} file
 * @param {object} detector  — MediaPipe FaceDetector instance
 * @param {(progress: number) => void} onProgress  — called with 0–1
 * @param {{ cancelled: boolean }} cancelToken
 */
export function processVideo(file, detector, onProgress, cancelToken) {
  // AudioContext created synchronously within the user-gesture call stack so it
  // starts in 'running' state. video.muted stays false so Chrome decodes audio;
  // we silence the speakers via a gain node instead of muting the element.
  let audioCtxOuter;
  try {
    audioCtxOuter = new AudioContext();
  } catch {
    // Audio not available — will proceed without it
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = objectUrl;
    video.muted = false; // must be false so Chrome decodes the audio track
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    video.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      const isHevc = file.name.toLowerCase().endsWith('.mov') || file.type === 'video/quicktime';
      reject(new Error(
        isHevc
          ? 'Could not play this MOV file. If it was recorded in HEVC (iPhone default), try opening it on your Mac, exporting via QuickTime → File → Export As → 1080p, then upload the exported file.'
          : 'Could not load video. The format may not be supported in this browser.'
      ));
    });

    video.addEventListener('loadedmetadata', () => {
      const { videoWidth: vw, videoHeight: vh, duration } = video;

      const canvas = document.createElement('canvas');
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d');

      const audioCtx = audioCtxOuter;
      let audioTracks = [];
      if (audioCtx) {
        try {
          const audioSrc = audioCtx.createMediaElementSource(video);
          const audioDest = audioCtx.createMediaStreamDestination();
          // Silence speakers during processing — audio still flows to MediaRecorder
          const silencer = audioCtx.createGain();
          silencer.gain.value = 0;
          audioSrc.connect(audioDest);
          audioSrc.connect(silencer);
          silencer.connect(audioCtx.destination);
          audioTracks = audioDest.stream.getAudioTracks();
        } catch (err) {
          console.warn('[blur] Audio routing failed:', err);
        }
      }

      let canvasStream;
      try {
        canvasStream = canvas.captureStream(30);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        audioCtx?.close();
        reject(new Error('Your browser does not support canvas video capture. Please try on a desktop browser.'));
        return;
      }

      const combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
      const mimeType = bestMimeType();

      let recorder;
      try {
        recorder = new MediaRecorder(combined, mimeType ? { mimeType } : {});
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        audioCtx?.close();
        reject(new Error(`Could not start video recorder: ${err.message}`));
        return;
      }

      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onerror = (e) => {
        URL.revokeObjectURL(objectUrl);
        audioCtx?.close();
        reject(new Error(`Recording failed: ${e.error?.message || 'unknown error'}`));
      };

      function finish() {
        URL.revokeObjectURL(objectUrl);
        audioCtx?.close();
        if (chunks.length === 0) {
          reject(new Error('No video data was captured. iOS Safari has limited support for this feature — please try on a Mac or desktop browser (Chrome or Safari).'));
          return;
        }
        const finalMime = mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: finalMime });
        resolve({ url: URL.createObjectURL(blob), mimeType: finalMime });
      }

      recorder.onstop = finish;

      recorder.onerror = (e) => {
        URL.revokeObjectURL(objectUrl);
        audioCtx?.close();
        reject(new Error(`Recording failed: ${e.error?.message || 'unknown error'}`));
      };

      recorder.start();

      // Hold last-known detections for up to HOLD_FRAMES frames so a momentary
      // miss doesn't cause a visible flicker of unblurred faces.
      const HOLD_FRAMES = 6;
      let heldDetections = [];
      let holdCountdown = 0;

      function processFrame(currentTime) {
        if (cancelToken.cancelled) {
          recorder.stop();
          URL.revokeObjectURL(objectUrl);
          audioCtx?.close();
          reject(new Error('cancelled'));
          return;
        }

        onProgress(duration > 0 ? Math.min(currentTime / duration, 1) : 0);
        ctx.drawImage(video, 0, 0, vw, vh);

        try {
          const detections = detectFaces(detector, video, performance.now());
          if (detections.length > 0) {
            heldDetections = detections;
            holdCountdown = HOLD_FRAMES;
          } else if (holdCountdown > 0) {
            holdCountdown--;
          } else {
            heldDetections = [];
          }
          blurFaces(ctx, canvas, video, heldDetections);
        } catch (err) {
          console.warn('Face detection error on frame:', err);
        }
      }

      // requestVideoFrameCallback is the best way to capture every frame;
      // fall back to timeupdate for older browsers
      if (typeof video.requestVideoFrameCallback === 'function') {
        function onFrame(_now, metadata) {
          processFrame(metadata?.mediaTime ?? video.currentTime);
          if (!video.ended && !video.paused) {
            video.requestVideoFrameCallback(onFrame);
          }
        }
        video.requestVideoFrameCallback(onFrame);
      } else {
        video.addEventListener('timeupdate', () => {
          processFrame(video.currentTime);
        });
      }

      video.addEventListener('ended', () => {
        ctx.drawImage(video, 0, 0, vw, vh);
        onProgress(1);

        // Give recorder 200 ms to flush, then stop it
        setTimeout(() => {
          if (recorder.state !== 'inactive') recorder.stop();
        }, 200);

        // iOS Safari sometimes never fires onstop — force finish after 4 s
        setTimeout(() => finish(), 4200);
      });

      video.play().catch(reject);
    });
  });
}
