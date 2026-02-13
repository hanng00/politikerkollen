import { getOpenAIKey } from '@/utils/secrets';
import { createOpenAI } from '@ai-sdk/openai';
import { convertToModelMessages, createIdGenerator, stepCountIs, streamText, type UIMessage } from 'ai';
import { z } from 'zod';
import { requireAuth } from '../../utils/auth';
import { pipeResponseToLambdaStream, writeErrorToLambdaStream } from '../../utils/lambdaStreaming';
import { createMotherDuckClient, getMotherDuckTools, safeClose, type MCPClient } from '../../utils/mcp';
import { repository } from './repository';
import { fetchRiksdagDocumentTool, renderBarChartTool, renderPieChartTool, renderPoliticianCardTool } from './tools';
import { UIMessageSchema } from './types';

// Request schema: Frontend sends only the new message (conversationId comes from path)
const RequestBody = z.object({
  message: UIMessageSchema.describe('The new message from the user'),
});

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

/**
 * POST /c/{id}/chat - Streaming chat endpoint for AI SDK's useChat hook.
 *
 * Authentication is handled by API Gateway Cognito authorizer.
 * User claims are available in event.requestContext.authorizer.claims.
 *
 * Message persistence (following AI SDK best practices):
 * - Frontend sends only the last message
 * - Backend loads previous messages from DynamoDB
 * - After streaming completes, new messages are saved
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence
 */
export const handler = awslambda.streamifyResponse(async (event, responseStream, _context) => {
  // Lambda Function URL event has rawPath instead of pathParameters
  const rawPath = (event as { rawPath?: string }).rawPath;
  let mcpClient: MCPClient | null = null;

  try {
    // Verify JWT from Authorization header
    const user = await requireAuth(event.headers?.Authorization || event.headers?.authorization);
    console.log('Authenticated user:', user.userId);

    const body = RequestBody.parse(JSON.parse(event.body ?? '{}'));
    const { message: newMessage } = body;

    // Get conversationId from path: /c/{id}/chat
    const pathMatch = rawPath?.match(/^\/c\/([^/]+)\/chat$/);
    const conversationId = pathMatch?.[1];
    if (!conversationId) {
      throw new Error(`Invalid path: ${rawPath}. Expected /c/{id}/chat`);
    }

    // Initialize OpenAI client
    const openai = createOpenAI({
      apiKey: getOpenAIKey(),
    });

    // Initialize MCP client for MotherDuck
    mcpClient = await createMotherDuckClient();
    const motherDuckTools = await getMotherDuckTools(mcpClient);

    // Merge MotherDuck tools with custom tools
    const allTools = {
      ...motherDuckTools,
      fetch_riksdag_document: fetchRiksdagDocumentTool,
      render_pie_chart: renderPieChartTool,
      render_bar_chart: renderBarChartTool,
      render_politician_card: renderPoliticianCardTool,
    };

    // Load last 50 messages from DynamoDB (for token/cost efficiency)
    const { messages: previousMessages } = await repository.getMessages(conversationId, {
      limit: 50,
      fromEnd: true,
    });

    // Combine previous messages with the new one
    const allMessages = [...previousMessages, newMessage as UIMessage];

    // Convert UI messages to model format
    const modelMessages = await convertToModelMessages(allMessages);

    // Stream the response
    const result = streamText({
      model: openai('gpt-5.1-codex-mini'),
      // model: openai('gpt-4o-mini'),
      providerOptions: {
        openai: {
          reasoningSummary: 'auto',
        },
      },
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools: allTools,
      stopWhen: stepCountIs(10),
      onFinish: () => safeClose(mcpClient),
      onError: () => safeClose(mcpClient),
    });

    // Consume the stream to ensure it runs to completion even if client disconnects
    result.consumeStream();

    // Create the response with message persistence
    const sseResponse = result.toUIMessageStreamResponse({
      sendReasoning: true,
      originalMessages: allMessages,
      generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
      onFinish: async ({ messages }) => {
        // Find new messages (those not in previousMessages)
        const previousIds = new Set(previousMessages.map((m) => m.id));
        const newMessages = messages.filter((m) => !previousIds.has(m.id));

        if (newMessages.length > 0) {
          await repository.saveMessages(conversationId, newMessages);
        }
      },
    });

    await pipeResponseToLambdaStream(sseResponse, responseStream);
  } catch (error) {
    console.error('PostConverse handler error:', error);
    await safeClose(mcpClient);
    writeErrorToLambdaStream(error, responseStream);
  }
});
