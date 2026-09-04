import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const duration = (file) => Number(execFileSync(
  "ffprobe",
  ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
  {encoding: "utf8"},
).trim());

test("showcase keeps natural narration pacing and a closing hold", () => {
  const narrationSeconds = duration(path.join(
    projectRoot,
    "public/audio/buildorskip-voiceover-bm-george.wav",
  ));
  const videoSeconds = duration(path.resolve(
    projectRoot,
    "../docs/demo/buildorskip-showcase.mp4",
  ));

  assert.ok(
    narrationSeconds >= 44 && narrationSeconds <= 45.5,
    `expected natural-speed narration between 44 and 45.5 seconds, received ${narrationSeconds}`,
  );
  assert.ok(
    videoSeconds - narrationSeconds >= 1.5 && videoSeconds - narrationSeconds <= 3,
    `expected a 1.5–3 second closing hold, received ${videoSeconds - narrationSeconds}`,
  );
});
