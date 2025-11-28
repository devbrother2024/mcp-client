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
  created_at: string;
}

