import { createWorker } from "tesseract.js";

// OCR provider is intentionally isolated behind this one function.
// Swapping to AWS Textract or Google ML Kit later means changing only this
// file — every caller just awaits extractTextFromImage(path) and gets back
// raw text, regardless of which engine produced it.
//
// Tesseract.js is used here since it runs locally with no API key/cloud
// dependency, which keeps the pipeline usable out of the box. For production
// receipt volumes, AWS Textract or Google ML Kit generally give meaningfully
// better accuracy on crumpled/low-contrast receipts.
export const extractTextFromImage = async (imagePath: string): Promise<string> => {
  const worker = await createWorker("eng");

  try {
    const {
      data: { text },
    } = await worker.recognize(imagePath);
    return text;
  } catch (error) {
    throw new Error(
      `OCR text extraction failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  } finally {
    await worker.terminate();
  }
};
