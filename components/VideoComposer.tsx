"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Story } from "./NewsList";

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const FPS = 30;
const DURATION_MS = 10000;
const TOTAL_FRAMES = Math.floor((DURATION_MS / 1000) * FPS);

type VideoComposerProps = {
  story: Story | null;
};

type RecordingState = "idle" | "capturing" | "encoding" | "ready" | "error";

export function VideoComposer({ story }: VideoComposerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("Select a headline to create the briefing video.");

  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, frame: number) => {
      if (!story) return;
      const t = frame / TOTAL_FRAMES;
      const scene = Math.floor(t * 3); // 3 scenes
      const transition = (t * 3) % 1;

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      gradient.addColorStop(0, "#060713");
      gradient.addColorStop(1, "#1a1d3a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Ambient grid
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = "#6f7cff";
      const spacing = 80;
      for (let x = (frame * 4) % spacing; x < CANVAS_WIDTH; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = CANVAS_HEIGHT - ((frame * 2) % spacing); y > 0; y -= spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(148, 169, 255, 0.25)";
      ctx.filter = "blur(120px)";
      ctx.beginPath();
      ctx.ellipse(CANVAS_WIDTH * 0.65, CANVAS_HEIGHT * 0.35, 220, 160, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.filter = "none";

      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.font = "56px 'Inter', sans-serif";
      ctx.fillText("AI Briefing Studio", 72, 120);

      ctx.fillStyle = "rgba(124, 160, 255, 0.8)";
      ctx.font = "28px 'Inter', sans-serif";
      ctx.fillText(new Date(story.postedAt).toLocaleString(), 72, 170);

      if (scene === 0) {
        const alpha = Math.min(1, transition + 0.2);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#f2f4ff";
        ctx.font = "bold 72px 'Inter', sans-serif";
        wrapText(ctx, story.title, 72, 290, CANVAS_WIDTH - 144, 72);
        ctx.globalAlpha = 1;
      } else if (scene === 1) {
        ctx.globalAlpha = Math.min(1, transition + 0.3);
        ctx.fillStyle = "#f3f6ff";
        ctx.font = "bold 48px 'Inter', sans-serif";
        ctx.fillText("Key Insights", 72, 260);
        ctx.font = "28px 'Inter', sans-serif";
        story.talkingPoints.slice(0, 3).forEach((point, index) => {
          drawBullet(ctx, point, 72, 320 + index * 90, index);
        });
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = Math.min(1, transition + 0.3);
        ctx.fillStyle = "#f5f6ff";
        ctx.font = "bold 52px 'Inter', sans-serif";
        ctx.fillText("Next Steps", 72, 280);
        ctx.font = "28px 'Inter', sans-serif";
        ctx.fillStyle = "rgba(220,225,255,0.85)";
        const callouts = [
          "Add to your AI stack evaluation board.",
          "Share with your team for experimentation.",
          story.url ? `Full story: ${story.url}` : "Track community traction over the next 48h."
        ];
        callouts.forEach((line, index) => {
          drawBullet(ctx, line, 72, 340 + index * 90, index + 3);
        });
        ctx.globalAlpha = 1;
      }
    },
    [story]
  );

  const startRecording = useCallback(async () => {
    if (!story) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!("MediaRecorder" in window)) {
      setRecordingState("error");
      setStatus("MediaRecorder is not supported in this browser.");
      return;
    }

    try {
      setRecordingState("capturing");
      setVideoUrl(null);
      setStatus("Rendering video intelligence package…");
      setProgress(0);

      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      const canvasStream = canvas.captureStream(FPS);

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, audioContext.currentTime + 1);
      gain.gain.linearRampToValueAtTime(0.025, audioContext.currentTime + DURATION_MS / 1000);

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(180, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(90, audioContext.currentTime + DURATION_MS / 1000);
      const destination = audioContext.createMediaStreamDestination();
      oscillator.connect(gain).connect(destination);
      oscillator.start();
      oscillatorRef.current = oscillator;

      const composedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);

      const mimeType =
        MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") && !navigator.userAgent.includes("Safari")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm;codecs=vp8,opus";

      const recorder = new MediaRecorder(composedStream, { mimeType, videoBitsPerSecond: 5_500_000 });
      recorderRef.current = recorder;
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        oscillator.stop();
        oscillator.disconnect();
        setRecordingState("encoding");
        setStatus("Encoding video payload…");

        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setRecordingState("ready");
        setStatus("Video ready — download or preview below.");
        setProgress(100);
      };

      recorder.start();

      let frame = 0;
      const render = () => {
        drawFrame(ctx, frame);
        const pct = Math.min(99, Math.round((frame / TOTAL_FRAMES) * 100));
        setProgress(pct);
        frame += 1;
        if (frame <= TOTAL_FRAMES) {
          requestAnimationFrame(render);
        } else {
          recorder.stop();
        }
      };

      render();
    } catch (error) {
      console.error("video generation failed", error);
      setRecordingState("error");
      setStatus("Could not generate the video. Please try again.");
    }
  }, [drawFrame, story]);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  return (
    <div className="panel">
      <h2>Autonomous Video Producer</h2>
      <p>{status}</p>
      <canvas id="video-canvas" ref={canvasRef} />
      <div className="controls">
        <button
          className="primary-btn"
          disabled={!story || recordingState === "capturing"}
          onClick={() => startRecording()}
        >
          {recordingState === "capturing" ? "Rendering…" : "Generate briefing video"}
        </button>
        {progress > 0 && (
          <div className="chip">
            <span>Progress</span>
            <strong>{progress}%</strong>
          </div>
        )}
        {story?.url && (
          <a className="chip" href={story.url} target="_blank" rel="noreferrer">
            Source Link ↗
          </a>
        )}
      </div>
      {videoUrl ? (
        <div className="timelines">
          <video
            src={videoUrl}
            controls
            width={640}
            height={360}
            style={{ borderRadius: 16, border: "1px solid rgba(132,148,255,0.4)" }}
          />
          <a className="primary-btn" href={videoUrl} download={`${story?.id ?? "ai-briefing"}.webm`}>
            Download video
          </a>
        </div>
      ) : (
        <div className="video-preview">The finished video will appear here once rendered.</div>
      )}
    </div>
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  words.forEach((word, index) => {
    const testLine = line + word + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && index > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = word + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });
  ctx.fillText(line.trim(), x, currentY);
}

function drawBullet(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, idx: number) {
  ctx.fillStyle = `rgba(142, 169, 255, ${0.75 - idx * 0.05})`;
  ctx.beginPath();
  ctx.arc(x + 8, y - 8, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(240, 243, 255, 0.92)";
  ctx.fillText(text, x + 36, y);
}
