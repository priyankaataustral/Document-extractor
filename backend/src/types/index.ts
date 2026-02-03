/**
 * TypeScript type definitions for the Document Extractor application
 */

// Entity extracted from a document by the LLM
export interface ExtractedEntity {
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  organisation: string | null;
  role_title: string | null;
  technology_stack: string | null;
  comments: string | null;
}

// Entity as stored in the database (includes metadata)
export interface StoredEntity extends ExtractedEntity {
  id: string;
  source_document_name: string;
  raw_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Response from Claude extraction
export interface ExtractionResponse {
  entities: ExtractedEntity[];
  raw_response: Record<string, unknown>;
}

// Upload processing result
export interface ProcessingResult {
  success: boolean;
  filename: string;
  entities_count: number;
  entities: StoredEntity[];
  error?: string;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
