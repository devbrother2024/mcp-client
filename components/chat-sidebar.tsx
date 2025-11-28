'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatRoom } from '@/lib/chat-storage';
import { Menu, Plus, Trash2, Settings2, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMCP } from '@/contexts/mcp-context';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  rooms: ChatRoom[];
  currentRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  onDeleteRoom: (roomId: string) => void;
}

export function ChatSidebar({
  isOpen,
  onToggle,
  rooms,
  currentRoomId,
  onSelectRoom,
  onCreateRoom,
  onDeleteRoom,
}: ChatSidebarProps) {
  const { connectionStatus } = useMCP();

  // Count connected MCP servers
  const connectedServersCount = Array.from(connectionStatus.values()).filter(
    (s) => s.connected
  ).length;

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return '어제';
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const handleDelete = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    if (confirm('이 채팅방을 삭제하시겠습니까?')) {
      onDeleteRoom(roomId);
    }
  };

  return (
    <>
      {/* Toggle Button - When sidebar is closed (mobile) */}
      {!isOpen && (
        <Button
          variant="glass"
          size="icon"
          onClick={onToggle}
          className="fixed top-4 left-4 z-50 lg:hidden"
          aria-label="사이드바 열기"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-out',
          // Glassmorphism background
          'bg-[oklch(0.1_0.008_260_/_0.9)] backdrop-blur-2xl',
          // Border
          'border-r border-[oklch(0.25_0.02_260_/_0.4)]',
          isOpen
            ? 'w-72 translate-x-0'
            : '-translate-x-full lg:w-16 lg:translate-x-0 lg:overflow-hidden'
        )}
      >
        {/* Gradient accent line */}
        <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-[oklch(0.65_0.25_280_/_0.5)] via-transparent to-[oklch(0.75_0.18_195_/_0.5)]" />

        <div className="flex h-full flex-col">
          {/* Header */}
          {isOpen ? (
            <div className="flex items-center justify-between border-b border-[oklch(0.25_0.02_260_/_0.4)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.65_0.25_280)] to-[oklch(0.75_0.18_195)]">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold tracking-tight">채팅 히스토리</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggle}
                className="hover:text-foreground text-[oklch(0.6_0.02_260)]"
                aria-label="사이드바 닫기"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center border-b border-[oklch(0.25_0.02_260_/_0.4)] p-3 lg:flex">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="hover:text-foreground w-full text-[oklch(0.6_0.02_260)]"
                aria-label="사이드바 열기"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* New Chat & MCP Button */}
          {isOpen && (
            <div className="space-y-2 border-b border-[oklch(0.25_0.02_260_/_0.4)] px-4 py-4">
              <Button onClick={onCreateRoom} className="w-full" variant="default">
                <Plus className="mr-2 h-4 w-4" />새 채팅
              </Button>
              <Link href="/mcp" className="block">
                <Button variant="outline" className="relative w-full">
                  <Settings2 className="mr-2 h-4 w-4" />
                  MCP 서버
                  {connectedServersCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.7_0.2_145)] to-[oklch(0.6_0.18_160)] text-[10px] font-semibold text-white shadow-lg shadow-[oklch(0.7_0.2_145_/_0.3)]">
                      {connectedServersCount}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          )}

          {/* Chat Rooms List */}
          {isOpen && (
            <ScrollArea className="flex-1">
              <div className="space-y-1 p-3">
                {rooms.length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[oklch(0.2_0.01_260)]">
                      <MessageSquare className="h-6 w-6 text-[oklch(0.5_0.02_260)]" />
                    </div>
                    <p className="text-sm text-[oklch(0.5_0.02_260)]">채팅방이 없습니다</p>
                    <p className="mt-1 text-xs text-[oklch(0.4_0.02_260)]">
                      새 채팅을 시작해보세요
                    </p>
                  </div>
                ) : (
                  rooms.map((room) => (
                    <div
                      key={room.id}
                      className={cn(
                        'group relative flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-all duration-200',
                        currentRoomId === room.id
                          ? 'border border-[oklch(0.5_0.15_280_/_0.3)] bg-gradient-to-r from-[oklch(0.65_0.25_280_/_0.2)] to-[oklch(0.6_0.22_300_/_0.15)]'
                          : 'border border-transparent hover:bg-[oklch(0.2_0.01_260_/_0.5)]'
                      )}
                      onClick={() => onSelectRoom(room.id)}
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all',
                          currentRoomId === room.id
                            ? 'bg-gradient-to-br from-[oklch(0.65_0.25_280)] to-[oklch(0.75_0.18_195)]'
                            : 'bg-[oklch(0.2_0.01_260)]'
                        )}
                      >
                        <MessageSquare
                          className={cn(
                            'h-4 w-4',
                            currentRoomId === room.id ? 'text-white' : 'text-[oklch(0.55_0.02_260)]'
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'truncate text-sm font-medium',
                            currentRoomId === room.id
                              ? 'text-foreground'
                              : 'text-[oklch(0.8_0.01_260)]'
                          )}
                        >
                          {room.title}
                        </p>
                        <p
                          className={cn(
                            'mt-0.5 text-xs',
                            currentRoomId === room.id
                              ? 'text-[oklch(0.6_0.1_280)]'
                              : 'text-[oklch(0.45_0.02_260)]'
                          )}
                        >
                          {formatDate(room.updatedAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className={cn(
                          'h-7 w-7 shrink-0 opacity-0 transition-all group-hover:opacity-100',
                          'text-[oklch(0.5_0.02_260)] hover:bg-[oklch(0.3_0.05_25_/_0.2)] hover:text-[oklch(0.7_0.2_25)]'
                        )}
                        onClick={(e) => handleDelete(e, room.id)}
                        aria-label="채팅방 삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}

          {/* Footer */}
          {isOpen && (
            <div className="border-t border-[oklch(0.25_0.02_260_/_0.4)] px-4 py-3">
              <p className="text-center text-[10px] text-[oklch(0.4_0.02_260)]">
                Powered by MCP Protocol
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-[oklch(0_0_0_/_0.6)] backdrop-blur-sm lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
}
