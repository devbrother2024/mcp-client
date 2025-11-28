'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Copy, Check } from 'lucide-react';
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
    <div className="group relative my-2">
      <pre {...props} className="relative">
        <code ref={codeRef} className={codeClassName}>
          {children}
        </code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="bg-background/90 hover:bg-background absolute top-2 right-2 z-10 h-7 w-7 border opacity-100 shadow-sm transition-opacity group-hover:opacity-100"
        onClick={handleCopy}
        title="코드 복사"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
      {language && (
        <div className="text-muted-foreground bg-background/90 absolute top-2 left-2 z-10 rounded border px-1.5 py-0.5 text-xs shadow-sm">
          {language}
        </div>
      )}
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
      <div className="bg-background flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-screen overflow-hidden">
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
          'flex h-screen min-w-0 flex-1 flex-col',
          isSidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <h1 className="text-xl font-semibold">AI 채팅</h1>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 overflow-y-auto px-4 py-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-muted-foreground py-12 text-center">
                <p className="mb-2 text-lg">안녕하세요! 무엇을 도와드릴까요?</p>
                <p className="text-sm">메시지를 입력하고 전송하세요.</p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <Card
                  className={`max-w-[80%] ${
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  <CardContent className="p-3">
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
                      <p className="text-sm wrap-break-word whitespace-pre-wrap">
                        {message.parts[0].text}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <Card className="bg-muted max-w-[80%]">
                  <CardContent className="p-3">
                    <p className="text-muted-foreground text-sm">입력 중...</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <Card className="border-destructive max-w-[80%]">
                  <CardContent className="p-3">
                    <p className="text-destructive text-sm">{error}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="shrink-0 border-t px-4 py-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onInput={(e) => setInput((e.target as HTMLInputElement).value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={isLoading} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
