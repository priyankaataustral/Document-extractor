/**
 * Document Extractor Backend
 *
 * Express server for handling document uploads, text extraction,
 * Claude API integration, and Supabase storage.
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

import uploadRouter from "./routes/upload.js";
import entitiesRouter from "./routes/entities.js";

// Create Express app
const app = express();

// Configuration
const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "0.0.0.0"; // Bind to 0.0.0.0 for Replit/cloud hosting
const NODE_ENV = process.env.NODE_ENV || "development";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Validate required environment variables
function validateEnv(): void {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "ANTHROPIC_API_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("Missing required environment variables:", missing.join(", "));
    console.error("Please check your .env file or environment configuration.");
    process.exit(1);
  }
}

// CORS configuration - allows multiple origins or wildcard
app.use(
  cors({
    origin: FRONTEND_URL === "*" ? true : FRONTEND_URL.split(",").map((url) => url.trim()),
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: FRONTEND_URL !== "*",
  })
);
app.use(express.json());

// Request logging middleware (simple)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// API routes
app.use("/api/upload", uploadRouter);
app.use("/api/entities", entitiesRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
});

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      success: false,
      error: NODE_ENV === "production" ? "Internal server error" : err.message,
    });
  }
);

// Start server
function start(): void {
  validateEnv();

  app.listen(PORT, HOST, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║         Document Extractor Backend                        ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on ${HOST}:${String(PORT).padEnd(26)}║
║  Environment: ${NODE_ENV.padEnd(40)}║
║  Frontend URL: ${FRONTEND_URL.padEnd(39).slice(0, 39)}║
╚═══════════════════════════════════════════════════════════╝

API Endpoints:
  POST /api/upload          Upload PDF/DOCX files
  GET  /api/entities        List extracted entities
  GET  /api/entities/:id    Get entity by ID
  DELETE /api/entities/:id  Delete entity
  GET  /health              Health check
    `);
  });
}

start();
