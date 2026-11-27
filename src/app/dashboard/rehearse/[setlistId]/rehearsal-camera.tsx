"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ChevronDown, Play, Pause, Printer, RefreshCw, SkipBack, SkipForward } from "lucide-react";
import type { HandLandmarker as HandLandmarkerType } from "@mediapipe/tasks-vision";
import { arucoToSVGString } from "aruco-marker";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { SongRehearsalDetails } from "@/components/song-rehearsal-details";
import type { SongRehearsal } from "@/lib/song-rehearsal";

export type RehearsalSong = SongRehearsal & {
  id: string;
  artist: string | null;
  arSpatialData?: string | null;
};

type Point = { x: number; y: number };
type Detector = { detect(image: ImageData): { id: number; corners: Point[] }[] };
type DetectorModule = { AR?: { Detector?: new (options?: { dictionaryName: string }) => Detector } };
type CameraStatus = "off" | "starting" | "ready" | "error";
type Facing = "user" | "environment";

// Chord definitions for guitar:
// strings: [lowE (0), A (1), D (2), G (3), B (4), highE (5)]
// frets: -1 / "X" for mute, 0 for open, 1..4 for fret number
// fingers: null for open/mute, 1=Index, 2=Middle, 3=Ring, 4=Pinky
interface ChordInfo {
  name: string;
  frets: (number | "X")[];
  fingers: (number | null)[];
  barre?: number;
  description: string;
}

const CHORDS: Record<string, ChordInfo> = {
  Am: {
    name: "A Minor",
    frets: ["X", 0, 2, 2, 1, 0],
    fingers: [null, null, 2, 3, 1, null],
    description: "Middle on D-2, Ring on G-2, Index on B-1"
  },
  C: {
    name: "C Major",
    frets: ["X", 3, 2, 0, 1, 0],
    fingers: [null, 3, 2, null, 1, null],
    description: "Ring on A-3, Middle on D-2, Index on B-1"
  },
  G: {
    name: "G Major",
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, null, null, null, 3],
    description: "Middle on low E-3, Index on A-2, Ring on high E-3"
  },
  Em: {
    name: "E Minor",
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [null, 2, 3, null, null, null],
    description: "Middle on A-2, Ring on D-2"
  },
  D: {
    name: "D Major",
    frets: ["X", "X", 0, 2, 3, 2],
    fingers: [null, null, null, 1, 3, 2],
    description: "Index on G-2, Ring on B-3, Middle on high E-2"
  },
  F: {
    name: "F Major",
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    barre: 1,
    description: "Index barres fret 1, Ring on A-3, Pinky on D-3, Middle on G-2"
  }
};

const DEFAULT_PROGRESSION = ["Am", "F", "C", "G"];

// Fingertip landmark indices: 4=Thumb, 8=Index(1), 12=Middle(2), 16=Ring(3), 20=Pinky(4)
const FINGERTIPS = [4, 8, 12, 16, 20];
const FINGER_COLORS = [
  "#f59e0b", // Thumb - Amber
  "#06b6d4", // Index - Cyan (F1)
  "#6366f1", // Middle - Indigo (F2)
  "#a855f7", // Ring - Purple (F3)
  "#10b981"  // Pinky - Emerald (F4)
];

const TARGET_MARKER_ID = 0;

const markerSVG: string = arucoToSVGString(TARGET_MARKER_ID);
const MIN_BPM = 20;
const MAX_BPM = 400;

function songProgression(song?: RehearsalSong): string[] | undefined {
  if (!song?.arSpatialData) return;
  try {
    const data: { progression?: unknown } | null = JSON.parse(song.arSpatialData);
    const progression = data?.progression;
    if (Array.isArray(progression) && progression.length && progression.every((chord) => typeof chord === "string" && Object.hasOwn(CHORDS, chord))) {
      return progression;
    }
  } catch {
    // Older or incomplete AR data can still use the demo progression.
  }
}

function songTempo(song?: RehearsalSong) {
  const tempo = song?.tempo;
  return typeof tempo === "number" && tempo >= MIN_BPM && tempo <= MAX_BPM ? tempo : 100;
}

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Allow camera access in your browser’s site settings, then try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found for this selection. Try the other camera.";
  if (name === "NotReadableError") return "Your camera may be in use by another app. Close it and try again.";
  return "The camera could not start. Check the connection and try again.";
}

