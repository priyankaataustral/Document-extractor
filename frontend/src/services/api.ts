/**
 * API Service
 *
 * Handles communication with the backend API.
 */

// Base URL - in production, this should be the Render backend URL
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Types matching the backend
export interface ExtractedEntity {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  id_number: string | null;
  address: string | null;
  organisation: string | null;
  role_title: string | null;
  comments: string | null;
  source_document_name: string;
  raw_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UploadResult {
  success: boolean;
  data?: {
    files_processed: number;
    files_successful: number;
    total_entities_extracted: number;
    results: Array<{
      success: boolean;
      filename: string;
      entities_count: number;
      entities: ExtractedEntity[];
      error?: string;
    }>;
  };
  message?: string;
  error?: string;
}

export interface EntitiesResponse {
  success: boolean;
  data?: {
    entities: ExtractedEntity[];
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
  };
  error?: string;
}

export interface EntityResponse {
  success: boolean;
  data?: ExtractedEntity;
  error?: string;
}

/**
 * Upload files for processing
 */
export async function uploadFiles(files: File[]): Promise<UploadResult> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: formData,
  });

  return response.json();
}

/**
 * Get all entities with optional pagination and search
 */
export async function getEntities(
  page: number = 1,
  limit: number = 50,
  search?: string
): Promise<EntitiesResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    params.set("search", search);
  }

  const response = await fetch(`${API_BASE}/api/entities?${params}`);
  return response.json();
}

/**
 * Get a single entity by ID
 */
export async function getEntity(id: string): Promise<EntityResponse> {
  const response = await fetch(`${API_BASE}/api/entities/${id}`);
  return response.json();
}

/**
 * Delete an entity by ID
 */
export async function deleteEntity(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/api/entities/${id}`, {
    method: "DELETE",
  });
  return response.json();
}

/**
 * Export entities as CSV (backend-generated)
 */
export async function exportEntitiesCsv(search?: string): Promise<void> {
  try {
    const url = new URL(`${API_BASE}/api/entities/export/csv`);
    if (search) {
      url.searchParams.set("search", search);
    }
    
    console.log("Attempting to download CSV from:", url.toString());
    
    // Use fetch instead of window.open for better error handling
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Get the CSV content
    const csvContent = await response.text();
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const downloadUrl = URL.createObjectURL(blob);
    link.setAttribute("href", downloadUrl);
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const filename = `extracted-entities-${timestamp}.csv`;
    link.setAttribute("download", filename);
    
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
    
    console.log("CSV download completed successfully");
  } catch (error) {
    console.error("Error downloading CSV:", error);
    throw error;
  }
}
