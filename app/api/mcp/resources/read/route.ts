import { NextRequest, NextResponse } from 'next/server';
import { getMCPClientManager } from '@/lib/mcp-client';
import type { ReadResourceRequest, MCPApiResponse, ResourceContent } from '@/lib/mcp-types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReadResourceRequest;

    if (!body.serverId) {
      return NextResponse.json<MCPApiResponse<null>>(
        { success: false, error: 'Server ID is required' },
        { status: 400 }
      );
    }

    if (!body.uri) {
      return NextResponse.json<MCPApiResponse<null>>(
        { success: false, error: 'Resource URI is required' },
        { status: 400 }
      );
    }

    const manager = getMCPClientManager();
    const contents = await manager.readResource(body.serverId, body.uri);

    return NextResponse.json<MCPApiResponse<ResourceContent[]>>({
      success: true,
      data: contents,
    });
  } catch (error) {
    console.error('MCP read resource error:', error);
    return NextResponse.json<MCPApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : 'Failed to read resource' },
      { status: 500 }
    );
  }
}
