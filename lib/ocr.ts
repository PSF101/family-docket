import type Tesseract from "tesseract.js";

/** Tesseract's page confidence is 0–100. Below this, the text is shown but flagged. */
const LOW_CONFIDENCE = 60;

type Progress = (fraction: number) => void;

const STAGES: Record<string, [number, number]> = {
  "loading tesseract core": [0.02, 0.2],
  "initializing tesseract": [0.2, 0.28],
  "loading language traineddata": [0.28, 0.62],
  "initializing api": [0.62, 0.7],
  "recognizing text": [0.7, 1],
};

let report: Progress = () => {};
let workerPromise: Promise<Tesseract.Worker> | null = null;

function asset(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${path}`;
}

function mapProgress(status: string, progress: number): number | null {
  const range = STAGES[status];
  if (!range) return null;
  const fraction = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  return range[0] + (range[1] - range[0]) * fraction;
}

type TesseractModule = typeof import("tesseract.js");

async function loadTesseract(): Promise<TesseractModule> {
  const mod = await import("tesseract.js");
  if (typeof mod.createWorker === "function") return mod;
  const fallback = (mod as unknown as { default?: TesseractModule }).default;
  if (fallback && typeof fallback.createWorker === "function") return fallback;
  throw new Error("Tesseract failed to load");
}

function getWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    workerPromise = loadTesseract()
      .then(({ createWorker, OEM }) =>
        createWorker("eng", OEM.LSTM_ONLY, {
          workerPath: asset("/tesseract/worker.min.js"),
          corePath: asset("/tesseract/core"),
          langPath: asset("/tesseract/lang"),
          gzip: true,
          logger: (message) => {
            const mapped = mapProgress(message.status, message.progress);
            if (mapped != null) report(mapped);
          },
        }),
      )
      .catch((error: unknown) => {
        workerPromise = null;
        throw error;
      });
  }
  return workerPromise;
}

export interface OcrResult {
  text: string;
  /** True when Tesseract's own confidence is low, or it found no text. */
  unclear: boolean;
}

/** Recognise text from an image. The file stays in this browser. */
export async function recognizeScreenshot(image: Blob, onProgress: Progress): Promise<OcrResult> {
  report = onProgress;
  onProgress(0.02);
  const worker = await getWorker();
  const result = await worker.recognize(image);
  const text = (result.data.text || "").replace(/[ \t]+\n/g, "\n").trim();
  const confidence = result.data.confidence;
  const unclear = !text || !Number.isFinite(confidence) || confidence < LOW_CONFIDENCE;
  onProgress(1);
  return { text, unclear };
}
