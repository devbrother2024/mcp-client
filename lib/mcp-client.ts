import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type {
  MCPServerConfig,
  MCPConnectionStatus,
  MCPTool,
  MCPPrompt,
  MCPResource,
  ToolCallResult,
  PromptResult,
  ResourceContent,
} from './mcp-types';

// Client instance with metadata
interface ClientInstance {
  client: Client;
  config: MCPServerConfig;
  connectedAt: number;
}

// Singleton MCP Client Manager
class MCPClientManager {
  private static instance: MCPClientManager;
  private clients: Map<string, ClientInstance> = new Map();

  private constructor() {}

  static getInstance(): MCPClientManager {
    if (!MCPClientManager.instance) {
      MCPClientManager.instance = new MCPClientManager();
    }
    return MCPClientManager.instance;
  }

  // Get all connected server IDs
  getConnectedServerIds(): string[] {
    return Array.from(this.clients.keys());
  }

  // Get connection status for a server
  getConnectionStatus(serverId: string): MCPConnectionStatus {
    const instance = this.clients.get(serverId);
    if (instance) {
      return {
        serverId,
        connected: true,
        connectedAt: instance.connectedAt,
      };
    }
    return {
      serverId,
      connected: false,
    };
  }

  // Get all connection statuses
  getAllConnectionStatuses(): MCPConnectionStatus[] {
    return Array.from(this.clients.entries()).map(([serverId, instance]) => ({
      serverId,
      connected: true,
      connectedAt: instance.connectedAt,
    }));
  }

  // Connect to an MCP server
  async connect(config: MCPServerConfig): Promise<MCPConnectionStatus> {
    // Disconnect existing connection if any
    if (this.clients.has(config.id)) {
      await this.disconnect(config.id);
    }

    try {
      const client = new Client({
        name: 'mcp-chat-client',
        version: '1.0.0',
      });

      let transport;

      switch (config.transportType) {
        case 'stdio':
          if (!config.command) {
            throw new Error('Command is required for STDIO transport');
          }
          transport = new StdioClientTransport({
            command: config.command,
            args: config.args || [],
            env: config.env,
          });
          break;

        case 'streamable-http':
          if (!config.url) {
            throw new Error('URL is required for Streamable HTTP transport');
          }
          transport = new StreamableHTTPClientTransport(new URL(config.url));
          break;

        case 'sse':
          if (!config.url) {
            throw new Error('URL is required for SSE transport');
          }
          transport = new SSEClientTransport(new URL(config.url));
          break;

        default:
          throw new Error(`Unsupported transport type: ${config.transportType}`);
      }

      await client.connect(transport);

      const instance: ClientInstance = {
        client,
        config,
        connectedAt: Date.now(),
      };

      this.clients.set(config.id, instance);

      return {
        serverId: config.id,
        connected: true,
        connectedAt: instance.connectedAt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        serverId: config.id,
        connected: false,
        error: errorMessage,
      };
    }
  }

  // Disconnect from an MCP server
  async disconnect(serverId: string): Promise<MCPConnectionStatus> {
    const instance = this.clients.get(serverId);
    if (!instance) {
      return {
        serverId,
        connected: false,
      };
    }

    try {
      await instance.client.close();
    } catch (error) {
      console.error(`Error closing client for ${serverId}:`, error);
    }

    this.clients.delete(serverId);

    return {
      serverId,
      connected: false,
    };
  }

  // Get client for a server (internal use)
  private getClient(serverId: string): Client {
    const instance = this.clients.get(serverId);
    if (!instance) {
      throw new Error(`Server ${serverId} is not connected`);
    }
    return instance.client;
  }

  // Get raw client instance for mcpToTool (external use)
  getClientInstance(serverId: string): Client | null {
    const instance = this.clients.get(serverId);
    return instance ? instance.client : null;
  }

  // Get all connected client instances for mcpToTool
  getAllClientInstances(): Client[] {
    return Array.from(this.clients.values()).map((instance) => instance.client);
  }

  // List tools from a server
  async listTools(serverId: string): Promise<MCPTool[]> {
    const client = this.getClient(serverId);
    const result = await client.listTools();
    return result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown>,
    }));
  }

  // Call a tool
  async callTool(
    serverId: string,
    toolName: string,
    args?: Record<string, unknown>
  ): Promise<ToolCallResult> {
    const client = this.getClient(serverId);
    const result = await client.callTool({
      name: toolName,
      arguments: args || {},
    });

    const contentArray = Array.isArray(result.content) ? result.content : [];

    return {
      content: contentArray.map(
        (item: {
          type: string;
          text?: string;
          data?: string;
          mimeType?: string;
          resource?: unknown;
        }) => {
          if (item.type === 'text') {
            return { type: 'text', text: item.text };
          } else if (item.type === 'image') {
            return { type: 'image', data: item.data, mimeType: item.mimeType };
          } else if (item.type === 'resource') {
            return {
              type: 'resource',
              text:
                typeof item.resource === 'object'
                  ? JSON.stringify(item.resource)
                  : String(item.resource),
            };
          }
          return { type: item.type };
        }
      ),
      isError: result.isError === true,
    };
  }

  // List prompts from a server
  async listPrompts(serverId: string): Promise<MCPPrompt[]> {
    const client = this.getClient(serverId);
    const result = await client.listPrompts();
    return result.prompts.map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments?.map((arg) => ({
        name: arg.name,
        description: arg.description,
        required: arg.required,
      })),
    }));
  }

  // Get a prompt
  async getPrompt(
    serverId: string,
    promptName: string,
    args?: Record<string, string>
  ): Promise<PromptResult> {
    const client = this.getClient(serverId);
    const result = await client.getPrompt({
      name: promptName,
      arguments: args || {},
    });

    return {
      description: result.description,
      messages: result.messages.map((msg) => ({
        role: msg.role,
        content: {
          type:
            typeof msg.content === 'object' && 'type' in msg.content ? msg.content.type : 'text',
          text:
            typeof msg.content === 'string'
              ? msg.content
              : typeof msg.content === 'object' && 'text' in msg.content
                ? msg.content.text
                : JSON.stringify(msg.content),
        },
      })),
    };
  }

  // List resources from a server
  async listResources(serverId: string): Promise<MCPResource[]> {
    const client = this.getClient(serverId);
    const result = await client.listResources();
    return result.resources.map((resource) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
    }));
  }

  // Read a resource
  async readResource(serverId: string, uri: string): Promise<ResourceContent[]> {
    const client = this.getClient(serverId);
    const result = await client.readResource({ uri });

    return result.contents.map((content) => ({
      uri: content.uri,
      mimeType: content.mimeType,
      text: 'text' in content ? content.text : undefined,
      blob: 'blob' in content ? content.blob : undefined,
    }));
  }

  // Disconnect all servers
  async disconnectAll(): Promise<void> {
    const serverIds = Array.from(this.clients.keys());
    await Promise.all(serverIds.map((id) => this.disconnect(id)));
  }
}

// Export singleton instance getter
export const getMCPClientManager = () => MCPClientManager.getInstance();
