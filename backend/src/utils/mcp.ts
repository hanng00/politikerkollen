import { createMCPClient } from '@ai-sdk/mcp';
import { getMotherDuckToken } from './secrets';

const MCP_TIMEOUT_MS = 30_000;
const MOTHERDUCK_MCP_URL = 'https://api.motherduck.com/mcp';

export type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]);
}

export async function createMotherDuckClient(): Promise<MCPClient> {
  const token = getMotherDuckToken();

  const client = await withTimeout(
    createMCPClient({
      transport: {
        type: 'http',
        url: MOTHERDUCK_MCP_URL,
        headers: { Authorization: `Bearer ${token}` },
      },
      onUncaughtError: (error) => console.error('MCP client error:', error),
    }),
    MCP_TIMEOUT_MS,
    'MCP client creation timed out',
  );

  return client;
}

export async function getMotherDuckTools(client: MCPClient) {
  return withTimeout(client.tools(), MCP_TIMEOUT_MS, 'Fetching MCP tools timed out');
}

export async function safeClose(client: MCPClient | null): Promise<void> {
  if (!client) return;
  try {
    await client.close();
  } catch (error) {
    console.error('Error closing MCP client:', error);
  }
}
