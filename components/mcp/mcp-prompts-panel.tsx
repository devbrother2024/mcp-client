'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, RefreshCw, Loader2, MessageSquare } from 'lucide-react';
import { useMCP } from '@/contexts/mcp-context';
import type { MCPPrompt, PromptResult } from '@/lib/mcp-types';

interface MCPPromptsPanelProps {
  serverId: string;
}

export function MCPPromptsPanel({ serverId }: MCPPromptsPanelProps) {
  const { listPrompts, getPrompt, isConnected } = useMCP();
  const [prompts, setPrompts] = useState<MCPPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<MCPPrompt | null>(null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PromptResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    if (!isConnected(serverId)) return;

    setIsLoading(true);
    setError(null);
    try {
      const fetchedPrompts = await listPrompts(serverId);
      setPrompts(fetchedPrompts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch prompts');
    } finally {
      setIsLoading(false);
    }
  }, [serverId, listPrompts, isConnected]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const handleSelectPrompt = (prompt: MCPPrompt) => {
    setSelectedPrompt(prompt);
    setArgs({});
    setResult(null);
    setError(null);
  };

  const handleArgChange = (key: string, value: string) => {
    setArgs((prev) => ({ ...prev, [key]: value }));
  };

  const handleExecute = async () => {
    if (!selectedPrompt) return;

    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      const res = await getPrompt(serverId, selectedPrompt.name, args);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get prompt');
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isConnected(serverId)) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
        <MessageSquare className="mb-2 h-8 w-8 opacity-50" />
        <p>서버에 연결되어 있지 않습니다</p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Prompts List */}
      <div className="w-1/3 min-w-[200px]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">프롬프트 목록</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchPrompts} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : prompts.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">등록된 프롬프트가 없습니다</p>
          ) : (
            <div className="space-y-1">
              {prompts.map((prompt) => (
                <div
                  key={prompt.name}
                  className={`cursor-pointer rounded-md p-2 transition-colors hover:bg-accent ${
                    selectedPrompt?.name === prompt.name ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleSelectPrompt(prompt)}
                >
                  <p className="text-sm font-medium">{prompt.name}</p>
                  {prompt.description && (
                    <p className="text-muted-foreground line-clamp-2 text-xs">{prompt.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Prompt Execution */}
      <div className="flex-1">
        {selectedPrompt ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{selectedPrompt.name}</CardTitle>
              {selectedPrompt.description && (
                <p className="text-muted-foreground text-sm">{selectedPrompt.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Arguments */}
              {selectedPrompt.arguments && selectedPrompt.arguments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">입력 파라미터</h4>
                  {selectedPrompt.arguments.map((arg) => (
                    <div key={arg.name}>
                      <label className="text-sm">
                        {arg.name}
                        {arg.required && <span className="text-destructive ml-1">*</span>}
                      </label>
                      {arg.description && (
                        <p className="text-muted-foreground mb-1 text-xs">{arg.description}</p>
                      )}
                      <Input
                        value={args[arg.name] || ''}
                        onChange={(e) => handleArgChange(arg.name, e.target.value)}
                        placeholder={`값 입력`}
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
                    프롬프트 가져오기
                  </>
                )}
              </Button>

              {/* Error */}
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">{error}</div>
              )}

              {/* Result */}
              {result && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">프롬프트 결과</h4>
                  {result.description && (
                    <p className="text-muted-foreground text-sm">{result.description}</p>
                  )}
                  <div className="space-y-2">
                    {result.messages.map((msg, idx) => (
                      <div key={idx} className="bg-muted rounded-md p-3">
                        <span className="text-xs font-medium uppercase">{msg.role}</span>
                        <p className="mt-1 whitespace-pre-wrap text-sm">{msg.content.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
            <MessageSquare className="mb-2 h-8 w-8 opacity-50" />
            <p>프롬프트를 선택하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
