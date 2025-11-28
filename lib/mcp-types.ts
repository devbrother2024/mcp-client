// MCP Transport Types
export type TransportType = 'stdio' | 'streamable-http' | 'sse';

// MCP Server Configuration
export interface MCPServerConfig {
  id: string;
  name: string;
  transportType: TransportType;
  // STDIO transport options
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // HTTP/SSE transport options
  url?: string;
  // Metadata
  createdAt: number;
  updatedAt: number;
}

// Connection Status
export interface MCPConnectionStatus {
  serverId: string;
  connected: boolean;
  error?: string;
  connectedAt?: number;
}

// Tool Definition from MCP
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

// Prompt Definition from MCP
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

// Resource Definition from MCP
export interface MCPResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

// API Request/Response Types
export interface ConnectRequest {
  config: MCPServerConfig;
}

export interface DisconnectRequest {
  serverId: string;
}

export interface CallToolRequest {
  serverId: string;
  toolName: string;
  arguments?: Record<string, unknown>;
}

export interface GetPromptRequest {
  serverId: string;
  promptName: string;
  arguments?: Record<string, string>;
}

export interface ReadResourceRequest {
  serverId: string;
  uri: string;
}

export interface ListRequest {
  serverId: string;
}

// Tool Call Result
export interface ToolCallResult {
  content: Array<{
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// Prompt Result
export interface PromptResult {
  description?: string;
  messages: Array<{
    role: string;
    content: {
      type: string;
      text?: string;
    };
  }>;
}

// Resource Content
export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

// API Response wrapper
export interface MCPApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Server capabilities
export interface MCPServerCapabilities {
  tools?: boolean;
  prompts?: boolean;
  resources?: boolean;
}

// Export config format for import/export
export interface MCPExportConfig {
  version: string;
  servers: MCPServerConfig[];
  exportedAt: number;
}
