/**
 * Entities Route
 *
 * CRUD operations for extracted entities.
 */

import { Router, Request, Response } from "express";
import {
  getEntities,
  getEntityById,
  deleteEntity,
  searchEntities,
} from "../services/database.js";
import type { ApiResponse, StoredEntity } from "../types/index.js";

const router = Router();

/**
 * GET /api/entities
 *
 * List all entities with optional pagination.
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 50, max: 100)
 *   - search: Search query (optional)
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 50)
    );
    const search = req.query.search as string;

    if (search && search.trim().length > 0) {
      // Search mode
      const entities = await searchEntities(search.trim(), limit);
      res.json({
        success: true,
        data: {
          entities,
          total: entities.length,
          page: 1,
          limit,
          has_more: false,
        },
      } as ApiResponse<unknown>);
      return;
    }

    // Normal paginated list
    const { entities, total } = await getEntities(page, limit);

    res.json({
      success: true,
      data: {
        entities,
        total,
        page,
        limit,
        has_more: page * limit < total,
      },
    } as ApiResponse<unknown>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching entities:", message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/entities/export/csv
 *
 * Export all entities as CSV.
 * IMPORTANT: This route must come BEFORE /:id to avoid "export" being treated as an ID
 * Query params:
 *   - search: Search query (optional)
 */
router.get("/export/csv", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("CSV export requested");
    const search = req.query.search as string;
    let entities: StoredEntity[];

    if (search && search.trim().length > 0) {
      // Search mode - get all matching results
      entities = await searchEntities(search.trim(), 10000);
    } else {
      // Get all entities without pagination
      const result = await getEntities(1, 10000);
      entities = result.entities;
    }

    console.log(`Exporting ${entities.length} entities to CSV`);

    // Set CSV headers
    res.setHeader("Content-Type", "text/csv;charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="extracted-entities-${new Date().toISOString().slice(0, 10)}.csv"`
    );

    // CSV headers
    const headers = [
      "Full Name",
      "Email",
      "Phone Number",
      "Address",
      "Organisation",
      "Role/Title",
      "Technology Stack",
      "Comments",
      "Source Document",
      "Extracted Date",
    ];

    // Helper function to escape CSV fields
    const escapeCsvField = (field: string | null): string => {
      if (!field) return "";
      if (field.includes(",") || field.includes('"') || field.includes("\n")) {
        return '"' + field.replace(/"/g, '""') + '"';
      }
      return field;
    };

    // Write headers
    res.write(headers.join(",") + "\n");

    // Write data rows
    for (const entity of entities) {
      const row = [
        escapeCsvField(entity.full_name),
        escapeCsvField(entity.email),
        escapeCsvField(entity.phone_number),
        escapeCsvField(entity.address),
        escapeCsvField(entity.organisation),
        escapeCsvField(entity.role_title),
        escapeCsvField(entity.technology_stack),
        escapeCsvField(entity.comments),
        escapeCsvField(entity.source_document_name),
        new Date(entity.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      ].join(",");

      res.write(row + "\n");
    }

    res.end();
    console.log("CSV export completed");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error exporting entities:", message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/entities/:id
 *
 * Get a single entity by ID.
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Basic UUID validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        error: "Invalid entity ID format",
      } as ApiResponse<null>);
      return;
    }

    const entity = await getEntityById(id);

    if (!entity) {
      res.status(404).json({
        success: false,
        error: "Entity not found",
      } as ApiResponse<null>);
      return;
    }

    res.json({
      success: true,
      data: entity,
    } as ApiResponse<StoredEntity>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching entity:", message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<null>);
  }
});

/**
 * DELETE /api/entities/:id
 *
 * Delete an entity by ID.
 */
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Basic UUID validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({
        success: false,
        error: "Invalid entity ID format",
      } as ApiResponse<null>);
      return;
    }

    // Check if entity exists first
    const entity = await getEntityById(id);
    if (!entity) {
      res.status(404).json({
        success: false,
        error: "Entity not found",
      } as ApiResponse<null>);
      return;
    }

    await deleteEntity(id);

    res.json({
      success: true,
      message: "Entity deleted successfully",
    } as ApiResponse<null>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error deleting entity:", message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<null>);
  }
});

export default router;
