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
