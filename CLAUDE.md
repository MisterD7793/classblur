# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install deps
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview production build locally
```

## Architecture

This is a **100% client-side** static web app — no server, no backend, no data ever leaves the user's browser. The privacy guarantee ("nothing uploaded, nothing saved") is enforced architecturally, not just by policy.

### State machine (`src/App.jsx`)
Three states: `idle → processing → preview → idle`. The app transitions between these as the user selects a file, processing runs, and the result is downloaded.

### Processing pipeline (`src/utils/videoProcessor.js`)
1. Selected file → `URL.createObjectURL()` → hidden `<video>` element
2. Audio routed through Web Audio API: `createMediaElementSource → createMediaStreamDestination`
3. Canvas sized to match video dimensions; `canvas.captureStream(30)` provides the video track
4. `MediaStream` combining canvas video + audio tracks → `MediaRecorder` → collects chunks
5. `video.requestVideoFrameCallback` fires each frame: draw full frame to canvas, run face detection, blur detected regions in-place
6. On `video ended`: `recorder.stop()` → assemble `Blob` → `URL.createObjectURL(blob)` → preview state
7. On download: `URL.revokeObjectURL` called after 60 s; all object URLs are revoked, no data persists

### Face detection (`src/utils/faceDetector.js`)
- Uses `@mediapipe/tasks-vision` (WASM, GPU-delegated where available)
- Singleton initialized once on app mount via `initFaceDetector()`; WASM takes ~1 s to warm up
- Model loaded from Google's CDN at runtime (`blaze_face_short_range.tflite`)
- Runs in `VIDEO` mode (`detectForVideo`) for sequential-frame optimization
- `minDetectionConfidence: 0.4` — deliberately lower to catch partially-visible children's faces

### Canvas blur technique
For each detected bounding box, the face region is drawn on top of itself three times with `ctx.filter = 'blur(24px)'`. The bounding box is padded 15% on each side to ensure full coverage of hair/forehead.

### Output format
`MediaRecorder` outputs WebM (VP9 preferred, VP8 fallback). The output is a `.webm` file. No server-side transcoding is available — educators on systems that need MP4 should use VLC or Handbrake to convert the downloaded WebM.

### Deployment
Static files only. `public/_headers` sets a Content Security Policy for Netlify. For other hosts (GitHub Pages, Vercel), configure an equivalent CSP: allow `connect-src` to `storage.googleapis.com` and `cdn.jsdelivr.net` for the MediaPipe model/WASM, and allow `wasm-unsafe-eval` in `script-src`.

## Privacy rules (non-negotiable)

- No `fetch()` calls after initial MediaPipe CDN load
- No `localStorage`, `sessionStorage`, or `indexedDB` writes anywhere
- All `Object URL`s and `Blob URL`s are revoked after use
- No analytics or third-party scripts
