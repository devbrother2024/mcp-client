import { NextRequest, NextResponse } from 'next/server';
import { getMCPClientManager } from '@/lib/mcp-client';
import type { ListRequest, MCPApiResponse, MCPTool } from '@/lib/mcp-types';

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
    const tools = await manager.listTools(body.serverId);

    return NextResponse.json<MCPApiResponse<MCPTool[]>>({
      success: true,
      data: tools,
    });
  } catch (error) {
    console.error('MCP list tools error:', error);
    return NextResponse.json<MCPApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list tools' },
      { status: 500 }
    );
  }
}
