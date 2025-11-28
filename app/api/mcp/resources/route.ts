import { NextRequest, NextResponse } from 'next/server';
import { getMCPClientManager } from '@/lib/mcp-client';
import type { ListRequest, MCPApiResponse, MCPResource } from '@/lib/mcp-types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ListRequest;

    if (!body.serverId) {
      return NextResponse.json<MCPApiResponse<null>>(
        { success: false, error: 'Server ID is required' },
        { status: 400 }
      );
    }

    const manager = getMCPClientManager();
    const resources = await manager.listResources(body.serverId);

    return NextResponse.json<MCPApiResponse<MCPResource[]>>({
      success: true,
      data: resources,
    });
  } catch (error) {
    console.error('MCP list resources error:', error);
    return NextResponse.json<MCPApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list resources',
      },
      { status: 500 }
    );
  }
}
