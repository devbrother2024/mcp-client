import { NextResponse } from 'next/server';
import { supabase, DbChatRoom, DbMessage } from '@/lib/supabase';

// GET: 모든 채팅방 조회 (메시지 포함)
export async function GET() {
  try {
    // 채팅방 목록 조회 (최신 업데이트 순)
    const { data: rooms, error: roomsError } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('updated_at', { ascending: false });

    if (roomsError) {
      console.error('Failed to fetch chat rooms:', roomsError);
      return NextResponse.json({ error: 'Failed to fetch chat rooms' }, { status: 500 });
    }

    // 각 채팅방의 메시지 조회
    const roomsWithMessages = await Promise.all(
      (rooms as DbChatRoom[]).map(async (room) => {
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_room_id', room.id)
          .order('created_at', { ascending: true });

        if (messagesError) {
          console.error(`Failed to fetch messages for room ${room.id}:`, messagesError);
          return transformRoom(room, []);
        }

        return transformRoom(room, messages as DbMessage[]);
      })
    );

    return NextResponse.json(roomsWithMessages);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: 새 채팅방 생성
export async function POST() {
  try {
    const { data: room, error } = await supabase
      .from('chat_rooms')
      .insert({ title: '새 채팅' })
      .select()
      .single();

    if (error) {
      console.error('Failed to create chat room:', error);
      return NextResponse.json({ error: 'Failed to create chat room' }, { status: 500 });
    }

    return NextResponse.json(transformRoom(room as DbChatRoom, []));
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DB 형식을 클라이언트 인터페이스로 변환
function transformRoom(room: DbChatRoom, messages: DbMessage[]) {
  return {
    id: room.id,
    title: room.title,
    messages: messages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    })),
    createdAt: new Date(room.created_at).getTime(),
    updatedAt: new Date(room.updated_at).getTime(),
  };
}

