# MCP Client

Model Context Protocol(MCP)을 지원하는 AI 채팅 클라이언트입니다. Gemini API를 기반으로 동작하며, MCP 서버와 연결하여 다양한 도구(Tools), 프롬프트(Prompts), 리소스(Resources)를 활용할 수 있습니다.

## ✨ 주요 기능

- **AI 채팅**: Gemini API 기반 스트리밍 채팅
- **MCP 서버 관리**: STDIO, HTTP, SSE 등 다양한 전송 방식 지원
- **도구 호출**: MCP 서버에서 제공하는 도구를 AI가 자동으로 호출
- **채팅방 관리**: 여러 채팅방 생성 및 관리 (Supabase 연동)
- **실시간 스트리밍**: SSE를 통한 토큰 단위 실시간 응답

## 🛠 기술 스택

- **프레임워크**: Next.js 15 (App Router, Turbopack)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **UI 컴포넌트**: shadcn/ui, Radix UI
- **아이콘**: Lucide React
- **LLM**: Google Gemini API
- **MCP**: @modelcontextprotocol/sdk
- **데이터베이스**: Supabase (채팅 저장)
- **마크다운**: react-markdown, remark-gfm, rehype-highlight

## 📋 요구사항

- **Node.js**: LTS 버전 권장 (v18 이상)
- **패키지 매니저**: pnpm (권장) 또는 npm
- **API 키**: Gemini API Key, Supabase 프로젝트

## 🚀 시작하기

### 1. 저장소 클론

```bash
git clone <repository-url>
cd mcp-client
```

### 2. 의존성 설치

```bash
# pnpm (권장)
pnpm install

# 또는 npm
npm install
```

### 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 아래 내용을 입력합니다:

```bash
# .env.example 파일을 참고하여 작성
cp .env.example .env.local
```

`.env.local` 파일 내용:

```env
# Gemini API Key (필수)
# Google AI Studio에서 발급: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Supabase 설정 (채팅 저장용)
# Supabase 프로젝트 생성 후 Settings > API에서 확인
NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

#### API 키 발급 방법

1. **Gemini API Key**
   - [Google AI Studio](https://aistudio.google.com/app/apikey)에 접속
   - "Create API Key" 클릭하여 키 생성
   - 생성된 키를 `GEMINI_API_KEY`에 입력

2. **Supabase**
   - [Supabase](https://supabase.com)에서 새 프로젝트 생성
   - Project Settings > API 메뉴에서 URL과 anon key 확인
   - 각각 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 입력

### 4. Supabase 데이터베이스 설정

#### Supabase CLI 설치

```bash
# macOS
brew install supabase/tap/supabase

# npm (전역 설치)
npm install -g supabase

# Windows (scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### Supabase 프로젝트 연결

```bash
# Supabase 로그인
supabase login

# 프로젝트 연결 (Supabase 대시보드에서 Project ID 확인)
supabase link --project-ref YOUR_PROJECT_ID
```

#### 마이그레이션 실행

```bash
# 원격 데이터베이스에 마이그레이션 적용
supabase db push
```

> 마이그레이션 파일은 `supabase/migrations/` 폴더에 있습니다.

> **참고**: Storage 버킷(`chat-images`)도 마이그레이션에 포함되어 자동 생성됩니다.

### 5. 개발 서버 실행

```bash
# pnpm
pnpm dev

# 또는 npm
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인합니다.

## 🗄️ 데이터베이스 스키마

### chat_rooms

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | Primary Key |
| `title` | TEXT | 채팅방 제목 |
| `created_at` | TIMESTAMPTZ | 생성 시간 |
| `updated_at` | TIMESTAMPTZ | 수정 시간 |

### messages

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | Primary Key |
| `chat_room_id` | UUID | 채팅방 FK |
| `role` | TEXT | 'user' 또는 'model' |
| `content` | TEXT | 메시지 내용 |
| `tool_calls` | JSONB | 도구 호출 정보 (선택) |
| `created_at` | TIMESTAMPTZ | 생성 시간 |

## 📁 프로젝트 구조

```
mcp-client/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── chat/          # 채팅 API (스트리밍)
│   │   ├── chat-rooms/    # 채팅방 CRUD API
│   │   └── mcp/           # MCP 서버 연동 API
│   ├── mcp/               # MCP 관리 페이지
│   ├── page.tsx           # 메인 채팅 페이지
│   └── layout.tsx         # 루트 레이아웃
├── components/            # React 컴포넌트
│   ├── mcp/              # MCP 관련 컴포넌트
│   └── ui/               # shadcn/ui 컴포넌트
├── contexts/              # React Context
│   └── mcp-context.tsx   # MCP 상태 관리
├── lib/                   # 유틸리티 및 라이브러리
│   ├── chat-storage.ts   # 채팅 저장 로직
│   ├── mcp-client.ts     # MCP 클라이언트
│   ├── mcp-storage.ts    # MCP 설정 저장
│   ├── mcp-types.ts      # MCP 타입 정의
│   └── supabase.ts       # Supabase 클라이언트
├── supabase/              # Supabase 설정
│   ├── config.toml       # CLI 설정
│   └── migrations/       # DB 마이그레이션 파일
└── public/               # 정적 파일
```

## 🔧 사용 가능한 스크립트

| pnpm | npm | 설명 |
|------|-----|------|
| `pnpm dev` | `npm run dev` | 개발 서버 실행 (Turbopack) |
| `pnpm build` | `npm run build` | 프로덕션 빌드 |
| `pnpm start` | `npm run start` | 프로덕션 서버 실행 |
| `pnpm lint` | `npm run lint` | ESLint 검사 |
| `pnpm format` | `npm run format` | Prettier로 코드 포맷팅 |
| `pnpm format:check` | `npm run format:check` | 포맷팅 검사 |

## 🔌 MCP 서버 연결

1. 메인 화면 좌측 상단에서 MCP 관리 페이지로 이동
2. "새 서버 등록" 버튼 클릭
3. 서버 정보 입력:
   - **STDIO**: command, args, env 설정
   - **HTTP/SSE**: URL 설정
4. 서버 연결 후 Tools, Prompts, Resources 확인

### 지원하는 전송 방식

- **STDIO**: 로컬 프로세스 기반 (예: `npx`, `uvx`)
- **Streamable HTTP**: HTTP 스트리밍
- **SSE**: Server-Sent Events

## ⚠️ 주의사항

- **API 키 보안**: `.env.local` 파일은 절대 Git에 커밋하지 마세요
- **공용 PC**: 민감한 정보는 localStorage에 저장되므로 공용 PC 사용 시 주의
- **서버 사이드 호출**: 모든 외부 API 호출은 서버 사이드에서만 수행됩니다

## 📄 라이선스

MIT License
