/**
 * File Upload Route
 *
 * Handles PDF/DOCX file uploads, text extraction, and LLM processing.
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import { unlink } from "fs/promises";
import path from "path";
import os from "os";

import { extractTextFromFile, isSupportedFile } from "../services/textExtractor.js";
import { callClaudeForExtraction } from "../services/claude.js";
import { saveEntities } from "../services/database.js";
import type { ProcessingResult, ApiResponse } from "../types/index.js";

const router = Router();

// Configure multer for file uploads
// Store files temporarily in OS temp directory
const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (req, file, cb) => {
    // Generate unique filename to avoid collisions
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `upload-${uniqueSuffix}${ext}`);
  },
});

// File filter to only accept PDF and DOCX
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (isSupportedFile(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and DOCX files are supported"));
  }
};

// Multer instance with limits
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size
    files: 10, // Max 10 files per request (bulk upload limit)
  },
});

/**
 * POST /api/upload
 *
 * Upload one or more PDF/DOCX files for processing.
 * Returns the extracted entities for each file.
 */
router.post(
  "/",
  upload.array("files", 10),
  async (req: Request, res: Response): Promise<void> => {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: "No files uploaded",
      } as ApiResponse<null>);
      return;
    }

    console.log(`Processing ${files.length} file(s)...`);
    const results: ProcessingResult[] = [];

    // Process each file
    for (const file of files) {
      const result = await processFile(file);
      results.push(result);
    }

    // Clean up temporary files
    await cleanupFiles(files);

    // Prepare response
    const successCount = results.filter((r) => r.success).length;
    const totalEntities = results.reduce((sum, r) => sum + r.entities_count, 0);

    res.json({
      success: successCount > 0,
      data: {
        files_processed: files.length,
        files_successful: successCount,
        total_entities_extracted: totalEntities,
        results,
      },
      message: `Processed ${successCount}/${files.length} files, extracted ${totalEntities} entities`,
    } as ApiResponse<unknown>);
  }
);

/**
 * Process a single uploaded file
 */
async function processFile(file: Express.Multer.File): Promise<ProcessingResult> {
  const filename = file.originalname;
  console.log(`Processing file: ${filename}`);

  try {
    // Step 1: Extract text from the file
    console.log(`  Extracting text from ${filename}...`);
    const extractedText = await extractTextFromFile(file.path, filename);

    if (!extractedText || extractedText.trim().length === 0) {
      return {
        success: false,
        filename,
        entities_count: 0,
        entities: [],
        error: "No text could be extracted from the file",
      };
    }

    console.log(`  Extracted ${extractedText.length} characters`);

    // Step 2: Call Claude to extract entities
    console.log(`  Calling Claude for entity extraction...`);
    const extraction = await callClaudeForExtraction(extractedText);

    if (extraction.entities.length === 0) {
      console.log(`  No entities found in ${filename}`);
      return {
        success: true,
        filename,
        entities_count: 0,
        entities: [],
      };
    }

    console.log(`  Found ${extraction.entities.length} entities`);

    // Step 3: Save entities to database
    console.log(`  Saving entities to database...`);
    const savedEntities = await saveEntities(
      extraction.entities,
      filename,
      extraction.raw_response
    );

    console.log(`  Successfully processed ${filename}`);

    return {
      success: true,
      filename,
      entities_count: savedEntities.length,
      entities: savedEntities,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`  Error processing ${filename}:`, message);

    return {
      success: false,
      filename,
      entities_count: 0,
      entities: [],
      error: message,
    };
  }
}

/**
 * Clean up temporary files after processing
 */
async function cleanupFiles(files: Express.Multer.File[]): Promise<void> {
  for (const file of files) {
    try {
      await unlink(file.path);
    } catch (error) {
      // Ignore cleanup errors
      console.warn(`Failed to cleanup temp file: ${file.path}`);
    }
  }
}

// Error handling middleware for multer errors
router.use((error: Error, req: Request, res: Response, next: Function) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        success: false,
        error: "File too large. Maximum size is 20MB.",
      });
      return;
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      res.status(400).json({
        success: false,
        error: "Too many files. Maximum is 10 files per upload.",
      });
      return;
    }
  }

  res.status(400).json({
    success: false,
    error: error.message,
  });
});

export default router;
