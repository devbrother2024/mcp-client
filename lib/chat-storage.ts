export interface Message {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

export interface ChatRoom {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// Get all chat rooms
export async function getChatRooms(): Promise<ChatRoom[]> {
  try {
    const response = await fetch('/api/chat-rooms');
    if (!response.ok) {
      console.error('Failed to fetch chat rooms');
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error('Failed to load chat rooms:', e);
    return [];
  }
}

// Get a specific chat room by ID
export async function getChatRoom(id: string): Promise<ChatRoom | null> {
  try {
    const response = await fetch(`/api/chat-rooms/${id}`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error('Failed to load chat room:', e);
    return null;
  }
}

// Create a new chat room
export async function createChatRoom(): Promise<ChatRoom> {
  try {
    const response = await fetch('/api/chat-rooms', {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to create chat room');
    }
    return await response.json();
  } catch (e) {
    console.error('Failed to create chat room:', e);
    // Fallback: return a temporary room
    const now = Date.now();
    return {
      id: `temp-${now}`,
      title: '새 채팅',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
  }
}

// Update chat room messages
export async function updateChatRoom(id: string, messages: Message[]): Promise<void> {
  try {
    const response = await fetch(`/api/chat-rooms/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });
    if (!response.ok) {
      console.error('Failed to update chat room');
    }
  } catch (e) {
    console.error('Failed to update chat room:', e);
  }
}

// Delete a chat room
export async function deleteChatRoom(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/chat-rooms/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      console.error('Failed to delete chat room');
    }
  } catch (e) {
    console.error('Failed to delete chat room:', e);
  }
}
