/**
 * Database Service (Supabase)
 *
 * Handles all database operations for storing and retrieving extracted entities.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { ExtractedEntity, StoredEntity } from "../types/index.js";

// Initialize Supabase client
let supabase: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance
 */
function getClient(): SupabaseClient {
  if (supabase) {
    return supabase;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables."
    );
  }

  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false, // Server-side, no need to persist
    },
  });

  return supabase;
}

/**
 * Save a single extracted entity to the database
 */
export async function saveEntity(
  entity: ExtractedEntity,
  sourceDocumentName: string,
  rawJson: Record<string, unknown> | null
): Promise<StoredEntity> {
  const client = getClient();

  const { data, error } = await client
    .from("extracted_entities")
    .insert({
      full_name: entity.full_name,
      email: entity.email,
      phone_number: entity.phone_number,
      address: entity.address,
      organisation: entity.organisation,
      role_title: entity.role_title,
      comments: entity.comments,
      source_document_name: sourceDocumentName,
      raw_json: rawJson,
    })
    .select()
    .single();

  if (error) {
    console.error("Database insert error:", error);
    throw new Error(`Failed to save entity: ${error.message}`);
  }

  return data as StoredEntity;
}

/**
 * Save multiple entities from a single document
 * Uses batch insert for efficiency
 */
export async function saveEntities(
  entities: ExtractedEntity[],
  sourceDocumentName: string,
  rawJson: Record<string, unknown> | null
): Promise<StoredEntity[]> {
  if (entities.length === 0) {
    return [];
  }

  const client = getClient();

  // Prepare all entities for batch insert
  const records = entities.map((entity) => ({
    full_name: entity.full_name,
    email: entity.email,
    phone_number: entity.phone_number,
    address: entity.address,
    organisation: entity.organisation,
    role_title: entity.role_title,
    comments: entity.comments,
    source_document_name: sourceDocumentName,
    raw_json: rawJson,
  }));

  const { data, error } = await client
    .from("extracted_entities")
    .insert(records)
    .select();

  if (error) {
    console.error("Database batch insert error:", error);
    throw new Error(`Failed to save entities: ${error.message}`);
  }

  return data as StoredEntity[];
}

/**
 * Get all entities with pagination
 */
export async function getEntities(
  page: number = 1,
  limit: number = 50
): Promise<{ entities: StoredEntity[]; total: number }> {
  const client = getClient();
  const offset = (page - 1) * limit;

  // Get total count
  const { count, error: countError } = await client
    .from("extracted_entities")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Failed to get count: ${countError.message}`);
  }

  // Get paginated data
  const { data, error } = await client
    .from("extracted_entities")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch entities: ${error.message}`);
  }

  return {
    entities: data as StoredEntity[],
    total: count || 0,
  };
}

/**
 * Get a single entity by ID
 */
export async function getEntityById(id: string): Promise<StoredEntity | null> {
  const client = getClient();

  const { data, error } = await client
    .from("extracted_entities")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to fetch entity: ${error.message}`);
  }

  return data as StoredEntity;
}

/**
 * Delete an entity by ID
 */
export async function deleteEntity(id: string): Promise<boolean> {
  const client = getClient();

  const { error } = await client
    .from("extracted_entities")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete entity: ${error.message}`);
  }

  return true;
}

/**
 * Search entities by text (searches across multiple fields)
 */
export async function searchEntities(
  query: string,
  limit: number = 50
): Promise<StoredEntity[]> {
  const client = getClient();

  // Use ilike for case-insensitive partial matching
  const { data, error } = await client
    .from("extracted_entities")
    .select("*")
    .or(
      `full_name.ilike.%${query}%,email.ilike.%${query}%,organisation.ilike.%${query}%,role_title.ilike.%${query}%`
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search entities: ${error.message}`);
  }

  return data as StoredEntity[];
}
