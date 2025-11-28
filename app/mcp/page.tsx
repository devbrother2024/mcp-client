'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Settings,
  ArrowLeft,
  Wrench,
  MessageSquare,
  FileText,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useMCP } from '@/contexts/mcp-context';
import {
  MCPServerForm,
  MCPServerCard,
  MCPToolsPanel,
  MCPPromptsPanel,
  MCPResourcesPanel,
  MCPConfigDialog,
} from '@/components/mcp';
import type { MCPServerConfig } from '@/lib/mcp-types';
import { cn } from '@/lib/utils';

type TabType = 'tools' | 'prompts' | 'resources';

export default function MCPPage() {
  const {
    servers,
    connectionStatus,
    addServer,
    updateServer,
    removeServer,
    connect,
    disconnect,
  } = useMCP();

  const [showForm, setShowForm] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServerConfig | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('tools');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [connectingServerId, setConnectingServerId] = useState<string | null>(null);

  const selectedServer = servers.find((s) => s.id === selectedServerId);
  const selectedServerStatus = selectedServerId ? connectionStatus.get(selectedServerId) : null;

  const handleAddServer = (
    data: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    addServer(data);
    setShowForm(false);
  };

  const handleUpdateServer = (data: MCPServerConfig) => {
    updateServer(data);
    setEditingServer(null);
  };

  const handleDeleteServer = (serverId: string) => {
    if (confirm('이 서버를 삭제하시겠습니까?')) {
      removeServer(serverId);
      if (selectedServerId === serverId) {
        setSelectedServerId(null);
      }
    }
  };

  const handleConnect = async (serverId: string) => {
    setConnectingServerId(serverId);
    try {
      await connect(serverId);
    } finally {
      setConnectingServerId(null);
    }
  };

  const handleDisconnect = async (serverId: string) => {
    setConnectingServerId(serverId);
    try {
      await disconnect(serverId);
    } finally {
      setConnectingServerId(null);
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'tools', label: 'Tools', icon: <Wrench className="h-4 w-4" /> },
    { id: 'prompts', label: 'Prompts', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'resources', label: 'Resources', icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="bg-background flex h-screen">
      {/* Left Panel - Server List */}
      <div className="flex w-80 flex-col border-r">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">MCP 서버</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowConfigDialog(true)} title="설정">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4">
          <Button onClick={() => setShowForm(true)} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            새 서버 등록
          </Button>
        </div>

        <ScrollArea className="flex-1 px-4 pb-4">
          {servers.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">등록된 서버가 없습니다</p>
              <p className="mt-1 text-xs">새 서버를 등록해주세요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {servers.map((server) => (
                <MCPServerCard
                  key={server.id}
                  server={server}
                  status={connectionStatus.get(server.id)}
                  isConnecting={connectingServerId === server.id}
                  onConnect={() => handleConnect(server.id)}
                  onDisconnect={() => handleDisconnect(server.id)}
                  onEdit={() => setEditingServer(server)}
                  onDelete={() => handleDeleteServer(server.id)}
                  onSelect={() => setSelectedServerId(server.id)}
                  isSelected={selectedServerId === server.id}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Panel - Server Details */}
      <div className="flex flex-1 flex-col">
        {showForm || editingServer ? (
          <div className="flex flex-1 items-start justify-center overflow-auto p-6">
            <div className="w-full max-w-lg">
              <MCPServerForm
                initialData={editingServer || undefined}
                onSubmit={(data) => {
                  if (editingServer) {
                    handleUpdateServer(data as MCPServerConfig);
                  } else {
                    handleAddServer(data);
                  }
                }}
                onCancel={() => {
                  setShowForm(false);
                  setEditingServer(null);
                }}
              />
            </div>
          </div>
        ) : selectedServer ? (
          <>
            {/* Server Header */}
            <div className="border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{selectedServer.name}</h2>
                  <p className="text-muted-foreground text-sm">
                    {selectedServer.transportType === 'stdio'
                      ? `${selectedServer.command} ${selectedServer.args?.join(' ') || ''}`
                      : selectedServer.url}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm',
                      selectedServerStatus?.connected
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-gray-500/10 text-gray-500'
                    )}
                  >
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        selectedServerStatus?.connected ? 'bg-green-500' : 'bg-gray-400'
                      )}
                    />
                    {selectedServerStatus?.connected ? '연결됨' : '연결 안됨'}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto p-6">
              {!selectedServerStatus?.connected ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <AlertCircle className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                    <h3 className="mb-2 text-lg font-medium">서버에 연결되어 있지 않습니다</h3>
                    <p className="text-muted-foreground mb-4 text-sm">
                      서버에 연결한 후 {tabs.find((t) => t.id === activeTab)?.label}를 확인할 수 있습니다.
                    </p>
                    <Button
                      onClick={() => handleConnect(selectedServer.id)}
                      disabled={connectingServerId === selectedServer.id}
                    >
                      {connectingServerId === selectedServer.id ? '연결 중...' : '서버 연결'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {activeTab === 'tools' && <MCPToolsPanel serverId={selectedServer.id} />}
                  {activeTab === 'prompts' && <MCPPromptsPanel serverId={selectedServer.id} />}
                  {activeTab === 'resources' && <MCPResourcesPanel serverId={selectedServer.id} />}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center">
            <Settings className="mb-4 h-16 w-16 opacity-30" />
            <h2 className="mb-2 text-xl font-medium">MCP 서버 관리</h2>
            <p className="text-center text-sm">
              좌측에서 서버를 선택하거나
              <br />새 서버를 등록하세요
            </p>
          </div>
        )}
      </div>

      {/* Config Dialog */}
      {showConfigDialog && <MCPConfigDialog onClose={() => setShowConfigDialog(false)} />}
    </div>
  );
}
