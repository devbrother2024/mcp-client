'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Copy, Check, Sparkles, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ChatSidebar } from '@/components/chat-sidebar';
import {
  Message,
  ChatRoom,
  getChatRooms,
  getChatRoom,
  createChatRoom,
  updateChatRoom,
  deleteChatRoom,
} from '@/lib/chat-storage';
import { cn } from '@/lib/utils';

// Code block component with copy button
function CodeBlock({
  children,
  codeClassName,
  ...props
}: {
  children?: React.ReactNode;
  codeClassName?: string;
  [key: string]: unknown;
}) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  // Extract language from className (handles both "language-xxx" and "hljs language-xxx")
  const languageMatch = codeClassName?.match(/language-(\w+)/);
  const language = languageMatch ? languageMatch[1] : '';

  const handleCopy = async () => {
    if (codeRef.current) {
      // Get text content, which will exclude HTML tags added by highlight.js
      const text = codeRef.current.textContent || '';
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <div className="group relative my-3">
      <div className="relative overflow-hidden rounded-xl border border-[oklch(0.25_0.02_260_/_0.5)] bg-[oklch(0.1_0.01_260)]">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-[oklch(0.25_0.02_260_/_0.5)] bg-[oklch(0.12_0.01_260)] px-4 py-2">
          {language && (
            <span className="text-xs font-medium text-[oklch(0.6_0.02_260)]">{language}</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-[oklch(0.6_0.02_260)] hover:text-foreground"
            onClick={handleCopy}
            title="코드 복사"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[oklch(0.75_0.18_145)]" />
                <span>복사됨</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>복사</span>
              </>
            )}
          </Button>
        </div>
        <pre {...props} className="overflow-x-auto p-4">
          <code ref={codeRef} className={codeClassName}>
            {children}
          </code>
        </pre>
      </div>
    </div>
  );
}

