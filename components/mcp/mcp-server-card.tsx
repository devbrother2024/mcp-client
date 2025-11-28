'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Power, PowerOff, Settings, Trash2, Loader2 } from 'lucide-react';
import type { MCPServerConfig, MCPConnectionStatus } from '@/lib/mcp-types';
import { cn } from '@/lib/utils';

interface MCPServerCardProps {
  server: MCPServerConfig;
  status?: MCPConnectionStatus;
  isConnecting?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
  isSelected?: boolean;
}

export function MCPServerCard({
  server,
  status,
  isConnecting,
  onConnect,
  onDisconnect,
  onEdit,
  onDelete,
  onSelect,
  isSelected,
}: MCPServerCardProps) {
  const isConnected = status?.connected ?? false;

  const getTransportLabel = () => {
    switch (server.transportType) {
      case 'stdio':
        return 'STDIO';
      case 'streamable-http':
        return 'HTTP';
      case 'sse':
        return 'SSE';
      default:
        return server.transportType;
    }
  };

  const getConnectionInfo = () => {
    if (server.transportType === 'stdio') {
      return `${server.command}${server.args?.length ? ` ${server.args.join(' ')}` : ''}`;
    }
    return server.url;
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-primary ring-2',
        isConnected && 'border-green-500/50'
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-gray-300'
              )}
            />
            <CardTitle className="text-base">{server.name}</CardTitle>
          </div>
          <span className="bg-muted rounded px-2 py-0.5 text-xs font-medium">{getTransportLabel()}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground truncate text-xs" title={getConnectionInfo()}>
          {getConnectionInfo()}
        </p>

        {status?.error && (
          <p className="text-destructive text-xs">
            오류: {status.error}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="설정"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="삭제"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant={isConnected ? 'destructive' : 'default'}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (isConnected) {
                onDisconnect();
              } else {
                onConnect();
              }
            }}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                연결 중...
              </>
            ) : isConnected ? (
              <>
                <PowerOff className="mr-1 h-4 w-4" />
                연결 해제
              </>
            ) : (
              <>
                <Power className="mr-1 h-4 w-4" />
                연결
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
