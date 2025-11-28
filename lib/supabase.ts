import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DbChatRoom {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  chat_room_id: string;
  role: 'user' | 'model';
  content: string;
  tool_calls?: string; // JSON string of ToolCall[]
  created_at: string;
}

// Storage bucket name for chat images
const CHAT_IMAGES_BUCKET = 'chat-images';

/**
 * Upload base64 image to Supabase Storage and return public URL
 */
export async function uploadImage(
  base64Data: string,
  mimeType: string,
  chatRoomId: string
): Promise<string> {
  const extension = mimeType.split('/')[1] || 'png';
  const fileName = `${chatRoomId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  // Convert base64 to Uint8Array
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const { error } = await supabase.storage.from(CHAT_IMAGES_BUCKET).upload(fileName, bytes, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    console.error('Failed to upload image:', error);
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(CHAT_IMAGES_BUCKET).getPublicUrl(fileName);

  return urlData.publicUrl;
}
