'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Loader2, FileText, Eye } from 'lucide-react';
import { useMCP } from '@/contexts/mcp-context';
import type { MCPResource, ResourceContent } from '@/lib/mcp-types';

interface MCPResourcesPanelProps {
  serverId: string;
}

export function MCPResourcesPanel({ serverId }: MCPResourcesPanelProps) {
  const { listResources, readResource, isConnected } = useMCP();
  const [resources, setResources] = useState<MCPResource[]>([]);
  const [selectedResource, setSelectedResource] = useState<MCPResource | null>(null);
  const [content, setContent] = useState<ResourceContent[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    if (!isConnected(serverId)) return;

    setIsLoading(true);
    setError(null);
    try {
      const fetchedResources = await listResources(serverId);
      setResources(fetchedResources);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch resources');
    } finally {
      setIsLoading(false);
    }
  }, [serverId, listResources, isConnected]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleSelectResource = (resource: MCPResource) => {
    setSelectedResource(resource);
    setContent(null);
    setError(null);
  };

  const handleRead = async () => {
    if (!selectedResource) return;

    setIsReading(true);
    setError(null);
    setContent(null);

    try {
      const res = await readResource(serverId, selectedResource.uri);
      setContent(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read resource');
    } finally {
      setIsReading(false);
    }
  };

  if (!isConnected(serverId)) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
        <FileText className="mb-2 h-8 w-8 opacity-50" />
        <p>서버에 연결되어 있지 않습니다</p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Resources List */}
      <div className="w-1/3 min-w-[200px]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">리소스 목록</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchResources} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : resources.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">등록된 리소스가 없습니다</p>
          ) : (
            <div className="space-y-1">
              {resources.map((resource) => (
                <div
                  key={resource.uri}
                  className={`cursor-pointer rounded-md p-2 transition-colors hover:bg-accent ${
                    selectedResource?.uri === resource.uri ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleSelectResource(resource)}
                >
                  <p className="text-sm font-medium">{resource.name || resource.uri}</p>
                  <p className="text-muted-foreground truncate text-xs" title={resource.uri}>
                    {resource.uri}
                  </p>
                  {resource.mimeType && (
                    <span className="bg-muted mt-1 inline-block rounded px-1 text-xs">
                      {resource.mimeType}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Resource Content */}
      <div className="flex-1">
        {selectedResource ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{selectedResource.name || selectedResource.uri}</CardTitle>
              <p className="text-muted-foreground break-all text-sm">{selectedResource.uri}</p>
              {selectedResource.description && (
                <p className="text-muted-foreground text-sm">{selectedResource.description}</p>
              )}
              {selectedResource.mimeType && (
                <span className="bg-muted mt-1 inline-block rounded px-2 py-0.5 text-xs">
                  {selectedResource.mimeType}
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleRead} disabled={isReading} className="w-full">
                {isReading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    읽는 중...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    리소스 읽기
                  </>
                )}
              </Button>

              {/* Error */}
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">{error}</div>
              )}

              {/* Content */}
              {content && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">리소스 내용</h4>
                  {content.map((item, idx) => (
                    <div key={idx} className="bg-muted rounded-md p-3">
                      {item.mimeType && (
                        <span className="text-muted-foreground mb-1 block text-xs">{item.mimeType}</span>
                      )}
                      {item.text ? (
                        <pre className="overflow-x-auto whitespace-pre-wrap text-sm">{item.text}</pre>
                      ) : item.blob ? (
                        <p className="text-muted-foreground text-sm">
                          [Binary data: {item.blob.length} bytes]
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-sm">[Empty content]</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
            <FileText className="mb-2 h-8 w-8 opacity-50" />
            <p>리소스를 선택하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
