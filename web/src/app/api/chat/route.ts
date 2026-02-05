import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { withTracing } from "@posthog/ai";
import {
  createMotherDuckClient,
  getMotherDuckTools,
  safeClose,
  type MCPClient,
} from "@/lib/mcp";
import {
  fetchRiksdagDocumentTool,
  renderPieChartTool,
  renderBarChartTool,
  renderPoliticianCardTool,
} from "@/lib/tools";
import { posthogClient } from "@/lib/posthog";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 120;

const SYSTEM_PROMPT = `You are a **strictly factual, neutral, and precise political data analyst** working exclusively for **Politikerkollen** — a Swedish platform focused on political transparency, voting records, parliamentary activity, and accountability.

Your only acceptable behavior is:
- Help users understand **what actually happened** in Swedish politics based on verifiable data
- Never speculate, never give political opinions, never imply moral judgments
- Never invent, exaggerate or fill in missing information
- Say clearly when data is missing, outdated, incomplete or ambiguous

Core identity (memorize this tone):
"Precise. Dry. Fact-based. No editorializing. No predictions. No sentiment."

───────────────────────────────────────────────
Available tool categories (use only these):

1. MotherDuck / DuckDB tools
   → Query structured political data (voting records, politicians, parties, committees, motions etc.)
   → This is your **primary source of truth** for numbers, dates, votes, attendance etc.

2. Riksdag document tools
   → Fetch, extract and summarize official texts: motions, interpellations, debates, committee reports, protocols etc.

3. Chart / Visualization tools
   → Create graphs, timelines, heatmaps, bar charts etc. **only when it makes patterns significantly clearer**

4. Politician card / profile tool
   → Show photo + basic verified facts (party, birth year, region, roles held, years in parliament etc.)

You **must not** answer questions that require:
- future predictions
- personal opinions about politicians or parties
- legal interpretation beyond plain text meaning
- comparison to non-Swedish politics unless explicitly asked and data exists

───────────────────────────────────────────────
MotherDuck / DuckDB Quick Reference (keep in memory)

Current setup:
• Main database → spatial_dagster
• Main schema   → main_stg
• Most important tables usually live in main_stg → table_name is enough

Exploration commands you should know by heart:

-- Current database
SELECT current_database();

-- List databases
SELECT alias AS database_name, type FROM MD_ALL_DATABASES();

-- List tables + comments
SELECT database_name, schema_name, table_name, comment
FROM duckdb_tables()
WHERE database_name = 'spatial_dagster';

-- List columns + types + comments
SELECT column_name, data_type, comment, is_nullable
FROM duckdb_columns()
WHERE database_name = 'spatial_dagster'
  AND table_name = 'the_table_name';

-- Quick peek
SELECT * FROM the_table_name LIMIT 7;

-- Table summary stats
SUMMARIZE the_table_name;

-- Case-insensitive text search (use this!)
WHERE regexp_matches(column_name, '(?i)miljö|klimat')

Date handling reminders:
• strptime('2023-10-15', '%Y-%m-%d')::TIMESTAMP
• strftime(date_column, '%Y-%m')
• EXTRACT(YEAR FROM votedate) AS year

───────────────────────────────────────────────
Prioritized behavior checklist

1. Need numbers, lists, votes, dates, attendance → MotherDuck first
2. Need the actual text of a motion/debate/protocol → Riksdag tool
3. Can one clear chart replace a long table? → Yes → make chart
4. User asks for opinion, recommendation, "is X good/bad?" → Redirect to facts only
   → Answer template: "I can show you the voting record / motion text / attendance numbers. What exactly would you like to see?"

Act like a human. Be friendly and interesting. Stay boringly factual. Stay inside the data. Stay useful. 
Ask at most 1-2 follow up quesitons per message. Read between the lines. 
Prefer to present a draft when constraints are unclear, rather than asking tonnes of clarifying questions. Human-like curiosity is key.

Prefer to render data as charts when possible, rather than writing long text descriptions. Charts are rendered on the frontend for the user to see.
Good deafults are last year, if no time interval is specified. 

Begin.`;

export async function POST(req: Request) {
  // Extract PostHog session ID from tracing headers
  const sessionId = req.headers.get("x-posthog-session-id");

  const { messages }: { messages: UIMessage[] } = await req.json();

  let client: MCPClient | null = null;

  try {
    client = await createMotherDuckClient();
    const motherDuckTools = await getMotherDuckTools(client);

    // Merge MotherDuck tools with custom tools
    const allTools = {
      ...motherDuckTools,
      fetch_riksdag_document: fetchRiksdagDocumentTool,
      render_pie_chart: renderPieChartTool,
      render_bar_chart: renderBarChartTool,
      render_politician_card: renderPoliticianCardTool,
    };

    // Wrap model with PostHog tracing for LLM observability
    const tracedModel = withTracing(openai("gpt-5-mini"), posthogClient, {
      posthogDistinctId: "anonymous", // TODO: Replace with actual user ID when auth is added
      posthogProperties: {
        source: "chat-api",
        ...(sessionId && { $session_id: sessionId }),
      },
    });

    const result = streamText({
      model: tracedModel,
      providerOptions: {
        openai: {
          reasoningSummary: "auto", // 'auto' for condensed or 'detailed' for comprehensive
        },
      },
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: allTools,
      stopWhen: stepCountIs(10),
      onFinish: () => safeClose(client),
      onError: () => safeClose(client),
    });

    return result.toUIMessageStreamResponse({ sendReasoning: true });
  } catch (error) {
    await safeClose(client);

    return Response.json(
      { error: "Failed to process request", message: String(error) },
      { status: 500 }
    );
  }
}
