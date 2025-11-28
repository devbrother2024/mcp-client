'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type {
  MCPServerConfig,
  MCPConnectionStatus,
  MCPTool,
  MCPPrompt,
  MCPResource,
  MCPApiResponse,
  ToolCallResult,
  PromptResult,
  ResourceContent,
} from '@/lib/mcp-types';
import {
  getMCPServers,
  saveMCPServer,
  deleteMCPServer,
  downloadMCPConfig,
  importMCPConfigFromFile,
} from '@/lib/mcp-storage';

interface MCPContextType {
  // Server management
  servers: MCPServerConfig[];
  connectionStatus: Map<string, MCPConnectionStatus>;
  refreshServers: () => void;
  addServer: (config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => MCPServerConfig;
  updateServer: (config: MCPServerConfig) => MCPServerConfig;
  removeServer: (serverId: string) => void;

  // Connection management
  connect: (serverId: string) => Promise<MCPConnectionStatus>;
  disconnect: (serverId: string) => Promise<MCPConnectionStatus>;
  isConnected: (serverId: string) => boolean;

  // MCP operations
  listTools: (serverId: string) => Promise<MCPTool[]>;
  callTool: (serverId: string, toolName: string, args?: Record<string, unknown>) => Promise<ToolCallResult>;
  listPrompts: (serverId: string) => Promise<MCPPrompt[]>;
  getPrompt: (serverId: string, promptName: string, args?: Record<string, string>) => Promise<PromptResult>;
  listResources: (serverId: string) => Promise<MCPResource[]>;
  readResource: (serverId: string, uri: string) => Promise<ResourceContent[]>;

  // Config import/export
  exportConfig: () => void;
  importConfig: (file: File, merge?: boolean) => Promise<{ imported: number; errors: string[] }>;

  // Loading states
  isLoading: boolean;
}

const MCPContext = createContext<MCPContextType | null>(null);

export function MCPProvider({ children }: { children: React.ReactNode }) {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<Map<string, MCPConnectionStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const initialized = useRef(false);

  // Fetch connection status from server
  const fetchAllConnectionStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/mcp/status');
      const result = (await response.json()) as MCPApiResponse<MCPConnectionStatus[]>;

      if (result.success && result.data) {
        const newStatus = new Map<string, MCPConnectionStatus>();
        result.data.forEach((status) => {
          newStatus.set(status.serverId, status);
        });
        setConnectionStatus(newStatus);
      }
    } catch (error) {
      console.error('Failed to fetch connection status:', error);
    }
  }, []);

  // Load servers from localStorage on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const loadedServers = getMCPServers();
    setServers(loadedServers);

    // Fetch current connection status from server
    fetchAllConnectionStatus();
  }, [fetchAllConnectionStatus]);

  // Refresh servers list
  const refreshServers = useCallback(() => {
    const loadedServers = getMCPServers();
    setServers(loadedServers);
  }, []);

  // Add a new server
  const addServer = useCallback(
    (config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>): MCPServerConfig => {
      const saved = saveMCPServer(config);
      refreshServers();
      return saved;
    },
    [refreshServers]
  );

  // Update existing server
  const updateServer = useCallback(
    (config: MCPServerConfig): MCPServerConfig => {
      const saved = saveMCPServer(config);
      refreshServers();
      return saved;
    },
    [refreshServers]
  );

  // Remove a server
  const removeServer = useCallback(
    (serverId: string) => {
      deleteMCPServer(serverId);
      refreshServers();
      // Also update connection status
      setConnectionStatus((prev) => {
        const newStatus = new Map(prev);
        newStatus.delete(serverId);
        return newStatus;
      });
    },
    [refreshServers]
  );

  // Connect to a server
  const connect = useCallback(
    async (serverId: string): Promise<MCPConnectionStatus> => {
      const server = servers.find((s) => s.id === serverId);
      if (!server) {
        return { serverId, connected: false, error: 'Server not found' };
      }

      setIsLoading(true);
      try {
        const response = await fetch('/api/mcp/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: server }),
        });

        const result = (await response.json()) as MCPApiResponse<MCPConnectionStatus>;

        const status: MCPConnectionStatus = result.data || {
          serverId,
          connected: result.success,
          error: result.error,
        };

        setConnectionStatus((prev) => {
          const newStatus = new Map(prev);
          newStatus.set(serverId, status);
          return newStatus;
        });

        return status;
      } catch (error) {
        const status: MCPConnectionStatus = {
          serverId,
          connected: false,
          error: error instanceof Error ? error.message : 'Connection failed',
        };
        setConnectionStatus((prev) => {
          const newStatus = new Map(prev);
          newStatus.set(serverId, status);
          return newStatus;
        });
        return status;
      } finally {
        setIsLoading(false);
      }
    },
    [servers]
  );

  // Disconnect from a server
  const disconnect = useCallback(async (serverId: string): Promise<MCPConnectionStatus> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/mcp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      });

      const result = (await response.json()) as MCPApiResponse<MCPConnectionStatus>;

      const status: MCPConnectionStatus = result.data || {
        serverId,
        connected: false,
      };

      setConnectionStatus((prev) => {
        const newStatus = new Map(prev);
        newStatus.set(serverId, status);
        return newStatus;
      });

      return status;
    } catch (error) {
      const status: MCPConnectionStatus = {
        serverId,
        connected: false,
        error: error instanceof Error ? error.message : 'Disconnect failed',
      };
      return status;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if connected
  const isConnected = useCallback(
    (serverId: string): boolean => {
      return connectionStatus.get(serverId)?.connected ?? false;
    },
    [connectionStatus]
  );

  // List tools
  const listTools = useCallback(async (serverId: string): Promise<MCPTool[]> => {
    const response = await fetch('/api/mcp/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId }),
    });

    const result = (await response.json()) as MCPApiResponse<MCPTool[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to list tools');
    }
    return result.data || [];
  }, []);

  // Call tool
  const callTool = useCallback(
    async (serverId: string, toolName: string, args?: Record<string, unknown>): Promise<ToolCallResult> => {
      const response = await fetch('/api/mcp/tools/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId, toolName, arguments: args }),
      });

      const result = (await response.json()) as MCPApiResponse<ToolCallResult>;
      if (!result.success) {
        throw new Error(result.error || 'Failed to call tool');
      }
      return result.data || { content: [] };
    },
    []
  );

  // List prompts
  const listPrompts = useCallback(async (serverId: string): Promise<MCPPrompt[]> => {
    const response = await fetch('/api/mcp/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId }),
    });

    const result = (await response.json()) as MCPApiResponse<MCPPrompt[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to list prompts');
    }
    return result.data || [];
  }, []);

  // Get prompt
  const getPrompt = useCallback(
    async (serverId: string, promptName: string, args?: Record<string, string>): Promise<PromptResult> => {
      const response = await fetch('/api/mcp/prompts/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId, promptName, arguments: args }),
      });

      const result = (await response.json()) as MCPApiResponse<PromptResult>;
      if (!result.success) {
        throw new Error(result.error || 'Failed to get prompt');
      }
      return result.data || { messages: [] };
    },
    []
  );

  // List resources
  const listResources = useCallback(async (serverId: string): Promise<MCPResource[]> => {
    const response = await fetch('/api/mcp/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId }),
    });

    const result = (await response.json()) as MCPApiResponse<MCPResource[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to list resources');
    }
    return result.data || [];
  }, []);

  // Read resource
  const readResource = useCallback(async (serverId: string, uri: string): Promise<ResourceContent[]> => {
    const response = await fetch('/api/mcp/resources/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, uri }),
    });

    const result = (await response.json()) as MCPApiResponse<ResourceContent[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to read resource');
    }
    return result.data || [];
  }, []);

  // Export config
  const exportConfig = useCallback(() => {
    downloadMCPConfig();
  }, []);

  // Import config
  const importConfig = useCallback(
    async (file: File, merge = false): Promise<{ imported: number; errors: string[] }> => {
      const result = await importMCPConfigFromFile(file, { merge });
      refreshServers();
      return result;
    },
    [refreshServers]
  );

  const value: MCPContextType = {
    servers,
    connectionStatus,
    refreshServers,
    addServer,
    updateServer,
    removeServer,
    connect,
    disconnect,
    isConnected,
    listTools,
    callTool,
    listPrompts,
    getPrompt,
    listResources,
    readResource,
    exportConfig,
    importConfig,
    isLoading,
  };

  return <MCPContext.Provider value={value}>{children}</MCPContext.Provider>;
}

export function useMCP() {
  const context = useContext(MCPContext);
  if (!context) {
    throw new Error('useMCP must be used within an MCPProvider');
  }
  return context;
}
