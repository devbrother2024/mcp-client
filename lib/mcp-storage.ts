import type { MCPServerConfig, MCPExportConfig } from './mcp-types';

const STORAGE_KEY = 'mcp-servers';
const EXPORT_VERSION = '1.0.0';

// Get all MCP servers from localStorage
export function getMCPServers(): MCPServerConfig[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as MCPServerConfig[];
  } catch (error) {
    console.error('Failed to load MCP servers:', error);
    return [];
  }
}

// Get a single MCP server by ID
export function getMCPServer(id: string): MCPServerConfig | null {
  const servers = getMCPServers();
  return servers.find((s) => s.id === id) || null;
}

// Save a new MCP server or update existing
export function saveMCPServer(
  config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): MCPServerConfig {
  const servers = getMCPServers();
  const now = Date.now();

  let savedConfig: MCPServerConfig;

  if (config.id) {
    // Update existing
    const index = servers.findIndex((s) => s.id === config.id);
    if (index !== -1) {
      savedConfig = {
        ...servers[index],
        ...config,
        id: config.id,
        updatedAt: now,
      };
      servers[index] = savedConfig;
    } else {
      // ID provided but not found, treat as new
      savedConfig = {
        ...config,
        id: config.id,
        createdAt: now,
        updatedAt: now,
      } as MCPServerConfig;
      servers.push(savedConfig);
    }
  } else {
    // Create new
    savedConfig = {
      ...config,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    } as MCPServerConfig;
    servers.push(savedConfig);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
  return savedConfig;
}

// Delete an MCP server
export function deleteMCPServer(id: string): boolean {
  const servers = getMCPServers();
  const filtered = servers.filter((s) => s.id !== id);

  if (filtered.length === servers.length) {
    return false; // Not found
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

// Export all servers to JSON
export function exportMCPConfig(): MCPExportConfig {
  const servers = getMCPServers();
  return {
    version: EXPORT_VERSION,
    servers,
    exportedAt: Date.now(),
  };
}

// Export as downloadable JSON file
export function downloadMCPConfig(): void {
  const config = exportMCPConfig();
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `mcp-config-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import servers from JSON
export function importMCPConfig(
  jsonString: string,
  options?: { merge?: boolean }
): { imported: number; errors: string[] } {
  const errors: string[] = [];
  let imported = 0;

  try {
    const config = JSON.parse(jsonString) as MCPExportConfig;

    // Validate structure
    if (!config.version || !Array.isArray(config.servers)) {
      throw new Error('Invalid config format');
    }

    const existingServers = options?.merge ? getMCPServers() : [];
    const existingIds = new Set(existingServers.map((s) => s.id));
    const now = Date.now();

    const newServers: MCPServerConfig[] = [...existingServers];

    for (const server of config.servers) {
      try {
        // Validate required fields
        if (!server.name || !server.transportType) {
          errors.push(`Invalid server config: ${JSON.stringify(server).slice(0, 50)}...`);
          continue;
        }

        // Validate transport-specific fields
        if (server.transportType === 'stdio' && !server.command) {
          errors.push(`STDIO server "${server.name}" missing command`);
          continue;
        }

        if (
          (server.transportType === 'streamable-http' || server.transportType === 'sse') &&
          !server.url
        ) {
          errors.push(`HTTP/SSE server "${server.name}" missing URL`);
          continue;
        }

        // Generate new ID if merging and ID exists
        let id = server.id || generateId();
        if (options?.merge && existingIds.has(id)) {
          id = generateId();
        }

        const newServer: MCPServerConfig = {
          ...server,
          id,
          createdAt: server.createdAt || now,
          updatedAt: now,
        };

        if (options?.merge) {
          newServers.push(newServer);
        } else {
          newServers.push(newServer);
        }
        existingIds.add(id);
        imported++;
      } catch (e) {
        errors.push(`Failed to import server: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newServers));
  } catch (e) {
    errors.push(`Failed to parse config: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }

  return { imported, errors };
}

// Import from file
export async function importMCPConfigFromFile(
  file: File,
  options?: { merge?: boolean }
): Promise<{ imported: number; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(importMCPConfig(content, options));
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Generate unique ID
function generateId(): string {
  return `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
