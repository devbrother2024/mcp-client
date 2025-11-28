'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import type { MCPServerConfig, TransportType } from '@/lib/mcp-types';

interface MCPServerFormProps {
  initialData?: MCPServerConfig;
  onSubmit: (data: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'> | MCPServerConfig) => void;
  onCancel?: () => void;
}

export function MCPServerForm({ initialData, onSubmit, onCancel }: MCPServerFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [transportType, setTransportType] = useState<TransportType>(initialData?.transportType || 'stdio');
  const [command, setCommand] = useState(initialData?.command || '');
  const [args, setArgs] = useState<string[]>(initialData?.args || []);
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>(
    initialData?.env ? Object.entries(initialData.env).map(([key, value]) => ({ key, value })) : []
  );
  const [url, setUrl] = useState(initialData?.url || '');

  const handleAddArg = () => {
    setArgs([...args, '']);
  };

  const handleRemoveArg = (index: number) => {
    setArgs(args.filter((_, i) => i !== index));
  };

  const handleArgChange = (index: number, value: string) => {
    const newArgs = [...args];
    newArgs[index] = value;
    setArgs(newArgs);
  };

  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleRemoveEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleEnvVarChange = (index: number, field: 'key' | 'value', value: string) => {
    const newEnvVars = [...envVars];
    newEnvVars[index][field] = value;
    setEnvVars(newEnvVars);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const env: Record<string, string> = {};
    envVars.forEach(({ key, value }) => {
      if (key.trim()) {
        env[key.trim()] = value;
      }
    });

    const filteredArgs = args.filter((arg) => arg.trim() !== '');

    const data = {
      ...(initialData ? { id: initialData.id, createdAt: initialData.createdAt, updatedAt: Date.now() } : {}),
      name: name.trim(),
      transportType,
      ...(transportType === 'stdio'
        ? {
            command: command.trim(),
            args: filteredArgs.length > 0 ? filteredArgs : undefined,
            env: Object.keys(env).length > 0 ? env : undefined,
          }
        : {
            url: url.trim(),
          }),
    };

    onSubmit(data as MCPServerConfig);
  };

  const isValid =
    name.trim() &&
    (transportType === 'stdio' ? command.trim() : url.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? '서버 수정' : '새 MCP 서버 등록'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Server Name */}
          <div>
            <label className="text-sm font-medium">서버 이름</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: My MCP Server"
              className="mt-1"
            />
          </div>

          {/* Transport Type */}
          <div>
            <label className="text-sm font-medium">Transport 타입</label>
            <div className="mt-1 flex gap-2">
              {(['stdio', 'streamable-http', 'sse'] as TransportType[]).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={transportType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTransportType(type)}
                >
                  {type === 'stdio' ? 'STDIO' : type === 'streamable-http' ? 'HTTP' : 'SSE'}
                </Button>
              ))}
            </div>
          </div>

          {/* STDIO Options */}
          {transportType === 'stdio' && (
            <>
              <div>
                <label className="text-sm font-medium">Command</label>
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="예: npx, node, python"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Arguments</label>
                <div className="mt-1 space-y-2">
                  {args.map((arg, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={arg}
                        onChange={(e) => handleArgChange(index, e.target.value)}
                        placeholder={`Argument ${index + 1}`}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveArg(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={handleAddArg}>
                    <Plus className="mr-1 h-4 w-4" />
                    Argument 추가
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">환경 변수</label>
                <div className="mt-1 space-y-2">
                  {envVars.map((envVar, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={envVar.key}
                        onChange={(e) => handleEnvVarChange(index, 'key', e.target.value)}
                        placeholder="KEY"
                        className="flex-1"
                      />
                      <Input
                        value={envVar.value}
                        onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
                        placeholder="value"
                        className="flex-1"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveEnvVar(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={handleAddEnvVar}>
                    <Plus className="mr-1 h-4 w-4" />
                    환경 변수 추가
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* HTTP/SSE URL */}
          {(transportType === 'streamable-http' || transportType === 'sse') && (
            <div>
              <label className="text-sm font-medium">URL</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="예: http://localhost:3000/mcp"
                className="mt-1"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                취소
              </Button>
            )}
            <Button type="submit" disabled={!isValid}>
              {initialData ? '수정' : '등록'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
