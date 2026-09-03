# BuildOrSkip showcase video

Editable Remotion source for the 43-second, narrated product showcase. The browser frames are
privacy-safe captures of the no-key Solari demo path. The closing card explicitly distinguishes
that replay from the separately documented live Solari Browser and Sandbox validation.

## Voice-over

- Script: [`../docs/demo/buildorskip-voiceover.txt`](../docs/demo/buildorskip-voiceover.txt)
- Engine: local Kokoro-MLX
- Voice: British male `bm_george`, calm and credible at 1.10× speed
- Source: `public/audio/buildorskip-voiceover-bm-george.wav`
- Audio: 42.3 seconds, mono 48 kHz WAV, normalized to approximately −18 LUFS

## Commands

Install dependencies:

```bash
npm ci
```

Open the editable Remotion preview:

```bash
npm run dev
```

Render the 1080p source:

```bash
npx remotion render src/index.ts BuildOrSkipShowcase ../docs/demo/buildorskip-showcase.mp4 --codec=h264
```

Create the smaller web asset with fast-start metadata:

```bash
ffmpeg -i ../docs/demo/buildorskip-showcase.mp4 -c:v libx264 -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart ../docs/demo/buildorskip-showcase-web.mp4
```

## Recapturing product frames

With the main BuildOrSkip development server running at `http://localhost:5173`:

```bash
python3.14 ../scripts/capture_showcase.py
```

Copy the refreshed PNGs from `/tmp/buildorskip-demo-captures` into `public/captures` before
rendering. The capture script clears its isolated browser context and never records the desktop.
