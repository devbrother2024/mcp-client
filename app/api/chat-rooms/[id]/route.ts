import { NextRequest, NextResponse } from 'next/server';
import { supabase, DbChatRoom, DbMessage, uploadImage } from '@/lib/supabase';
import type { ToolCall, ToolCallImage } from '@/lib/chat-storage';

const MAX_TITLE_LENGTH = 30;

// Message type from client
interface ClientMessage {
  role: string;
  parts: [{ text: string }];
  toolCalls?: ToolCall[];
}

// GET: 특정 채팅방 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data: room, error: roomError } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Chat room not found' }, { status: 404 });
    }

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Failed to fetch messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json(transformRoom(room as DbChatRoom, messages as DbMessage[]));
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: 채팅방 메시지 업데이트
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { messages }: { messages: ClientMessage[] } = await request.json();

    // 기존 메시지 삭제
    const { error: deleteError } = await supabase.from('messages').delete().eq('chat_room_id', id);

    if (deleteError) {
      console.error('Failed to delete old messages:', deleteError);
      return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 });
    }

    // 새 메시지 삽입
    if (messages && messages.length > 0) {
      // 이미지 업로드 및 URL 변환
      for (const msg of messages) {
        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            if (tc.images) {
              const updatedImages: ToolCallImage[] = [];
              for (const img of tc.images) {
                if (img.data && !img.url) {
                  try {
                    const url = await uploadImage(img.data, img.mimeType, id);
                    updatedImages.push({ url, mimeType: img.mimeType });
                  } catch (e) {
                    console.error('Failed to upload image:', e);
                    // 업로드 실패 시 base64 유지하지 않음 (용량 문제)
                    updatedImages.push({ mimeType: img.mimeType });
                  }
                } else if (img.url) {
                  // 이미 URL이 있으면 그대로 유지
                  updatedImages.push({ url: img.url, mimeType: img.mimeType });
                }
              }
              tc.images = updatedImages;
            }
          }
        }
      }

      const messagesToInsert = messages.map((msg) => ({
        chat_room_id: id,
        role: msg.role,
        content: msg.parts[0].text,
        tool_calls: msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
      }));

      const { error: insertError } = await supabase.from('messages').insert(messagesToInsert);

      if (insertError) {
        console.error('Failed to insert messages:', insertError);
        return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 });
      }
    }

    // 제목 추출 및 업데이트
    const title = extractTitle(messages);
    const { error: updateError } = await supabase
      .from('chat_rooms')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update chat room:', updateError);
      return NextResponse.json({ error: 'Failed to update chat room' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 채팅방 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase.from('chat_rooms').delete().eq('id', id);

    if (error) {
      console.error('Failed to delete chat room:', error);
      return NextResponse.json({ error: 'Failed to delete chat room' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 제목 추출 함수
function extractTitle(messages: ClientMessage[]): string {
  const firstUserMessage = messages?.find((msg) => msg.role === 'user');
  if (firstUserMessage) {
    const text = firstUserMessage.parts[0].text.trim();
    if (text.length > MAX_TITLE_LENGTH) {
      return text.substring(0, MAX_TITLE_LENGTH) + '...';
    }
    return text;
  }
  return '새 채팅';
}

// DB 형식을 클라이언트 인터페이스로 변환
function transformRoom(room: DbChatRoom, messages: DbMessage[]) {
  return {
    id: room.id,
    title: room.title,
    messages: messages.map((msg) => {
      // Parse tool_calls JSON if exists
      let toolCalls: ToolCall[] | undefined;
      if (msg.tool_calls) {
        try {
          toolCalls = JSON.parse(msg.tool_calls);
        } catch {
          console.error('Failed to parse tool_calls:', msg.tool_calls);
        }
      }

      return {
        role: msg.role,
        parts: [{ text: msg.content }],
        toolCalls,
      };
    }),
    createdAt: new Date(room.created_at).getTime(),
    updatedAt: new Date(room.updated_at).getTime(),
  };
}
