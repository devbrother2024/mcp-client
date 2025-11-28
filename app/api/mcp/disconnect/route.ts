import { NextRequest, NextResponse } from 'next/server';
import { getMCPClientManager } from '@/lib/mcp-client';
import type { DisconnectRequest, MCPApiResponse, MCPConnectionStatus } from '@/lib/mcp-types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DisconnectRequest;

    if (!body.serverId) {
      return NextResponse.json<MCPApiResponse<null>>(
        { success: false, error: 'Server ID is required' },
        { status: 400 }
      );
    }

    const manager = getMCPClientManager();
    const status = await manager.disconnect(body.serverId);

    return NextResponse.json<MCPApiResponse<MCPConnectionStatus>>({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('MCP disconnect error:', error);
    return NextResponse.json<MCPApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
