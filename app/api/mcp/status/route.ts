import { NextRequest, NextResponse } from 'next/server';
import { getMCPClientManager } from '@/lib/mcp-client';
import type { MCPApiResponse, MCPConnectionStatus } from '@/lib/mcp-types';

// Get all connection statuses
export async function GET() {
  try {
    const manager = getMCPClientManager();
    const statuses = manager.getAllConnectionStatuses();

    return NextResponse.json<MCPApiResponse<MCPConnectionStatus[]>>({
      success: true,
      data: statuses,
    });
  } catch (error) {
    console.error('MCP status error:', error);
    return NextResponse.json<MCPApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}

// Get status for a specific server
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { serverId: string };

    if (!body.serverId) {
      return NextResponse.json<MCPApiResponse<null>>(
        { success: false, error: 'Server ID is required' },
        { status: 400 }
      );
    }

    const manager = getMCPClientManager();
    const status = manager.getConnectionStatus(body.serverId);

    return NextResponse.json<MCPApiResponse<MCPConnectionStatus>>({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('MCP status error:', error);
    return NextResponse.json<MCPApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}
