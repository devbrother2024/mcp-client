'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatRoom } from '@/lib/chat-storage';
import { Menu, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
          variant="ghost"
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
          'bg-background fixed top-0 left-0 z-40 h-screen border-r transition-all duration-300 ease-in-out',
          isOpen
            ? 'w-64 translate-x-0'
            : '-translate-x-full lg:w-16 lg:translate-x-0 lg:overflow-hidden'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          {isOpen ? (
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-lg font-semibold whitespace-nowrap">채팅 히스토리</h2>
              <Button variant="ghost" size="icon" onClick={onToggle} aria-label="사이드바 닫기">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center border-b p-3 lg:flex">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="w-full"
                aria-label="사이드바 열기"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* New Chat Button */}
          {isOpen && (
            <div className="border-b px-4 py-3">
              <Button onClick={onCreateRoom} className="w-full" variant="default">
                <Plus className="mr-2 h-4 w-4" />새 채팅
              </Button>
            </div>
          )}

          {/* Chat Rooms List */}
          {isOpen && (
            <ScrollArea className="flex-1">
              <div className="space-y-1 p-2">
                {rooms.length === 0 ? (
                  <div className="text-muted-foreground px-4 py-8 text-center">
                    <p className="text-sm">채팅방이 없습니다</p>
                    <p className="mt-1 text-xs">새 채팅을 시작해보세요</p>
                  </div>
                ) : (
                  rooms.map((room) => (
                    <div
                      key={room.id}
                      className={cn(
                        'group relative flex cursor-pointer items-center gap-2 rounded-lg p-3 transition-colors',
                        currentRoomId === room.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      )}
                      onClick={() => onSelectRoom(room.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'truncate text-sm font-medium',
                            currentRoomId === room.id ? 'text-primary-foreground' : ''
                          )}
                        >
                          {room.title}
                        </p>
                        <p
                          className={cn(
                            'mt-0.5 text-xs',
                            currentRoomId === room.id
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          )}
                        >
                          {formatDate(room.updatedAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100',
                          currentRoomId === room.id ? 'hover:bg-primary-foreground/20' : ''
                        )}
                        onClick={(e) => handleDelete(e, room.id)}
                        aria-label="채팅방 삭제"
                      >
                        <Trash2
                          className={cn(
                            'h-4 w-4',
                            currentRoomId === room.id
                              ? 'text-primary-foreground'
                              : 'text-muted-foreground'
                          )}
                        />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
}
