/**
 * Claude API Integration Service
 *
 * Handles communication with Anthropic's Claude API for entity extraction.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
} from "../prompts/extraction.js";
import type { ExtractedEntity, ExtractionResponse } from "../types/index.js";

// Initialize Anthropic client (uses ANTHROPIC_API_KEY env var automatically)
const anthropic = new Anthropic();

// Model to use for extraction (Claude 3.5 Sonnet offers good balance of speed/quality)
const MODEL = "claude-sonnet-4-20250514";

// Maximum tokens for the response
const MAX_TOKENS = 4096;

/**
 * Call Claude API to extract structured entities from document text
 *
 * @param documentText - Raw text extracted from PDF/DOCX
 * @returns Parsed entities and raw response for storage
 */
export async function callClaudeForExtraction(
  documentText: string
): Promise<ExtractionResponse> {
  // Truncate very long documents to avoid token limits
  // Claude can handle ~100k tokens, but we'll be conservative
  const maxTextLength = 50000;
  const truncatedText =
    documentText.length > maxTextLength
      ? documentText.slice(0, maxTextLength) + "\n\n[Document truncated...]"
      : documentText;

  try {
    console.log(
      `Calling Claude API with ${truncatedText.length} characters of text...`
    );

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildExtractionPrompt(truncatedText),
        },
      ],
    });

    // Extract text content from response
    const responseContent = message.content[0];
    if (responseContent.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const responseText = responseContent.text;
    console.log("Claude response received, parsing JSON...");

    // Parse the JSON response
    const parsed = parseExtractionResponse(responseText);

    return {
      entities: parsed.entities,
      raw_response: {
        model: MODEL,
        input_length: truncatedText.length,
        output_text: responseText,
        usage: message.usage,
        stop_reason: message.stop_reason,
      },
    };
  } catch (error) {
    // Handle specific Anthropic errors
    if (error instanceof Anthropic.APIError) {
      console.error("Claude API error:", error.status, error.message);
      throw new Error(`Claude API error (${error.status}): ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse and validate the JSON response from Claude
 */
function parseExtractionResponse(responseText: string): {
  entities: ExtractedEntity[];
} {
  // Try to find JSON in the response (Claude might add some text around it)
  let jsonStr = responseText.trim();

  // If response starts with markdown code block, extract the JSON
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  // Parse the JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error("Failed to parse Claude response as JSON:", responseText);
    throw new Error("Claude returned invalid JSON. Response: " + responseText.slice(0, 200));
  }

  // Validate structure
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Claude response is not an object");
  }

  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.entities)) {
    // Maybe Claude returned entities directly as an array?
    if (Array.isArray(parsed)) {
      return { entities: validateEntities(parsed) };
    }
    throw new Error("Claude response missing 'entities' array");
  }

  return { entities: validateEntities(obj.entities) };
}

/**
 * Validate and normalize extracted entities
 */
function validateEntities(entities: unknown[]): ExtractedEntity[] {
  return entities.map((entity, index) => {
    if (!entity || typeof entity !== "object") {
      console.warn(`Entity ${index} is not an object, skipping`);
      return createEmptyEntity();
    }

    const e = entity as Record<string, unknown>;

    return {
      full_name: normalizeString(e.full_name),
      email: normalizeString(e.email),
      phone_number: normalizeString(e.phone_number),
      address: normalizeString(e.address),
      organisation: normalizeString(e.organisation),
      role_title: normalizeString(e.role_title),
      comments: normalizeString(e.comments),
    };
  });
}

/**
 * Normalize a value to string or null
 */
function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return String(value);
}

/**
 * Create an empty entity (all fields null)
 */
function createEmptyEntity(): ExtractedEntity {
  return {
    full_name: null,
    email: null,
    phone_number: null,
    address: null,
    organisation: null,
    role_title: null,
    comments: null,
  };
}