export function RehearsalCamera({ songs, setlist }: {
  songs: RehearsalSong[];
  setlist?: { name: string; gigTitle: string };
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<HandLandmarkerType | null>(null);
  const arucoDetectorRef = useRef<Detector | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const frettingLandmarksRef = useRef<{ x: number; y: number; z?: number }[] | null>(null);
  const smoothedCornersRef = useRef<Point[] | null>(null);
  const lastMarkerSeenTimeRef = useRef(0);

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("off");
  const [cameraError, setCameraError] = useState("");
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [cameraFacing, setCameraFacing] = useState<Facing>("user");
  const [actualFacing, setActualFacing] = useState<string>();
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">("loading");
  const [modelAttempt, setModelAttempt] = useState(0);
  const [detectorReady, setDetectorReady] = useState(false);
  const [isRightHandedPlayer, setIsRightHandedPlayer] = useState(true);
  const [isMarkerDetected, setIsMarkerDetected] = useState(false);
  const [detectedMarkerId, setDetectedMarkerId] = useState<number | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [nutOffsetRatio, setNutOffsetRatio] = useState(0.35);
  const [fretSpacingRatio, setFretSpacingRatio] = useState(1.20);
  const [neckWidthRatio, setNeckWidthRatio] = useState(1.65);
  const [invertNeckDirection, setInvertNeckDirection] = useState(false);

  const [songIndex, setSongIndex] = useState(0);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpmText, setBpmText] = useState(() => String(songTempo(songs[0])));
  const [lockedFingersCount, setLockedFingersCount] = useState(0);

  const song = songs[songIndex];
  const parsedBpm = Number(bpmText);
  const bpm = Number.isFinite(parsedBpm) && parsedBpm >= MIN_BPM && parsedBpm <= MAX_BPM ? parsedBpm : songTempo(song);
  const customProgression = songProgression(song);
  const progression = customProgression ?? DEFAULT_PROGRESSION;
  const currentChordKey = progression[currentChordIndex] ?? progression[0];
  const currentChord = CHORDS[currentChordKey];

  useEffect(() => {
    if (!cameraEnabled) return;
    let cancelled = false;

    async function initVision() {
      try {
        const imported = await import("js-aruco2") as DetectorModule & { default?: DetectorModule };
        if (cancelled) return;
        const ArucoDetector = (imported.default?.AR ?? imported.AR)?.Detector;
        if (!ArucoDetector) throw new Error("ArUco detector unavailable");
        // The generated printable marker uses the original ArUco dictionary.
        const printedMarkers = new ArucoDetector({ dictionaryName: "ARUCO" });
        const legacyMarkers = new ArucoDetector();
        let scanLegacyAfter = 0;
        let legacyTracking = false;
        arucoDetectorRef.current = {
          detect(image) {
            const markers = printedMarkers.detect(image);
            if (markers.length > 0) {
              legacyTracking = false;
              return markers;
            }
            const now = performance.now();
            if (!legacyTracking && now < scanLegacyAfter) return [];
            scanLegacyAfter = now + 200;
            const legacy = legacyMarkers.detect(image);
            legacyTracking = legacy.length > 0;
            return legacy;
          },
        };
        setDetectorReady(true);

        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        if (cancelled) return;

        const createLandmarker = (delegate: "GPU" | "CPU") => HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate,
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.35,
          minHandPresenceConfidence: 0.35,
          minTrackingConfidence: 0.35,
        });

        let landmarker: HandLandmarkerType;
        try {
          landmarker = await createLandmarker("GPU");
        } catch {
          if (cancelled) return;
          landmarker = await createLandmarker("CPU");
        }
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setModelStatus("ready");
      } catch (error) {
        if (!cancelled) {
          console.error("Could not start AR tracking", error);
          setModelStatus("error");
        }
      }
    }

    void initVision();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      arucoDetectorRef.current = null;
      frettingLandmarksRef.current = null;
    };
  }, [cameraEnabled, modelAttempt]);

  useEffect(() => {
    const video = videoRef.current;
    if (!cameraEnabled || !video) return;
    let cancelled = false;
    let stream: MediaStream | undefined;

    function stopStream() {
      for (const track of stream?.getTracks() ?? []) {
        track.removeEventListener("ended", handleEnded);
        track.stop();
      }
      if (stream && video?.srcObject === stream) video.srcObject = null;
    }

    function handleEnded() {
      stopStream();
      setCameraError("The camera disconnected. Reconnect it or try the other camera.");
      setCameraStatus("error");
    }

    async function startStream(element: HTMLVideoElement) {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError("Camera access requires a supported browser on HTTPS or localhost.");
          setCameraStatus("error");
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stopStream();
          return;
        }
        const track = stream.getVideoTracks()[0];
        if (!track) throw new Error("No video track");
        track.addEventListener("ended", handleEnded);
        element.srcObject = stream;
        await element.play();
        if (!cancelled && track.readyState !== "ended") {
          setActualFacing(track.getSettings().facingMode);
          setCameraStatus("ready");
        }
      } catch (error) {
        stopStream();
        if (!cancelled) {
          setCameraError(cameraErrorMessage(error));
          setCameraStatus("error");
        }
      }
    }

    void startStream(video);
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [cameraEnabled, cameraAttempt, cameraFacing]);

  // Main Detection Loop (ArUco Marker Tracking + MediaPipe Finger Hit Detection)
  useEffect(() => {
    if (cameraStatus !== "ready") return;
    let lastVideoTime = -1;

    function renderLoop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      const arucoDetector = arucoDetectorRef.current;

      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const W = canvas.width;
          const H = canvas.height;

          // -------------------------------------------------------------
          // 1. RUN ARUCO DETECTION IN FRAME
          // -------------------------------------------------------------
          if (arucoDetector) {
            // Draw current video frame to offscreen canvas for ArUco analysis
            if (!offscreenCanvasRef.current) {
              offscreenCanvasRef.current = document.createElement("canvas");
            }
            const off = offscreenCanvasRef.current;
            if (off.width !== W || off.height !== H) {
              off.width = W;
              off.height = H;
            }
            const offCtx = off.getContext("2d", { willReadFrequently: true });
            if (offCtx) {
              offCtx.drawImage(video, 0, 0, W, H);
              const imgData = offCtx.getImageData(0, 0, W, H);
              const markers = arucoDetector.detect(imgData);

              if (markers && markers.length > 0) {
                // Find target marker #0 or take the first marker found
                const targetMarker = markers.find((m) => m.id === TARGET_MARKER_ID) || markers[0];
                setDetectedMarkerId(targetMarker.id);
                setIsMarkerDetected(true);
                lastMarkerSeenTimeRef.current = performance.now();

                // Smooth corners with EMA to eliminate camera noise jitter
                if (!smoothedCornersRef.current) {
                  smoothedCornersRef.current = targetMarker.corners.map((c) => ({ x: c.x, y: c.y }));
                } else {
                  const sc = smoothedCornersRef.current;
                  for (let i = 0; i < 4; i++) {
                    sc[i].x += (targetMarker.corners[i].x - sc[i].x) * 0.45;
                    sc[i].y += (targetMarker.corners[i].y - sc[i].y) * 0.45;
                  }
                }
              } else {
                // Decay after 500ms of lost marker
                if (performance.now() - lastMarkerSeenTimeRef.current > 500) {
                  setIsMarkerDetected(false);
                  smoothedCornersRef.current = null;
                }
              }
            }
          }

          // -------------------------------------------------------------
          // 2. RUN MEDIAPIPE TO TRACK FRETTING FINGERTIPS
          // -------------------------------------------------------------
          if (landmarker && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const startTimeMs = performance.now();
            const results = landmarker.detectForVideo(video, startTimeMs);

            let detectedFretting: { x: number; y: number; z?: number }[] | null = null;
            if (results.landmarks && results.landmarks.length > 0) {
              const targetCategory = isRightHandedPlayer ? "Left" : "Right";

              results.landmarks.forEach((landmarks, idx) => {
                const category = results.handednesses?.[idx]?.[0]?.categoryName;
                if (results.landmarks.length === 1 || category === targetCategory) {
                  detectedFretting = landmarks;
                }
              });
            }
            frettingLandmarksRef.current = detectedFretting;
          }

          const currentFretting = frettingLandmarksRef.current;

          // -------------------------------------------------------------
          // 3. IF ARUCO DETECTED: PROJECT ONLY THE CHORD TARGET DOTS!
          // -------------------------------------------------------------
          const corners = smoothedCornersRef.current;
          if (corners && corners.length === 4) {
            ctx.save();

            // 4 Corners of the ArUco marker:
            // c0 = Top-Left, c1 = Top-Right, c2 = Bottom-Right, c3 = Bottom-Left
            const c0 = corners[0];
            const c1 = corners[1];
            const c2 = corners[2];
            const c3 = corners[3];

            // Top edge center & Bottom edge center
            const topEdgeCenter = { x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2 };
            const bottomEdgeCenter = { x: (c3.x + c2.x) / 2, y: (c3.y + c2.y) / 2 };

            // Left edge center & Right edge center
            const leftEdgeCenter = { x: (c0.x + c3.x) / 2, y: (c0.y + c3.y) / 2 };
            const rightEdgeCenter = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };

            // Marker dimension in pixels
            const markerSizePx = Math.hypot(c1.x - c0.x, c1.y - c0.y) || 40;

            // Direction vector pointing down the guitar neck (from headstock towards body)
            const rawNeckDx = bottomEdgeCenter.x - topEdgeCenter.x;
            const rawNeckDy = bottomEdgeCenter.y - topEdgeCenter.y;
            const neckLen = Math.hypot(rawNeckDx, rawNeckDy) || 1;
            const dirMult = invertNeckDirection ? -1 : 1;
            const ux = (rawNeckDx / neckLen) * dirMult;
            const uy = (rawNeckDy / neckLen) * dirMult;

            // Direction vector across strings (from Low E to High e)
            const rawStrDx = rightEdgeCenter.x - leftEdgeCenter.x;
            const rawStrDy = rightEdgeCenter.y - leftEdgeCenter.y;
            const strLen = Math.hypot(rawStrDx, rawStrDy) || 1;
            const nx = rawStrDx / strLen;
            const ny = rawStrDy / strLen;

            // Nut Position: sits just below the marker's bottom edge
            const nutCenter = {
              x: bottomEdgeCenter.x + ux * (markerSizePx * nutOffsetRatio),
              y: bottomEdgeCenter.y + uy * (markerSizePx * nutOffsetRatio)
            };

            const singleFretDist = markerSizePx * fretSpacingRatio;
            const totalNeckWidth = markerSizePx * neckWidthRatio;

            // Draw subtle corner indicator on the ArUco marker (verifying tracking lock)
            ctx.beginPath();
            ctx.moveTo(c0.x, c0.y);
            ctx.lineTo(c1.x, c1.y);
            ctx.lineTo(c2.x, c2.y);
            ctx.lineTo(c3.x, c3.y);
            ctx.closePath();
            ctx.strokeStyle = "rgba(16, 185, 129, 0.75)";
            ctx.lineWidth = 2;
            ctx.stroke();

            // RENDER ONLY THE GLOWING CHORD TARGET DOTS ON THE FRETS!
            let hitsCount = 0;

            currentChord.frets.forEach((fretVal, stringIdx) => {
              const fingerNum = currentChord.fingers[stringIdx];
              const stringOffset = ((stringIdx - 2.5) / 5) * totalNeckWidth;

              if (fretVal === "X") {
                // Muted String Red Marker at Nut
                const mX = nutCenter.x + nx * stringOffset - ux * (markerSizePx * 0.25);
                const mY = nutCenter.y + ny * stringOffset - uy * (markerSizePx * 0.25);
                ctx.font = "bold 15px sans-serif";
                ctx.fillStyle = "#ef4444";
                ctx.textAlign = "center";
                ctx.fillText("✕", mX, mY + 5);
                ctx.textAlign = "left";
              } else if (fretVal === 0) {
                // Open String Green Marker at Nut
                const oX = nutCenter.x + nx * stringOffset - ux * (markerSizePx * 0.25);
                const oY = nutCenter.y + ny * stringOffset - uy * (markerSizePx * 0.25);
                ctx.beginPath();
                ctx.arc(oX, oY, 7, 0, 2 * Math.PI);
                ctx.strokeStyle = "#10b981";
                ctx.lineWidth = 2.2;
                ctx.shadowColor = "#10b981";
                ctx.shadowBlur = 10;
                ctx.stroke();
                ctx.shadowBlur = 0;
              } else if (typeof fretVal === "number" && fretVal > 0) {
                // Target Dot placed ON THE PHYSICAL FRET
                // Midpoint of fret: (fretVal - 0.5) * singleFretDist
                const alongFret = (fretVal - 0.5) * singleFretDist;
                const dotX = (nutCenter.x + ux * alongFret) + nx * stringOffset;
                const dotY = (nutCenter.y + uy * alongFret) + ny * stringOffset;

                // Hit Detection: check if matching fingertip touches this dot
                let isHit = false;
                if (currentFretting && fingerNum) {
                  const tipIndex = FINGERTIPS[fingerNum];
                  const tipLm = currentFretting[tipIndex];
                  if (tipLm) {
                    const tipScreenX = tipLm.x * W;
                    const tipScreenY = tipLm.y * H;
                    const dist = Math.hypot(tipScreenX - dotX, tipScreenY - dotY);
                    if (dist < 38) {
                      isHit = true;
                      hitsCount++;
                    }
                  }
                }

                const color = isHit ? "#10b981" : (FINGER_COLORS[fingerNum || 1] || "#06b6d4");
                const pulse = isHit ? 1.4 : 1 + Math.sin(performance.now() / 220) * 0.12;

                // Outer Glowing Halo ON THE FRET
                ctx.beginPath();
                ctx.arc(dotX, dotY, 16 * pulse, 0, 2 * Math.PI);
                ctx.fillStyle = `${color}38`;
                ctx.fill();

                // Solid Glowing Target Orb ON THE STRING
                ctx.beginPath();
                ctx.arc(dotX, dotY, 10.5, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = isHit ? 22 : 14;
                ctx.fill();
                ctx.shadowBlur = 0;

                // Finger Label (F1, F2, F3 or ✓ when pressed!)
                ctx.font = "bold 11px Inter, sans-serif";
                ctx.fillStyle = "#ffffff";
                ctx.textAlign = "center";
                ctx.fillText(isHit ? "✓" : `F${fingerNum}`, dotX, dotY + 4);
                ctx.textAlign = "left";
              }
            });

            setLockedFingersCount(hitsCount);
            ctx.restore();
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    }

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    cameraStatus,
    nutOffsetRatio,
    fretSpacingRatio,
    neckWidthRatio,
    invertNeckDirection,
    isRightHandedPlayer,
    currentChord
  ]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentChordIndex((current) => (current + 1) % progression.length);
    }, (60 / bpm) * 4 * 1000);
    return () => clearInterval(interval);
  }, [isPlaying, bpm, progression.length]);

  function moveChord(offset: number) {
    setCurrentChordIndex((current) => (current + offset + progression.length) % progression.length);
  }

  function chooseSong(index: number) {
    setSongIndex(index);
    setCurrentChordIndex(0);
    setIsPlaying(false);
    setLockedFingersCount(0);
    setBpmText(String(songTempo(songs[index])));
  }

  function resetTrackingFeedback() {
    smoothedCornersRef.current = null;
    lastMarkerSeenTimeRef.current = 0;
    frettingLandmarksRef.current = null;
    setIsMarkerDetected(false);
    setDetectedMarkerId(null);
    setLockedFingersCount(0);
  }

  function startCamera() {
    resetTrackingFeedback();
    setCameraError("");
    setActualFacing(undefined);
    setCameraStatus("starting");
    if (!cameraEnabled) {
      setModelStatus("loading");
      setDetectorReady(false);
    }
    setCameraEnabled(true);
    setCameraAttempt((value) => value + 1);
  }

  function stopCamera() {
    resetTrackingFeedback();
    setCameraEnabled(false);
    setCameraStatus("off");
  }

  function switchCamera() {
    setCameraFacing((facing) => facing === "user" ? "environment" : "user");
    if (cameraEnabled) startCamera();
  }

  function retryTracking() {
    resetTrackingFeedback();
    setDetectorReady(false);
    setModelStatus("loading");
    setModelAttempt((value) => value + 1);
  }

  const preferredCamera = cameraFacing === "user" ? "Front Camera Preferred" : "Rear Camera Preferred";
  const activeCamera = actualFacing === "environment" ? "Rear Camera" : actualFacing === "user" ? "Front Camera" : "Camera Active";
  const markerStatus = isMarkerDetected ? `Marker ${detectedMarkerId} detected`
    : detectorReady ? "Keep the headstock marker in view"
      : modelStatus === "error" ? "Marker tracking unavailable" : "Starting tracking…";

  return (
    <div className="space-y-4">
      <header className="workspace-header">
        <div className="min-w-0">
          <h1 className="break-words">{song?.title ?? "AR Fretboard Demo"}</h1>
          {setlist && <p>{setlist.gigTitle} · {setlist.name} · Song {songIndex + 1} of {songs.length}</p>}
          {song && <p>{[song.artist, song.key && `Key ${song.key}`, song.tempo && `${song.tempo} BPM`].filter(Boolean).join(" · ") || "Song Rehearsal"}</p>}
        </div>
        {setlist && songs.length > 1 && (
          <label className="block w-full space-y-1 text-sm sm:w-64">
            <span>Setlist Song</span>
            <select className="workspace-input" value={songIndex} onChange={(event) => chooseSong(Number(event.target.value))}>
              {songs.map((item, index) => <option key={item.id} value={index}>{index + 1}. {item.title}</option>)}
            </select>
          </label>
        )}
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,19rem)]">
        <section className="workspace-panel min-w-0 space-y-3 p-3 sm:p-4" aria-label="Fretboard Practice">
          <div className="relative isolate aspect-[4/3] max-h-[64dvh] min-h-44 overflow-hidden rounded-xl border border-white/10 bg-[#08080c] sm:aspect-video">
            <video ref={videoRef} autoPlay playsInline muted aria-label="Guitar Camera Preview" className="absolute inset-0 size-full object-contain" />
            <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none absolute inset-0 size-full object-contain ${cameraStatus === "ready" ? "" : "invisible"}`} />
            {cameraStatus !== "ready" && (
              <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-[#101017] p-3 text-center">
                <div className="max-w-sm space-y-2">
                  <CameraOff aria-hidden="true" className="mx-auto size-6 text-violet-200" />
                  <p role="status" className="font-semibold">{cameraStatus === "starting" ? "Starting camera…" : cameraStatus === "error" ? "Camera Unavailable" : "Camera Is Off"}</p>
                  <p className="text-sm text-zinc-300">{cameraStatus === "error" ? cameraError : cameraStatus === "starting" ? "Allow access if your browser asks." : "Start the camera to put chord targets on your guitar."}</p>
                  {cameraStatus !== "starting" && (
                    <button type="button" className="workspace-primary mt-1 w-auto" onClick={startCamera}>
                      <Camera aria-hidden="true" className="size-4" /> {cameraStatus === "error" ? "Retry Camera" : "Start Camera"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p role="status" className={`text-sm ${isMarkerDetected ? "text-emerald-300" : "text-zinc-300"}`}>{cameraStatus === "ready" ? markerStatus : preferredCamera}</p>
              {cameraStatus === "ready" && <p className="text-xs text-zinc-400">{activeCamera}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-label="Switch Front And Rear Camera" className="workspace-secondary px-3" onClick={switchCamera}>
                <RefreshCw aria-hidden="true" className="size-4" /> Switch Camera
              </button>
              {cameraEnabled && <button type="button" className="workspace-secondary px-3" onClick={stopCamera}>Turn Off</button>}
            </div>
          </div>
          {cameraStatus === "ready" && modelStatus === "error" && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 p-3 text-sm text-amber-100">
              <p role="status">Tracking could not fully start. Check your connection and retry.</p>
              <button type="button" className="workspace-secondary" onClick={retryTracking}>Retry Tracking</button>
            </div>
          )}
        </section>

        <aside className="space-y-3" aria-label="Rehearsal Setup">
          {song && (
            <details key={song.id} className="workspace-panel group p-4" open={Boolean(song.chordChart || song.rehearsalNotes)}>
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 rounded font-semibold">
                Rehearsal Notes <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 border-t border-white/10 pt-3"><SongRehearsalDetails song={song} /></div>
            </details>
          )}
          <section className="workspace-panel space-y-3 p-4">
            <h2 className="font-semibold">{customProgression ? "Song Chords" : "Demo Chords"}</h2>
            {song && !customProgression && <p className="text-sm text-zinc-400">This song has no saved chord progression for the overlay. The chords below are for practice.</p>}
            <div className="flex flex-wrap gap-1.5" aria-label="Chord Progression">
              {progression.map((chord, index) => (
                <button key={index} type="button" aria-pressed={index === currentChordIndex} aria-label={`Select chord ${index + 1}: ${chord}`}
                  onClick={() => setCurrentChordIndex(index)}
                  className={`min-h-11 min-w-11 rounded-lg border px-2 text-sm font-semibold ${index === currentChordIndex ? "border-violet-300/40 bg-violet-400/15 text-violet-100" : "border-white/10 text-zinc-300 hover:bg-white/5"}`}>
                  {chord}
                </button>
              ))}
            </div>
            <p className="text-sm text-zinc-300"><strong className="block text-zinc-100">{currentChord.name}</strong>{currentChord.description}</p>
            {cameraStatus === "ready" && isMarkerDetected && modelStatus === "ready" && lockedFingersCount > 0 && (
              <p className="text-sm text-emerald-300">{lockedFingersCount} fret {lockedFingersCount === 1 ? "target" : "targets"} matched</p>
            )}
          </section>
          <details className="workspace-panel group p-4">
            <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 rounded font-semibold">
              Camera Setup And Calibration <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
              <button type="button" className="workspace-secondary w-full" onClick={() => setShowPrintModal(true)}>
                <Printer aria-hidden="true" className="size-4" /> Get The ArUco Marker
              </button>
              <label className="block space-y-1 text-sm">
                <span>Playing Hand</span>
                <select className="workspace-input" value={isRightHandedPlayer ? "right" : "left"} onChange={(event) => {
                  frettingLandmarksRef.current = null;
                  setLockedFingersCount(0);
                  setIsRightHandedPlayer(event.target.value === "right");
                }}>
                  <option value="right">Right-handed</option>
                  <option value="left">Left-handed</option>
                </select>
              </label>
              {[
                { label: "Marker-To-Nut Distance", value: nutOffsetRatio, min: 0, max: 80, set: setNutOffsetRatio },
                { label: "Fret Spacing", value: fretSpacingRatio, min: 80, max: 180, set: setFretSpacingRatio },
                { label: "Neck Width", value: neckWidthRatio, min: 100, max: 220, set: setNeckWidthRatio },
              ].map(({ label, value, min, max, set }) => (
                <label key={label} className="block text-sm">
                  <span className="flex justify-between gap-2"><span>{label}</span><span className="tabular-nums text-zinc-300">{Math.round(value * 100)}%</span></span>
                  <input type="range" min={min} max={max} value={Math.round(value * 100)} onChange={(event) => set(Number(event.target.value) / 100)} className="h-8 w-full accent-violet-300" />
                </label>
              ))}
              <div className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={invertNeckDirection} className="workspace-secondary" onClick={() => setInvertNeckDirection((value) => !value)}>Flip Neck</button>
                <button type="button" className="workspace-secondary" onClick={() => {
                  setNutOffsetRatio(0.35);
                  setFretSpacingRatio(1.20);
                  setNeckWidthRatio(1.65);
                  setInvertNeckDirection(false);
                }}>Reset</button>
              </div>
              <p className="text-xs text-zinc-400">F1 index · F2 middle · F3 ring · F4 pinky</p>
            </div>
          </details>
        </aside>
      </div>

      <section className="workspace-panel sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4" aria-label="Playback">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous Chord" className="workspace-icon-button border border-white/10" onClick={() => moveChord(-1)}><SkipBack aria-hidden="true" className="size-5" /></button>
          <button type="button" className="workspace-primary w-auto" onClick={() => setIsPlaying((value) => !value)}>
            {isPlaying ? <Pause aria-hidden="true" className="size-5" /> : <Play aria-hidden="true" className="size-5" />}
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button type="button" aria-label="Next Chord" className="workspace-icon-button border border-white/10" onClick={() => moveChord(1)}><SkipForward aria-hidden="true" className="size-5" /></button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="number" inputMode="numeric" aria-label="Playback Tempo In BPM" min={MIN_BPM} max={MAX_BPM}
            value={bpmText} onChange={(event) => setBpmText(event.target.value)} onBlur={() => setBpmText(String(bpm))}
            className="workspace-input w-20" />
          BPM
        </label>
      </section>

      {showPrintModal && (
        <WorkspaceDialog title="ArUco Marker #0" busy={false} onDismiss={() => setShowPrintModal(false)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">Print at actual size (100%). Place the marker flat on the front of the headstock, just above the nut.</p>
            <div className="mx-auto w-fit rounded-xl bg-white p-5">
              <div role="img" aria-label="Printable ArUco Marker Number Zero" className="rehearsal-print-marker size-37 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: markerSVG }} />
            </div>
            <p className="text-sm text-zinc-300">Print size: 25 × 25 mm.</p>
            <button type="button" onClick={() => window.print()} className="workspace-primary">
              <Printer aria-hidden="true" className="size-4" /> Print Marker
            </button>
          </div>
        </WorkspaceDialog>
      )}
    </div>
  );
}
