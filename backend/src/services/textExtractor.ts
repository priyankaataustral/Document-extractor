/**
 * Text Extraction Service
 *
 * Extracts plain text from PDF and DOCX files using specialized libraries.
 */

import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { readFile } from "fs/promises";

// Supported file extensions
const SUPPORTED_EXTENSIONS = [".pdf", ".docx"] as const;
type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

/**
 * Check if a file extension is supported
 */
export function isSupportedFile(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension);
}

/**
 * Extract text from a PDF file buffer
 */
async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text.trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to parse PDF: ${message}`);
  }
}

/**
 * Extract text from a DOCX file buffer
 */
async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    // Log any warnings from mammoth (e.g., unsupported features)
    if (result.messages.length > 0) {
      console.warn("DOCX extraction warnings:", result.messages);
    }

    return result.value.trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to parse DOCX: ${message}`);
  }
}

/**
 * Main extraction function - routes to appropriate parser based on file type
 *
 * @param filePath - Path to the uploaded file on disk
 * @param originalName - Original filename (used to determine file type)
 * @returns Extracted text content
 */
export async function extractTextFromFile(
  filePath: string,
  originalName: string
): Promise<string> {
  // Read file into buffer
  const buffer = await readFile(filePath);

  // Determine file type from extension
  const extension = originalName
    .toLowerCase()
    .slice(originalName.lastIndexOf("."));

  switch (extension) {
    case ".pdf":
      return extractFromPDF(buffer);

    case ".docx":
      return extractFromDOCX(buffer);

    default:
      throw new Error(
        `Unsupported file type: ${extension}. Supported types: ${SUPPORTED_EXTENSIONS.join(", ")}`
      );
  }
}

/**
 * Extract text directly from a buffer (useful for in-memory processing)
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  switch (mimeType) {
    case "application/pdf":
      return extractFromPDF(buffer);

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return extractFromDOCX(buffer);

    default:
      throw new Error(`Unsupported MIME type: ${mimeType}`);
  }
}
