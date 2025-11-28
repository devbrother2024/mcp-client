import { NextRequest, NextResponse } from 'next/server';
import { getMCPClientManager } from '@/lib/mcp-client';
import type { ConnectRequest, MCPApiResponse, MCPConnectionStatus } from '@/lib/mcp-types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ConnectRequest;

    if (!body.config) {
      return NextResponse.json<MCPApiResponse<null>>(
        { success: false, error: 'Server config is required' },
        { status: 400 }
      );
    }

    const { config } = body;

    // Validate config
    if (!config.name || !config.transportType) {
      return NextResponse.json<MCPApiResponse<null>>(
        { success: false, error: 'Invalid server config: name and transportType are required' },
        { status: 400 }
      );
    }

    if (config.transportType === 'stdio' && !config.command) {
      return NextResponse.json<MCPApiResponse<null>>(
        { success: false, error: 'Command is required for STDIO transport' },
        { status: 400 }
      );
    }

    if (
      (config.transportType === 'streamable-http' || config.transportType === 'sse') &&
      !config.url
    ) {
      return NextResponse.json<MCPApiResponse<null>>(
        { success: false, error: 'URL is required for HTTP/SSE transport' },
        { status: 400 }
      );
    }

    const manager = getMCPClientManager();
    const status = await manager.connect(config);

    if (!status.connected) {
      return NextResponse.json<MCPApiResponse<MCPConnectionStatus>>(
        { success: false, error: status.error || 'Failed to connect', data: status },
        { status: 500 }
      );
    }

    return NextResponse.json<MCPApiResponse<MCPConnectionStatus>>({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('MCP connect error:', error);
    return NextResponse.json<MCPApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : 'Failed to connect' },
      { status: 500 }
    );
  }
}
