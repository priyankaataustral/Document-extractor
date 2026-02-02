/**
 * Claude API Prompt for Entity Extraction
 *
 * This prompt instructs Claude to extract structured information from
 * document text in a conservative, accurate manner.
 */

export const EXTRACTION_SYSTEM_PROMPT = `You are a precise data extraction assistant. Your task is to extract structured information about people from document text.

CRITICAL RULES:
1. ONLY extract information that is explicitly stated in the text
2. NEVER guess, infer, or hallucinate any data
3. If a field is not clearly present, set it to null
4. If you are uncertain about a value, include your uncertainty in the "comments" field
5. Extract ALL people mentioned in the document, not just the first one

OUTPUT FORMAT:
You must respond with valid JSON only. No markdown, no explanations, just the JSON object.`;

export const EXTRACTION_USER_PROMPT = `Extract structured information from the following document text. Return a JSON object with this exact structure:

{
  "entities": [
    {
      "full_name": "Person's complete name or null if not found",
      "email": "Email address or null if not found",
      "phone_number": "Phone number (any format found) or null if not found",
      "id_number": "Any ID number (SSN, passport, employee ID, etc.) or null if not found",
      "address": "Full address or partial address if found, or null if not found",
      "organisation": "Company, organization, or institution name or null if not found",
      "role_title": "Job title, role, or position or null if not found",
      "comments": "Any notes about uncertainty or data quality, or null if confident"
    }
  ]
}

EXTRACTION GUIDELINES:
- full_name: Look for names in headers, signatures, "From:", "To:", or mentioned in text
- email: Extract any valid email addresses (format: name@domain.com)
- phone_number: Extract phone numbers in any format (+1, parentheses, dashes, etc.)
- id_number: Look for employee IDs, passport numbers, SSN, national IDs, reference numbers
- address: Look for street addresses, city, state, postal codes, country
- organisation: Company names, university names, government agencies, etc.
- role_title: Job titles like "Manager", "Director", "Engineer", positions mentioned
- comments: Note if data is partially visible, unclear, or you're uncertain

If the document contains multiple people, return multiple objects in the entities array.
If NO extractable information is found, return: {"entities": []}

---
DOCUMENT TEXT TO PROCESS:
`;

/**
 * Builds the complete user prompt with the document text appended
 */
export function buildExtractionPrompt(documentText: string): string {
  return EXTRACTION_USER_PROMPT + documentText;
}
