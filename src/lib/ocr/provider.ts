/**
 * OCR provider abstraction — extract text from a receipt / handwritten note image.
 * Browser implementation uses Tesseract.js (on-device; no API key).
 */

export type OcrProgress = {
  status: string;
  progress: number;
};

export type OcrExtractResult = {
  text: string;
  confidence: number;
};

export type OcrProvider = {
  extract(
    image: File | Blob | string,
    onProgress?: (p: OcrProgress) => void,
  ): Promise<OcrExtractResult>;
};

let workerPromise: Promise<import("tesseract.js").Worker> | null = null;

async function getWorker(onProgress?: (p: OcrProgress) => void) {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return createWorker("eng", 1, {
        logger: (m) => {
          if (typeof m.progress === "number") {
            onProgress?.({ status: String(m.status ?? "recognizing"), progress: m.progress });
          }
        },
      });
    })();
  }
  return workerPromise;
}

/** On-device English OCR via Tesseract.js. */
export const browserOcrProvider: OcrProvider = {
  async extract(image, onProgress) {
    const worker = await getWorker(onProgress);
    const result = await worker.recognize(image);
    const text = (result.data.text ?? "").trim();
    const confidence = typeof result.data.confidence === "number" ? result.data.confidence / 100 : 0.5;
    return { text, confidence };
  },
};

export async function extractTextFromImage(
  image: File | Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrExtractResult> {
  return browserOcrProvider.extract(image, onProgress);
}
