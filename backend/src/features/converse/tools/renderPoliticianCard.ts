import { z } from 'zod';

export const renderPoliticianCardTool = {
  description: `Renders a rich profile card for a Swedish politician (riksdagsledamot) in the UI.

CRITICAL: After calling this tool, DO NOT repeat any information that appears on the card. The card already displays:
- Name (tilltalsnamn + efternamn)
- Party (parti)
- Constituency (valkrets)
- Status
- Age (calculated from fodd_ar)
- Gender (kon)

DO NOT write things like "Namn: X", "Parti: Y", "Valkrets: Z", "Status: ...", "Född: ...", "Kön: ..." etc. This is redundant and annoying.

Instead, ONLY provide:
- Analysis or insights NOT visible on the card (e.g., voting patterns, notable positions, recent activity)
- Follow-up questions about what the user wants to explore
- Offers to show additional data (charts, comparisons, voting records)

Example of what NOT to say: "Här är en översikt av [Name]: Namn: [Name], Parti: [Party]..." - this repeats the card.
Example of what TO say: "Vill du veta mer om hans röstningsmönster eller politiska uppdrag?" or "Han har varit särskilt aktiv inom [topic]. Ska jag visa några av hans viktigaste röster?"

The tool accepts data from the stg_personlista table. Query this table first to get the politician's information, then pass the relevant fields to this tool.

Required fields:
- intressent_id: Unique politician identifier
- tilltalsnamn: First name
- efternamn: Last name  
- parti: Political party (e.g., 'S', 'M', 'SD', 'C', 'V', 'KD', 'L', 'MP')
- valkrets: Electoral district/constituency
- status: Current status (e.g., 'Tjänstgörande riksdagsledamot')
- bild_url_192: Photo URL (192x192px)

Optional but recommended:
- fodd_ar: Birth year (for age calculation)
- kon: Gender ('kvinna' or 'man')
- personuppdrag: JSON with assignments/committee memberships

Example:
{
  "intressent_id": "0897304708905",
  "tilltalsnamn": "Annie",
  "efternamn": "Lööf",
  "parti": "C",
  "valkrets": "Jönköpings län",
  "status": "Tjänstgörande riksdagsledamot",
  "bild_url_192": "https://data.riksdagen.se/filarkiv/bilder/ledamot/...",
  "fodd_ar": "1983",
  "kon": "kvinna"
}`,

  inputSchema: z.object({
    intressent_id: z.string().describe('Unique politician identifier from Riksdagen'),
    tilltalsnamn: z.string().describe('First name (given name)'),
    efternamn: z.string().describe('Last name (surname)'),
    parti: z.string().describe("Political party abbreviation (e.g., 'S', 'M', 'SD', 'C', 'V', 'KD', 'L', 'MP')"),
    valkrets: z.string().describe('Electoral district/constituency'),
    status: z.string().describe('Current membership status'),
    bild_url_192: z.string().url().optional().describe('URL to 192x192px portrait photo'),
    fodd_ar: z.string().optional().describe('Birth year (4-digit string)'),
    kon: z.string().optional().describe("Gender: 'kvinna' or 'man'"),
    iort: z.string().optional().describe('Birthplace'),
    personuppdrag: z.string().optional().describe('JSON string with assignments/committee memberships'),
    stats: z.any().optional().describe('Stats are ignored - do not include'),
  }),

  execute: async (input: unknown) => {
    try {
      const schema = z.object({
        intressent_id: z.string(),
        tilltalsnamn: z.string(),
        efternamn: z.string(),
        parti: z.string(),
        valkrets: z.string(),
        status: z.string(),
        bild_url_192: z.string().url().optional(),
        fodd_ar: z.string().optional(),
        kon: z.string().optional(),
        iort: z.string().optional(),
        personuppdrag: z.string().optional(),
        stats: z.any().optional(),
      });

      // Strip stats before validation to ignore them completely
      const inputWithoutStats = { ...(input as Record<string, unknown>) };
      delete inputWithoutStats.stats;

      const parsed = schema.safeParse(inputWithoutStats);
      if (!parsed.success) {
        // Format errors in a user-friendly way
        const errorMessages = parsed.error.issues.map((issue) => {
          const fieldPath = issue.path.join('.');
          const fieldName = fieldPath || 'root';

          // Generic error formatting
          let message = issue.message;
          if (issue.code === 'too_big' && typeof issue.maximum === 'number') {
            message = `must be ≤ ${issue.maximum}`;
          } else if (issue.code === 'too_small' && typeof issue.minimum === 'number') {
            message = `must be ≥ ${issue.minimum}`;
          }

          return `${fieldName}: ${message}`;
        });

        return {
          error: true,
          message: errorMessages.length === 1 ? errorMessages[0] : `Validation errors:\n${errorMessages.map((m) => `  • ${m}`).join('\n')}`,
        };
      }

      // Parse personuppdrag JSON if provided
      let assignments = null;
      if (parsed.data.personuppdrag) {
        try {
          assignments = JSON.parse(parsed.data.personuppdrag);
        } catch {
          // Ignore parse errors, assignments will remain null
        }
      }

      return {
        type: 'politician_card',
        intressent_id: parsed.data.intressent_id,
        tilltalsnamn: parsed.data.tilltalsnamn,
        efternamn: parsed.data.efternamn,
        parti: parsed.data.parti,
        valkrets: parsed.data.valkrets,
        status: parsed.data.status,
        bild_url_192: parsed.data.bild_url_192,
        fodd_ar: parsed.data.fodd_ar,
        kon: parsed.data.kon,
        iort: parsed.data.iort,
        assignments,
        // Stats are ignored - don't include them
      };
    } catch (error) {
      return {
        error: true,
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
