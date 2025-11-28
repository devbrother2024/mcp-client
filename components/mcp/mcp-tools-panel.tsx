'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, RefreshCw, Loader2, Wrench } from 'lucide-react';
import { useMCP } from '@/contexts/mcp-context';
import type { MCPTool, ToolCallResult } from '@/lib/mcp-types';

interface MCPToolsPanelProps {
  serverId: string;
}

export function MCPToolsPanel({ serverId }: MCPToolsPanelProps) {
  const { listTools, callTool, isConnected } = useMCP();
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ToolCallResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTools = useCallback(async () => {
    if (!isConnected(serverId)) return;

    setIsLoading(true);
    setError(null);
    try {
      const fetchedTools = await listTools(serverId);
      setTools(fetchedTools);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch tools');
    } finally {
      setIsLoading(false);
    }
  }, [serverId, listTools, isConnected]);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const handleSelectTool = (tool: MCPTool) => {
    setSelectedTool(tool);
    setArgs({});
    setResult(null);
    setError(null);
  };

  const handleArgChange = (key: string, value: string) => {
    setArgs((prev) => ({ ...prev, [key]: value }));
  };

  const handleExecute = async () => {
    if (!selectedTool) return;

    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      // Parse args - try to JSON parse values that look like objects/arrays
      const parsedArgs: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(args)) {
        if (value.trim() === '') continue;
        try {
          parsedArgs[key] = JSON.parse(value);
        } catch {
          parsedArgs[key] = value;
        }
      }

      const res = await callTool(serverId, selectedTool.name, parsedArgs);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to execute tool');
    } finally {
      setIsExecuting(false);
    }
  };

  const getInputFields = (): Array<{
    name: string;
    type: string;
    description?: string;
    required?: boolean;
  }> => {
    if (!selectedTool?.inputSchema) return [];

    const schema = selectedTool.inputSchema as {
      properties?: Record<string, { type?: string; description?: string }>;
      required?: string[];
    };

    if (!schema.properties) return [];

    return Object.entries(schema.properties).map(([name, prop]) => ({
      name,
      type: prop.type || 'string',
      description: prop.description,
      required: schema.required?.includes(name),
    }));
  };

  if (!isConnected(serverId)) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
        <Wrench className="mb-2 h-8 w-8 opacity-50" />
        <p>서버에 연결되어 있지 않습니다</p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Tools List */}
      <div className="w-1/3 min-w-[200px]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">도구 목록</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={fetchTools}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : tools.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">등록된 도구가 없습니다</p>
          ) : (
            <div className="space-y-1">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className={`hover:bg-accent cursor-pointer rounded-md p-2 transition-colors ${
                    selectedTool?.name === tool.name ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleSelectTool(tool)}
                >
                  <p className="text-sm font-medium">{tool.name}</p>
                  {tool.description && (
                    <p className="text-muted-foreground line-clamp-2 text-xs">{tool.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Tool Execution */}
      <div className="flex-1">
        {selectedTool ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{selectedTool.name}</CardTitle>
              {selectedTool.description && (
                <p className="text-muted-foreground text-sm">{selectedTool.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input Fields */}
              {getInputFields().length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">입력 파라미터</h4>
                  {getInputFields().map((field) => (
                    <div key={field.name}>
                      <label className="text-sm">
                        {field.name}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                        <span className="text-muted-foreground ml-2 text-xs">({field.type})</span>
                      </label>
                      {field.description && (
                        <p className="text-muted-foreground mb-1 text-xs">{field.description}</p>
                      )}
                      <Input
                        value={args[field.name] || ''}
                        onChange={(e) => handleArgChange(field.name, e.target.value)}
                        placeholder={`${field.type} 값 입력`}
                        className="mt-1"
                      />
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={handleExecute} disabled={isExecuting} className="w-full">
                {isExecuting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    실행 중...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    실행
                  </>
                )}
              </Button>

              {/* Error */}
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                  {error}
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">실행 결과</h4>
                  <div
                    className={`rounded-md p-3 text-sm ${result.isError ? 'bg-destructive/10' : 'bg-muted'}`}
                  >
                    {result.content.map((item, idx) => (
                      <div key={idx} className="mb-2 last:mb-0">
                        {item.type === 'image' && item.data ? (
                          <div className="space-y-1">
                            <span className="text-muted-foreground text-xs">
                              [{item.mimeType || 'image'}]
                            </span>
                            <img
                              src={`data:${item.mimeType || 'image/png'};base64,${item.data}`}
                              alt="Tool result"
                              className="max-w-full rounded-md border"
                              style={{ maxHeight: '400px', objectFit: 'contain' }}
                            />
                          </div>
                        ) : item.type === 'text' && item.text ? (
                          <pre className="overflow-x-auto whitespace-pre-wrap">{item.text}</pre>
                        ) : (
                          <pre className="overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(item, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
            <Wrench className="mb-2 h-8 w-8 opacity-50" />
            <p>도구를 선택하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
