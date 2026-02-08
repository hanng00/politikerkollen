/**
 * Riksdag API client for fetching documents
 * URL structure: https://data.riksdagen.se/dokument/{dok_id}.{pdf,xml,html,json}
 */

export interface RiksdagDocumentJson {
  dokumentstatus: {
    dokument: {
      dok_id: string;
      dokumentnamn: string;
      typ: string;
      subtyp: string;
      rm: string;
      beteckning: string;
      organ: string;
      titel: string;
      undertitel: string;
      datum: string;
      publicerad: string;
      html: string; // HTML content of the document
    };
  };
}

export interface FetchDocumentResult {
  success: boolean;
  dokId: string;
  title?: string;
  type?: string;
  subtype?: string;
  date?: string;
  content?: string;
  htmlUrl?: string;
  pdfUrl?: string;
  error?: string;
}

const RIKSDAG_BASE = 'https://data.riksdagen.se/dokument';

/**
 * Normalize a document ID (strip URLs, extensions)
 */
function normalizeDocId(dokId: string): string {
  return dokId
    .replace(/.*\//, '')
    .replace(/\.(pdf|xml|html|json|text)$/i, '')
    .toUpperCase();
}

/**
 * Fetch document from Riksdagen (JSON format includes metadata + HTML content)
 */
export async function fetchDocument(dokId: string): Promise<FetchDocumentResult> {
  const id = normalizeDocId(dokId);
  const url = `${RIKSDAG_BASE}/${id}.json`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        dokId: id,
        error: `Document not found (${response.status})`,
      };
    }

    const data = (await response.json()) as RiksdagDocumentJson;
    const doc = data.dokumentstatus.dokument;

    // Extract text from HTML content
    const textContent = doc.html ? stripHtml(doc.html) : undefined;

    return {
      success: true,
      dokId: id,
      title: doc.titel || doc.dokumentnamn,
      type: doc.typ,
      subtype: doc.subtyp,
      date: doc.datum || doc.publicerad,
      content: textContent,
      htmlUrl: `${RIKSDAG_BASE}/${id}.html`,
      pdfUrl: `${RIKSDAG_BASE}/${id}.pdf`,
    };
  } catch (error) {
    return {
      success: false,
      dokId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Strip HTML tags and decode entities to get plain text
 */
function stripHtml(html: string): string {
  return (
    html
      // Remove script and style tags with their content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Replace block elements with newlines
      .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      // Remove all remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      // Clean up whitespace
      .replace(/\n\s*\n/g, '\n\n')
      .trim()
  );
}

/**
 * Extract document IDs from text (e.g., "HD023623", "GZ10394")
 * Riksdag document IDs follow the pattern: 2 letters + 2-6 digits
 */
export function extractDocumentIds(text: string): string[] {
  const pattern = /\b([A-Z]{2}\d{2,6})\b/g;
  const matches = text.match(pattern) || [];
  return [...new Set(matches)];
}
