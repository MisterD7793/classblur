import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_full_range/float16/1/blaze_face_full_range.tflite';

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';

let detectorPromise = null;

export function initFaceDetector() {
  if (detectorPromise) return detectorPromise;

  detectorPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    return FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      minDetectionConfidence: 0.3,
    });
  })();

  return detectorPromise;
}

let _frameCount = 0;
export function detectFaces(detector, videoEl, timestampMs) {
  const result = detector.detectForVideo(videoEl, timestampMs);
  const detections = result.detections ?? [];
  if (_frameCount++ < 30) {
    console.log(`[blur] frame ${_frameCount}: ${detections.length} face(s) detected`);
  }
  return detections;
}
