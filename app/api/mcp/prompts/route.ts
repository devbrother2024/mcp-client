import { NextRequest, NextResponse } from 'next/server';
import { getMCPClientManager } from '@/lib/mcp-client';
import type { ListRequest, MCPApiResponse, MCPPrompt } from '@/lib/mcp-types';

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
    const prompts = await manager.listPrompts(body.serverId);

    return NextResponse.json<MCPApiResponse<MCPPrompt[]>>({
      success: true,
      data: prompts,
    });
  } catch (error) {
    console.error('MCP list prompts error:', error);
    return NextResponse.json<MCPApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list prompts' },
      { status: 500 }
    );
  }
}
