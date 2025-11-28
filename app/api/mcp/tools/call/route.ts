import { NextRequest, NextResponse } from 'next/server';
import { getMCPClientManager } from '@/lib/mcp-client';
import type { CallToolRequest, MCPApiResponse, ToolCallResult } from '@/lib/mcp-types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CallToolRequest;

    if (!body.serverId) {
      return NextResponse.json<MCPApiResponse<null>>(
        { success: false, error: 'Server ID is required' },
        { status: 400 }
      );
    }

    if (!body.toolName) {
      return NextResponse.json<MCPApiResponse<null>>(
        { success: false, error: 'Tool name is required' },
        { status: 400 }
      );
    }

    const manager = getMCPClientManager();
    const result = await manager.callTool(body.serverId, body.toolName, body.arguments);

    return NextResponse.json<MCPApiResponse<ToolCallResult>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('MCP call tool error:', error);
    return NextResponse.json<MCPApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : 'Failed to call tool' },
      { status: 500 }
    );
  }
}
