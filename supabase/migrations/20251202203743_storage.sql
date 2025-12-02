-- Storage 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage 정책: 모든 사용자가 읽기 가능 (Public bucket)
CREATE POLICY "Public read access for chat-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

-- Storage 정책: 모든 사용자가 업로드 가능 (개발용)
CREATE POLICY "Allow upload to chat-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-images');

-- Storage 정책: 모든 사용자가 삭제 가능 (개발용)
CREATE POLICY "Allow delete from chat-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-images');

