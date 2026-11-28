import type { InferenceSession } from "onnxruntime-web";

const SR = 22050;
const HOP_LENGTH = 2048;
const N_BINS = 144;
const BINS_PER_OCTAVE = 24;
const CHUNK_FRAMES = 108;

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const QUALITIES = [
    'min', 'maj', 'dim', 'aug', 'min6', 'maj6', 'min7',
    'minmaj7', 'maj7', '7', 'dim7', 'hdim7', 'sus2', 'sus4',
];
const IDX_TO_CHORD = [
    ...ROOTS.flatMap((r) => QUALITIES.map((q) => `${r}:${q}`)),
    'X',
    'N',
];

export interface ChordSegment {
    start: number;
    end: number;
    chord: string;
}

async function decodeToMono22k(file: File): Promise<Float32Array> {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new AudioContext();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer).finally(() => audioCtx.close());

    const targetLength = Math.ceil(decoded.duration * SR);
    const offlineCtx = new OfflineAudioContext(1, targetLength, SR);
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0);

    const rendered = await offlineCtx.startRendering();
    return rendered.getChannelData(0);
}

function computeNormalizedLogCQT(samples: Float32Array): {
    logCqt: Float32Array;
    numFrames: number;
} {
    const fMin = 32.70319566257483; // C1
    const Q = 1 / (Math.pow(2, 1 / BINS_PER_OCTAVE) - 1);

    const kernels = Array.from({ length: N_BINS }, (_, k) => {
        const freq = fMin * Math.pow(2, k / BINS_PER_OCTAVE);
        const winLen = Math.min(Math.ceil((Q * SR) / freq), 8192);
        const real = new Float32Array(winLen);
        const imag = new Float32Array(winLen);
        const omega = (2 * Math.PI * freq) / SR;

        for (let n = 0; n < winLen; n++) {
            const hann = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (winLen - 1)));
            const norm = hann / winLen;
            real[n] = norm * Math.cos(omega * n);
            imag[n] = -norm * Math.sin(omega * n);
        }
        return { winLen, real, imag };
    });

    const numFrames = Math.floor(samples.length / HOP_LENGTH);
    const magnitudes = new Float32Array(numFrames * N_BINS);
    let maxMag = 1e-10;

    for (let f = 0; f < numFrames; f++) {
        const center = f * HOP_LENGTH;
        for (let k = 0; k < N_BINS; k++) {
            const { winLen, real, imag } = kernels[k];
            const start = center - Math.floor(winLen / 2);
            let sumRe = 0;
            let sumIm = 0;

            for (let n = 0; n < winLen; n++) {
                const idx = start + n;
                if (idx >= 0 && idx < samples.length) {
                    const s = samples[idx];
                    sumRe += s * real[n];
                    sumIm += s * imag[n];
                }
            }
            const mag = Math.hypot(sumRe, sumIm);
            magnitudes[f * N_BINS + k] = mag;
            if (mag > maxMag) maxMag = mag;
        }
    }

    const logCqt = new Float32Array(numFrames * N_BINS);
    let sum = 0;
    for (let i = 0; i < magnitudes.length; i++) {
        const db = Math.max(20 * Math.log10(Math.max(magnitudes[i], 1e-10) / maxMag), -80);
        logCqt[i] = db;
        sum += db;
    }

    const mean = sum / logCqt.length;
    let sqDiff = 0;
    for (let i = 0; i < logCqt.length; i++) {
        sqDiff += (logCqt[i] - mean) ** 2;
    }
    const std = Math.sqrt(sqDiff / logCqt.length) + 1e-6;

    for (let i = 0; i < logCqt.length; i++) {
        logCqt[i] = (logCqt[i] - mean) / std;
    }

    return { logCqt, numFrames };
}

let sessionPromise: Promise<InferenceSession> | undefined;

export async function detectChordsFromFile(file: File): Promise<ChordSegment[]> {
    const ort = await import("onnxruntime-web/wasm");
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";
    sessionPromise ??= (async () => {
        const response = await fetch("/api/songs/chord-model");
        if (!response.ok) throw new Error("Local chord detection needs the verified Jam Jam v4 model in .local-models.");
        return ort.InferenceSession.create(new Uint8Array(await response.arrayBuffer()), { executionProviders: ["wasm"] });
    })().catch((error) => {
        sessionPromise = undefined;
        throw error;
    });
    const session = await sessionPromise;

    const samples = await decodeToMono22k(file);
    const { logCqt, numFrames } = computeNormalizedLogCQT(samples);

    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];
    const numChunks = Math.ceil(numFrames / CHUNK_FRAMES);
    const predictedIds: number[] = [];

    for (let c = 0; c < numChunks; c++) {
        const chunkData = new Float32Array(CHUNK_FRAMES * N_BINS);
        const startFrame = c * CHUNK_FRAMES;
        const copyFrames = Math.min(CHUNK_FRAMES, numFrames - startFrame);

        chunkData.set(
            logCqt.subarray(startFrame * N_BINS, (startFrame + copyFrames) * N_BINS)
        );

        const tensor = new ort.Tensor('float32', chunkData, [1, CHUNK_FRAMES, N_BINS]);
        const results = await session.run({ [inputName]: tensor });
        const logits = results[outputName].data as Float32Array;

        for (let f = 0; f < copyFrames; f++) {
            let bestId = 0;
            let bestScore = -Infinity;
            const offset = f * 170;
            for (let cls = 0; cls < 170; cls++) {
                if (logits[offset + cls] > bestScore) {
                    bestScore = logits[offset + cls];
                    bestId = cls;
                }
            }
            predictedIds.push(bestId);
        }
    }

    const frameDuration = HOP_LENGTH / SR;
    const segments: ChordSegment[] = [];

    predictedIds.forEach((cid, i) => {
        const chord = IDX_TO_CHORD[cid];
        const start = Number((i * frameDuration).toFixed(2));
        const end = Number(((i + 1) * frameDuration).toFixed(2));

        if (segments.length > 0 && segments[segments.length - 1].chord === chord) {
            segments[segments.length - 1].end = end;
        } else {
            segments.push({ start, end, chord });
        }
    });

    return segments;
}