export default function Home() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load rooms on mount
  useEffect(() => {
    const initializeRooms = async () => {
      try {
        const loadedRooms = await getChatRooms();
        setRooms(loadedRooms);

        // Load first room if exists, otherwise create new one
        if (loadedRooms.length > 0) {
          setCurrentRoomId(loadedRooms[0].id);
          setMessages(loadedRooms[0].messages);
        } else {
          const newRoom = await createChatRoom();
          setRooms([newRoom]);
          setCurrentRoomId(newRoom.id);
          setMessages([]);
        }
      } catch (e) {
        console.error('Failed to initialize rooms:', e);
        setError('채팅방을 불러오는데 실패했습니다.');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeRooms();
  }, []);

  // Load messages when current room changes
  const loadRoomMessages = useCallback(async (roomId: string) => {
    const room = await getChatRoom(roomId);
    if (room) {
      setMessages(room.messages);
    } else {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (currentRoomId && !isInitializing) {
      loadRoomMessages(currentRoomId);
    }
  }, [currentRoomId, isInitializing, loadRoomMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    // Read value directly from DOM for browser automation compatibility
    const inputValue = inputRef.current?.value || input;
    if (!inputValue.trim() || isLoading || !currentRoomId) return;

    const userMessage: Message = {
      role: 'user',
      parts: [{ text: inputValue.trim() }],
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    if (inputRef.current) inputRef.current.value = '';
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue.trim(),
          history: newMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      // Create assistant message placeholder
      const assistantMessage: Message = {
        role: 'model',
        parts: [{ text: '' }],
      };
      const messagesWithAssistant = [...newMessages, assistantMessage];
      setMessages(messagesWithAssistant);

      // Stream the response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;

        // Update the assistant message with accumulated text
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'model',
            parts: [{ text: assistantText }],
          };
          return updated;
        });
      }

      // Save to database after streaming is complete
      const finalMessages: Message[] = [
        ...newMessages,
        { role: 'model', parts: [{ text: assistantText }] },
      ];
      await updateChatRoom(currentRoomId, finalMessages);

      // Refresh rooms list to update title and order
      const updatedRooms = await getChatRooms();
      setRooms(updatedRooms);
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Remove the assistant message placeholder on error
      setMessages(newMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreateRoom = async () => {
    const newRoom = await createChatRoom();
    const updatedRooms = await getChatRooms();
    setRooms(updatedRooms);
    setCurrentRoomId(newRoom.id);
    setMessages([]);
    setError(null);
  };

  const handleSelectRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
    setError(null);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    await deleteChatRoom(roomId);
    const updatedRooms = await getChatRooms();
    setRooms(updatedRooms);

    // If deleted room was current, switch to another or create new
    if (currentRoomId === roomId) {
      if (updatedRooms.length > 0) {
        setCurrentRoomId(updatedRooms[0].id);
        setMessages(updatedRooms[0].messages);
      } else {
        const newRoom = await createChatRoom();
        setRooms([newRoom]);
        setCurrentRoomId(newRoom.id);
        setMessages([]);
      }
    }
  };

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-background">
        {/* Background gradient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[oklch(0.65_0.25_280_/_0.15)] blur-[100px]" />
          <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[oklch(0.75_0.18_195_/_0.15)] blur-[100px]" />
        </div>
        <div className="relative z-10 text-center">
          <div className="relative mx-auto mb-6 h-12 w-12">
            <div className="absolute inset-0 animate-ping rounded-full bg-[oklch(0.65_0.25_280_/_0.3)]" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.65_0.25_280)] to-[oklch(0.75_0.18_195)]">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-[oklch(0.6_0.02_260)]">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Background gradient effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-60 top-1/4 h-[500px] w-[500px] rounded-full bg-[oklch(0.65_0.25_280_/_0.08)] blur-[120px]" />
        <div className="absolute -right-60 bottom-1/4 h-[500px] w-[500px] rounded-full bg-[oklch(0.75_0.18_195_/_0.08)] blur-[120px]" />
        <div className="absolute left-1/2 top-0 h-[300px] w-[800px] -translate-x-1/2 rounded-full bg-[oklch(0.7_0.2_200_/_0.05)] blur-[100px]" />
      </div>

      {/* Sidebar */}
      <ChatSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        rooms={rooms}
        currentRoomId={currentRoomId}
        onSelectRoom={handleSelectRoom}
        onCreateRoom={handleCreateRoom}
        onDeleteRoom={handleDeleteRoom}
      />

      {/* Main Content */}
      <div
        className={cn(
          'relative z-10 flex h-screen min-w-0 flex-1 flex-col',
          isSidebarOpen ? 'lg:ml-72' : 'lg:ml-16'
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[oklch(0.25_0.02_260_/_0.5)] bg-[oklch(0.13_0.005_260_/_0.8)] px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.65_0.25_280)] to-[oklch(0.75_0.18_195)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">AI 채팅</h1>
              <p className="text-xs text-[oklch(0.5_0.02_260)]">MCP Client</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 overflow-y-auto" ref={scrollAreaRef}>
          <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative mb-6">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-[oklch(0.65_0.25_280_/_0.2)] blur-xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.65_0.25_280)] via-[oklch(0.7_0.2_200)] to-[oklch(0.75_0.18_195)]">
                    <Sparkles className="h-10 w-10 text-white" />
                  </div>
                </div>
                <h2 className="mb-2 text-xl font-semibold">안녕하세요!</h2>
                <p className="text-center text-[oklch(0.55_0.02_260)]">
                  무엇을 도와드릴까요?
                  <br />
                  메시지를 입력하고 전송하세요.
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={cn('flex gap-4', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {message.role === 'model' && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.65_0.25_280)] to-[oklch(0.75_0.18_195)]">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}

                <Card
                  className={cn(
                    'max-w-[85%] border transition-all duration-300',
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-[oklch(0.65_0.25_280_/_0.2)] to-[oklch(0.6_0.22_300_/_0.2)] border-[oklch(0.5_0.15_280_/_0.3)]'
                      : 'bg-[oklch(0.16_0.01_260_/_0.6)] border-[oklch(0.25_0.02_260_/_0.4)]'
                  )}
                >
                  <CardContent className="p-4">
                    {message.role === 'model' ? (
                      <div className="markdown-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            pre: ({ children, ...props }) => {
                              // Find code element in children
                              // child.type can be 'code' string or a function/component
                              const findCodeChild = (
                                node: React.ReactNode
                              ): {
                                className?: string;
                                children?: React.ReactNode;
                              } | null => {
                                if (!React.isValidElement(node)) {
                                  return null;
                                }

                                // Check if it's a code element (type can be string 'code' or function)
                                const nodeType = node.type;
                                if (
                                  nodeType === 'code' ||
                                  (typeof nodeType === 'function' &&
                                    (
                                      nodeType as {
                                        displayName?: string;
                                      }
                                    ).displayName === 'code')
                                ) {
                                  return node.props as {
                                    className?: string;
                                    children?: React.ReactNode;
                                  };
                                }

                                return null;
                              };

                              const childrenArray = Array.isArray(children) ? children : [children];

                              for (const child of childrenArray) {
                                const codeProps = findCodeChild(child);
                                if (codeProps) {
                                  return (
                                    <CodeBlock codeClassName={codeProps.className} {...props}>
                                      {codeProps.children}
                                    </CodeBlock>
                                  );
                                }
                              }

                              // Fallback: wrap all pre blocks with CodeBlock for consistency
                              return <CodeBlock {...props}>{children}</CodeBlock>;
                            },
                            code: ({
                              className,
                              children,
                              ...props
                            }: React.HTMLAttributes<HTMLElement> & {
                              className?: string;
                              inline?: boolean;
                            }) => {
                              return (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {message.parts[0].text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.parts[0].text}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {message.role === 'user' && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.25_0.02_260)]">
                    <User className="h-5 w-5 text-[oklch(0.7_0.02_260)]" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.65_0.25_280)] to-[oklch(0.75_0.18_195)]">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <Card className="max-w-[85%] border border-[oklch(0.25_0.02_260_/_0.4)] bg-[oklch(0.16_0.01_260_/_0.6)]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[oklch(0.65_0.25_280)]" style={{ animationDelay: '0ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[oklch(0.7_0.2_200)]" style={{ animationDelay: '150ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[oklch(0.75_0.18_195)]" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-[oklch(0.5_0.02_260)]">생각하는 중...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <Card className="max-w-[85%] border border-[oklch(0.5_0.2_25_/_0.4)] bg-[oklch(0.2_0.05_25_/_0.2)]">
                  <CardContent className="p-4">
                    <p className="text-sm text-[oklch(0.7_0.2_25)]">{error}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={() => setError(null)}
                    >
                      닫기
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="shrink-0 border-t border-[oklch(0.25_0.02_260_/_0.5)] bg-[oklch(0.13_0.005_260_/_0.8)] px-6 py-5 backdrop-blur-xl">
          <div className="mx-auto max-w-3xl">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onInput={(e) => setInput((e.target as HTMLInputElement).value)}
                  onKeyPress={handleKeyPress}
                  placeholder="메시지를 입력하세요..."
                  disabled={isLoading}
                  className="pr-4"
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="h-11 w-11"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <p className="mt-2 text-center text-xs text-[oklch(0.45_0.02_260)]">
              AI는 실수할 수 있습니다. 중요한 정보는 확인하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
