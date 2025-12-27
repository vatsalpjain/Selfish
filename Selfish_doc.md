# Selfish - Canvas-Based Project Tracker

## Project Blueprint Document

---

## 1. Project Overview

### Problem Statement

Individuals struggle with visual project planning and daily tracking:

- **Rigid Text Interfaces**: Traditional todo apps force linear thinking, limiting creativity
- **Lack of Visual Context**: Can't see connections between tasks, goals, and ideas
- **No Flexible Organization**: Static lists don't adapt to different thinking styles
- **Poor Day-to-Day Tracking**: Hard to visualize project evolution over time
- **Context Switching**: Separate tools for planning, notes, and canvas work

### Solution Approach

**Selfish** is a visual-first project management tool that:

- Provides infinite canvas workspace (Figma-like) for each project
- Supports multiple "slides" per project for day-by-day progression
- Combines freehand drawing, sticky notes, shapes, and text
- Persists all canvas state to Supabase for seamless recovery
- Dark, modern UI with glassmorphism design

### Key Value Proposition

- **Visual Freedom**: Think and plan in 2D space, not rigid lists
- **Daily Progression**: New canvas slide each day shows evolution
- **Context Preservation**: All work saved automatically to cloud
- **Zero Setup**: Works immediately, no complex configuration
- **Personal Focus**: Built for individual use, optimized for single-user experience

---

## 2. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   USER INTERFACE                        │
│         (React + TypeScript + Tailwind + tldraw)        │
│  • Dashboard  • Projects  • Calendar  • Todos  • AI Chat│
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              API LAYER (Express.js)                     │
│  • Auth  • Projects  • Slides  • Calendar  • Todos  • AI│
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
           ▼                      ▼
┌────────────────────┐   ┌──────────────────────────────┐
│  AUTH MIDDLEWARE   │   │  AI SERVICE (FastAPI/Python) │
│  • JWT Verify      │   │  • RAG (pgvector)            │
│  • User Context    │   │  • Groq LLM                  │
└────────────────────┘   │  • Gemini Embeddings         │
                         │  • Canvas Analysis           │
                         └──────────────────────────────┘
           │  
           ▼  
┌─────────────────────────────────────────────────────────┐
│          DATABASE (Supabase PostgreSQL + pgvector)      │
│  • users • projects • slides • todos • embeddings       │
│  • calendar_tokens • chat_sessions • chat_messages      │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│            EXTERNAL INTEGRATIONS                        │
│  • Google Calendar API (OAuth 2.0)                      │
│  • Groq API Inference                                   │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

**Frontend:**

- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS (styling with glassmorphism)
- **tldraw** (infinite canvas editor)
- React Router v6 (navigation)
- Axios (API calls)

**Backend (Node.js):**

- Node.js with Express
- ES6 Modules
- JWT (authentication - 30 day expiry)
- @supabase/supabase-js (Supabase client)
- Google Calendar API integration
- Axios (AI service communication)

**AI Service (Python):**

- FastAPI (async web framework)
- Groq API (LLM - llama-3.3-70b-versatile, llama-4-scout for vision)
- Supabase pgvector (vector database for RAG)
- Gemini text-embedding-004 (768-dimensional embeddings)
- Supabase client (data retrieval)
- Pillow (image processing)

**Database:**

- Supabase PostgreSQL (cloud)
- Tables: users, projects, slides, todos, calendar_tokens, chat_sessions, chat_messages

**Deployment:**

- Frontend: Vercel (free tier)
- Backend: Render (free tier)
- AI Service: Python server (local/cloud)
- Database: Supabase (free tier)

---

## 2. Flow to add features

1. Database Schema (Supabase Dashboard/SQL)
   ↓
2. Backend API Route
   ↓
3. Backend Controller Logic (using supabase client)
   ↓
4. Test Backend with Postman/Thunder Client
   ↓
5. Frontend API Service Function
   ↓
6. Frontend Component/UI
   ↓
7. Test End-to-End in Browser

## 3. Core Components

### 3.1 Authentication System ✅

**Features:**

- User registration with username, email, password
- JWT-based authentication (30-day expiry)
- Protected routes with middleware
- Persistent login via localStorage
- Token validation on app load

**Key Files:**

- `context/AuthContext.tsx` - Global auth state
- `middleware/auth.js` - JWT verification
- `config/supabase.js` - Supabase client
- `pages/Login.tsx`, `pages/Register.tsx` - Auth UI
- `controllers/authController.js` - Auth logic

---

### 3.2 Project Management ✅ COMPLETE

**Purpose**: CRUD operations for user projects with infinite canvas

**Database Schema (Supabase):**

```sql
projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

**API Endpoints:**

```
GET    /api/projects          - List all user projects
GET    /api/projects/:id      - Get single project
POST   /api/projects          - Create new project (title only)
PUT    /api/projects/:id      - Update project
DELETE /api/projects/:id      - Delete project + all slides
```

**Frontend Features:**

- Search projects (client-side filtering)
- Create project modal
- Project cards with hover effects
- Delete confirmation
- Glassmorphism design

---

### 3.3 Canvas Slide System ✅ COMPLETE

**Purpose**: Store multiple canvas states per project using tldraw

**Database Schema:**

```sql
slides (
  id UUID PRIMARY KEY,
  project UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slide_data TEXT,  -- tldraw JSON stringified
  screenshot_url TEXT,  -- base64 screenshot
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

**Canvas State Structure (tldraw v2):**

```javascript
{
  document: {
    store: {
      // shapes, bindings, assets
    }
  },
  session: {
    // viewport, selection state
  }
}
```

**API Endpoints:**

```
GET    /api/slides/project/:projectId  - Get all slides for project
POST   /api/slides                     - Create new slide
GET    /api/slides/:id                 - Get slide by ID
PUT    /api/slides/:id                 - Update slide (canvas data + name)
DELETE /api/slides/:id                 - Delete slide
```

**Features:**

- Infinite canvas with tldraw
- Auto-screenshot generation on save
- Slide navigation sidebar
- Rename slides
- Delete slides with confirmation
- Real-time save status

---

### 3.4 Todo Management ✅ COMPLETE

**Purpose**: Task tracking with **bidirectional Google Calendar sync**

**Database Schema:**

```sql
todos (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT CHECK (status IN ('pending', 'in-progress', 'completed')),
  due_date TIMESTAMP,
  calendar_event_id TEXT,  -- Google Calendar event ID (bidirectional link)
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

**API Endpoints:**

```
GET    /api/todos              - Get all todos
POST   /api/todos              - Create todo (auto-syncs to calendar if has due date)
GET    /api/todos/:id          - Get single todo
PUT    /api/todos/:id          - Update todo (syncs changes to calendar event)
DELETE /api/todos/:id          - Delete todo (deletes linked calendar event)
PUT    /api/todos/:id/complete - Toggle completion status
GET    /api/todos/upcoming     - Get upcoming todos for dashboard widget
PUT    /api/todos/:id/link-calendar - Manually link todo to calendar event
```

**Bidirectional Sync Features:**

**Todo → Calendar:**
- ✅ Creating todo with due date **automatically creates** calendar event (1-hour duration)
- ✅ Updating todo title/due date **automatically updates** calendar event
- ✅ Deleting todo **automatically deletes** calendar event
- ✅ Removing due date **deletes** calendar event

**Calendar → Todo:**
- ✅ Creating calendar event **automatically creates** todo
- ✅ Updating calendar event **automatically updates** linked todo
- ✅ Deleting calendar event **automatically deletes** linked todo

**Core Features:**

- Priority levels (low/medium/high)
- Status tracking (pending/in-progress/completed)
- Due date with overdue detection
- Filter by status
- Inline editing
- Automatic calendar sync (no manual action required)
- Dashboard widget
- Visual sync status badges (SYNCED/NOT SYNCED)

**Sync Implementation:**

- Uses helper functions: `createCalendarEventHelper`, `updateCalendarEventHelper`, `deleteCalendarEventHelper`
- Graceful error handling (sync failures don't block todo operations)
- Console logging for debugging sync operations
- Only syncs when calendar is connected
- 1-hour event duration by default (start time = due date)

---

### 3.5 Calendar Integration ✅ COMPLETE

**Purpose**: Google Calendar sync with **bidirectional todo synchronization**

**Database Schema:**

```sql
calendar_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

**API Endpoints:**

```
GET    /api/calendar/auth/google    - Get OAuth URL
GET    /api/calendar/callback       - Handle OAuth callback
GET    /api/calendar/status         - Check connection status
GET    /api/calendar/events         - Get all events
POST   /api/calendar/addEvent       - Create event (auto-creates linked todo)
PUT    /api/calendar/updateEvent    - Update event (updates linked todo)
DELETE /api/calendar/deleteEvent    - Delete event (deletes linked todo)
DELETE /api/calendar/disconnect     - Remove calendar connection
```

**Bidirectional Sync Features:**

**Calendar → Todo:**
- ✅ Creating calendar event **automatically creates** todo with:
  - Title = Event summary
  - Due date = Event start time
  - Priority = "medium"
  - Status = "pending"
  - `calendar_event_id` = Event ID
- ✅ Updating calendar event **automatically updates** linked todo (title + due date)
- ✅ Deleting calendar event **automatically deletes** linked todo

**Todo → Calendar:**
- ✅ See section 3.4 for todo-to-calendar sync details

**Core Features:**

- OAuth 2.0 authentication
- Automatic token refresh on expiry
- Monthly calendar view
- Create/Edit/Delete events with full CRUD
- Event search functionality
- Mini calendar widget on dashboard
- Sync status indicators on calendar events
- Auto-dismissing info banner (5 seconds, localStorage-based)

**Sync Implementation:**

- Uses helper functions shared with todo controller
- Automatic todo creation when calendar event is created
- Bidirectional updates for title and datetime changes
- Security: User isolation enforced (only syncs user's own data)
- Graceful fallback: Calendar operations succeed even if todo sync fails

---

### 3.6 AI Chat System ✅ COMPLETE

**Purpose**: RAG-powered AI assistant with chat history

**Architecture:**

- **Node.js Backend**: API proxy to Python AI service
- **Python AI Service** (FastAPI):
  - Supabase pgvector (persistent vector store with HNSW indexes)
  - Gemini text-embedding-004 (768-dimensional embeddings)
  - Groq API (LLM)
  - Hybrid RAG: Slides with semantic search + Projects/Todos as direct context
  - Smart project name detection for automatic filtering
  - History-aware query optimization
  - Canvas image analysis with vision models

**Database Schema:**

```sql
chat_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)

chat_messages (
  id UUID PRIMARY KEY,
  session_id TEXT REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role TEXT CHECK (role IN ('user', 'model')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
)
```

**Node.js API Endpoints:**

```
GET    /api/ai/health           - Check AI service status
POST   /api/ai/index            - Index user data for RAG
POST   /api/ai/chat             - Stream chat response
POST   /api/ai/analyze-canvas   - Analyze canvas screenshot
GET    /api/ai/chat-history/:sessionId - Get chat messages
GET    /api/ai/chat-sessions    - Get all chat sessions
DELETE /api/ai/chat-sessions/:sessionId - Delete session
POST   /api/ai/save-message     - Save chat message
```

**Python AI Service (http://localhost:8000):**

```
GET    /                 - Service info
GET    /health          - Health check
POST   /index-user-data - Index projects/todos/slides
POST   /chat            - Streaming chat endpoint
POST   /analyze-canvas  - Canvas analysis with vision
```

**Features:**

- Streaming responses (SSE)
- Multi-session chat history
- Context-aware responses (RAG)
- Session management
- Canvas/image analysis
- User data indexing (projects, todos, slides)

---

### 3.7 UI/UX Design System ✅ COMPLETE

**Design Principles:**

- Dark mode default (`bg-gray-900`)
- Glassmorphism effects (`backdrop-blur-xl`, `bg-white/10`)
- Gradient branding on "Selfish" logo
- Orange accent color (#f97316)
- Smooth hover animations (`hover:scale-105`, `transition-all duration-200`)
- Tile-based navigation
- Visual dividers between sections

**Navigation System:**

- Floating glassmorphic navbar (fixed top)
- Active page link hidden (no redundancy)
- Hover effects with scale and shadow
- Consistent across all pages
- "Logout" button with red hover state

**Component Patterns:**

```tsx
// Glassmorphism Card
<div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">

// Floating Navbar
<nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur-xl">

// Navigation Tile
<Link className="px-5 py-2.5 bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 rounded-xl transition-all duration-200 hover:scale-105">

// Gradient Branding
<h1 className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">

// Modal Overlay
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm">
```

---

## 4. Current Project Status

### ✅ **COMPLETED FEATURES**

#### **Phase 1-3: Core Infrastructure**

1. ✅ Backend API with Express + Supabase
2. ✅ User authentication (register, login, JWT)
3. ✅ Frontend auth pages (Login, Register)
4. ✅ Protected route system
5. ✅ Dashboard with project list
6. ✅ Project CRUD (Create, Read, Update, Delete)
7. ✅ Canvas integration with tldraw
8. ✅ Slide system (multiple canvases per project)
9. ✅ Canvas auto-save + manual save
10. ✅ Slide navigation, rename, delete
11. ✅ Screenshot generation for slides

#### **Phase 4: Extended Features**

12. ✅ Google Calendar integration (OAuth 2.0)
13. ✅ Calendar events CRUD
14. ✅ Todo management system
15. ✅ **Bidirectional Todo ↔ Calendar sync**
16. ✅ **Auto-sync todos to calendar events**
17. ✅ **Auto-sync calendar events to todos**
18. ✅ Mini calendar widget
19. ✅ Todo widget on dashboard
20. ✅ **Sync status indicators (SYNCED/NOT SYNCED badges)**
21. ✅ **Auto-dismissing info banners (5s timeout)**

#### **Phase 5: AI Integration**

18. ✅ FastAPI AI service (Python)
19. ✅ RAG system with ChromaDB
20. ✅ LLM integration
21. ✅ Streaming chat responses
22. ✅ Chat session management
23. ✅ Chat history persistence
24. ✅ User data indexing for RAG
25. ✅ Canvas image analysis

#### **Phase 6: UI/UX Polish**

26. ✅ Glassmorphism design system
27. ✅ Gradient branding
28. ✅ Tile-based navigation
29. ✅ Hover animations (scale + shadow)
30. ✅ Active page indicator
31. ✅ Modal for project creation
32. ✅ Project search functionality
33. ✅ Highlighted search results
34. ✅ Consistent spacing and visual hierarchy
35. ✅ Background blur enhancements

---

### 🎯 **PROJECT COMPLETION STATUS**

| Category                 | Status      | Progress |
| ------------------------ | ----------- | -------- |
| **Authentication** | ✅ Complete | 100%     |
| **Projects**       | ✅ Complete | 100%     |
| **Canvas/Slides**  | ✅ Complete | 100%     |
| **Todos**          | ✅ Complete | 100%     |
| **Calendar**       | ✅ Complete | 100%     |
| **AI Chat**        | ✅ Complete | 100%     |
| **UI/UX**          | ✅ Complete | 100%     |
| **Backend**        | ✅ Complete | 100%     |
| **Database**       | ✅ Complete | 100%     |

**Overall Project Completion: 100% (MVP + Extended Features)**

---

### 📊 **FEATURE MATRIX**

| Feature       | Frontend      | Backend       | Database     | Status |
| ------------- | ------------- | ------------- | ------------ | ------ |
| User Auth     | React Context | Express JWT   | Supabase     | ✅     |
| Projects      | Dashboard UI  | Express API   | PostgreSQL   | ✅     |
| Canvas Editor | tldraw        | Slide API     | JSON Storage | ✅     |
| Todos         | TodoPage      | Express API   | PostgreSQL   | ✅     |
| Calendar      | Calendar UI   | Google API    | OAuth Tokens | ✅     |
| AI Chat       | ChatPage      | FastAPI Proxy | Chat History | ✅     |

---

## 5. Database Schema (Supabase PostgreSQL)

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- bcrypt hashed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Projects Table

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
```

### Slides Table

```sql
CREATE TABLE slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'New Slide',
  slide_data TEXT,  -- Stringified tldraw JSON
  screenshot_url TEXT,  -- Base64 screenshot
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_slides_project ON slides(project);
```

### Todos Table

```sql
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('pending', 'in-progress', 'completed')) DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  calendar_event_id TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_status ON todos(status);
```

### Calendar Tokens Table

```sql
CREATE TABLE calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_calendar_tokens_user ON calendar_tokens(user_id);
```

### Chat Sessions Table

```sql
CREATE TABLE chat_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
```

### Chat Messages Table

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'model')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
```

### Embeddings Table (Vector Store)

```sql
-- Enable pgvector extension (run once)
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings table for RAG semantic search
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('slide')),
  document_id UUID NOT NULL,
  text_content TEXT NOT NULL,
  embedding vector(768),  -- Gemini text-embedding-004 dimensions
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_type, document_id)
);

-- Indexes for performance
CREATE INDEX idx_embeddings_user_id ON embeddings(user_id);
CREATE INDEX idx_embeddings_vector ON embeddings USING hnsw (embedding vector_cosine_ops);  -- HNSW for fast similarity search
CREATE INDEX idx_embeddings_user_type ON embeddings(user_id, document_type);

-- RPC function for vector similarity search with user isolation
CREATE OR REPLACE FUNCTION search_embeddings(
  query_embedding vector(768),
  query_user_id UUID,
  match_count INT DEFAULT 5,
  filter_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_type TEXT,
  document_id UUID,
  text_content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.document_type,
    e.document_id,
    e.text_content,
    e.metadata,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  WHERE e.user_id = query_user_id
    AND (filter_project_id IS NULL OR (e.metadata->>'project_id')::uuid = filter_project_id)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- RPC function for upserting embeddings
CREATE OR REPLACE FUNCTION upsert_embedding(
  p_user_id UUID,
  p_document_type TEXT,
  p_document_id UUID,
  p_text_content TEXT,
  p_embedding vector(768),
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  result_id UUID;
BEGIN
  INSERT INTO embeddings (user_id, document_type, document_id, text_content, embedding, metadata)
  VALUES (p_user_id, p_document_type, p_document_id, p_text_content, p_embedding, p_metadata)
  ON CONFLICT (document_type, document_id)
  DO UPDATE SET
    text_content = EXCLUDED.text_content,
    embedding = EXCLUDED.embedding,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING id INTO result_id;
  
  RETURN result_id;
END;
$$;

-- RPC function for deleting embeddings by document
CREATE OR REPLACE FUNCTION delete_document_embeddings(
  p_document_type TEXT,
  p_document_id UUID
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM embeddings
  WHERE document_type = p_document_type AND document_id = p_document_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Row-Level Security (RLS) for user isolation
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own embeddings"
  ON embeddings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own embeddings"
  ON embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own embeddings"
  ON embeddings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own embeddings"
  ON embeddings FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to auto-delete embeddings when slides are deleted
CREATE OR REPLACE FUNCTION delete_slide_embeddings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM embeddings
  WHERE document_type = 'slide' AND document_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_delete_slide_embeddings
  BEFORE DELETE ON slides
  FOR EACH ROW
  EXECUTE FUNCTION delete_slide_embeddings();
```

**RAG Implementation Notes:**

- **Hybrid Approach**: Slides use embeddings for semantic search; Projects/Todos sent as direct context (no embeddings)
- **Smart Filtering**: Automatically detects project names in queries and filters slides accordingly
- **User Isolation**: RLS policies ensure users only access their own embeddings
- **Performance**: HNSW index enables sub-50ms vector similarity searches
- **Persistence**: Unlike in-memory ChromaDB, all embeddings survive service restarts

---

## 6. API Endpoints Reference

### Authentication (`/api/auth`)

```
POST   /api/auth/register    - Create new user (username, email, password)
POST   /api/auth/login       - Login user (returns JWT token)
GET    /api/auth/me          - Get current user (protected)
```

### Projects (`/api/projects`)

```
GET    /api/projects         - List all user projects
POST   /api/projects         - Create new project (title)
GET    /api/projects/:id     - Get single project details
PUT    /api/projects/:id     - Update project (title)
DELETE /api/projects/:id     - Delete project + all slides
```

### Slides (`/api/slides`)

```
GET    /api/slides/project/:projectId  - Get all slides for project
POST   /api/slides                     - Create new slide
GET    /api/slides/:id                 - Get slide by ID
PUT    /api/slides/:id                 - Update slide (data, name, screenshot)
DELETE /api/slides/:id                 - Delete slide
```

### Todos (`/api/todos`)

```
GET    /api/todos              - Get all user todos
POST   /api/todos              - Create new todo
GET    /api/todos/:id          - Get single todo
PUT    /api/todos/:id          - Update todo
DELETE /api/todos/:id          - Delete todo
PUT    /api/todos/:id/complete - Toggle completion status
POST   /api/todos/:id/sync-calendar - Sync todo to Google Calendar
```

### Calendar (`/api/calendar`)

```
GET    /api/calendar/auth/google    - Get Google OAuth URL
GET    /api/calendar/callback       - OAuth callback handler
GET    /api/calendar/status         - Check connection status
GET    /api/calendar/events         - Get all calendar events
POST   /api/calendar/addEvent       - Create calendar event
PUT    /api/calendar/updateEvent    - Update calendar event
DELETE /api/calendar/deleteEvent    - Delete calendar event
DELETE /api/calendar/disconnect     - Remove calendar connection
```

### AI Chat (`/api/ai`)

```
GET    /api/ai/health                      - Check AI service health
POST   /api/ai/index                       - Index user data for RAG
POST   /api/ai/chat                        - Chat with AI (streaming)
POST   /api/ai/analyze-canvas              - Analyze canvas image
GET    /api/ai/chat-history/:sessionId     - Get chat history
GET    /api/ai/chat-sessions               - Get all chat sessions
DELETE /api/ai/chat-sessions/:sessionId    - Delete chat session
POST   /api/ai/save-message                - Save chat message
```

---

## 7. Frontend Routes & Pages

### Public Routes (Unauthenticated)

```
/login           - Login page (username + password)
/register        - Registration page (username, email, password)
```

### Protected Routes (Authenticated)

```
/dashboard       - Main hub: project gallery, search, calendar/todo widgets
/projects/:id    - Infinite canvas workspace (tldraw editor)
/calendar        - Google Calendar integration + event management
/todos           - Todo list with create/edit/delete/sync
/ai-chat         - AI Chat with RAG (project context-aware)
```

### Page Components Overview

#### Dashboard (`/dashboard`)

- **Project Gallery**: Grid view with search, create, delete
- **Search Bar**: Real-time filter with highlighted results
- **Mini Calendar Widget**: Shows Google Calendar events
- **Todo Widget**: Quick todo view with completion toggle
- **Project Creation Modal**: Overlay form with auto-focus

#### Project Canvas (`/projects/:id`)

- **tldraw Editor**: Full-featured infinite canvas
- **Slide Management**: Create, navigate, rename, delete slides
- **Auto-save**: Canvas state auto-saved on changes
- **Screenshot Capture**: Generates preview images for slides
- **Toolbar**: Drawing tools, shapes, text, images, eraser

#### Calendar (`/calendar`)

- **OAuth Connection**: Google Calendar OAuth 2.0 flow
- **Event List**: Displays all calendar events
- **Add Event**: Form to create new events
- **Edit/Delete**: Manage existing events
- **Connection Status**: Shows if calendar is connected

#### Todos (`/todos`)

- **Todo List**: All todos with status indicators
- **Create Form**: Add new todos with description, priority, due date
- **Completion Toggle**: Mark todos complete/incomplete
- **Calendar Sync**: Sync individual todos to Google Calendar
- **Delete**: Remove todos permanently

#### AI Chat (`/ai-chat`)

- **Streaming Chat**: Real-time AI responses with streaming
- **Session Management**: Multiple chat sessions
- **Canvas Analysis**: Upload/analyze canvas screenshots
- **RAG Context**: AI has access to user's projects, todos, slides via indexing
- **Message History**: Persistent chat history per session

---

## 8. Development Setup & Technical Decisions

### Local Development Setup

**Prerequisites:**

- Node.js v18+ (for frontend + backend)
- Python 3.11+ (for AI service)
- Supabase account (free tier)
- Google Cloud Console project (for Calendar + Gemini APIs)

**Environment Variables:**

**Backend (`server/.env`):**

```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
JWT_SECRET=[YOUR_JWT_SECRET]
PORT=5000

# Google Calendar API OAuth
GOOGLE_CLIENT_ID=[YOUR_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[YOUR_CLIENT_SECRET]
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback
```

**AI Service (`ai_services/.env`):**

```bash
GOOGLE_API_KEY=[YOUR_GEMINI_API_KEY]
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
```

**Frontend (`client/.env`):**

```bash
VITE_API_URL=http://localhost:5000
VITE_AI_API_URL=http://localhost:8000
```

### Running the Application

**Terminal 1 - Backend (Express):**

```bash
cd server
npm install
node server.js
# Runs on http://localhost:5000
```

**Terminal 2 - AI Service (FastAPI):**

```bash
cd ai_services
uv run
```

**Terminal 3 - Frontend (Vite):**

```bash
cd client
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## 9. Deployment & Performance

### Current Deployment Status

**Development Mode:** All 3 services run locally

- Frontend: `http://localhost:5173` (Vite dev server)
- Backend: `http://localhost:5000` (Node.js Express)
- AI Service: `http://localhost:8000` (FastAPI + Uvicorn)

**Production Deployment:** Not yet configured

**Recommended Deployment Stack:**

- Frontend: Vercel (automatic from GitHub)
- Backend: Railway / Render (Node.js support)
- AI Service: Railway / Render (Python support)
- Database: Supabase (managed PostgreSQL)

### Performance Characteristics

**Canvas Performance:**

- tldraw handles 1000+ shapes smoothly
- Auto-save debounced (prevents excessive DB writes)
- Screenshot generation async (doesn't block UI)

**Search Performance:**

- Client-side filtering (instant results for <100 projects)
- Highlight function uses regex (efficient for small datasets)

**AI Chat Performance:**

- Streaming responses (perceived latency reduced)
- RAG indexing asynchronous (doesn't block chat)
- ChromaDB vector search < 100ms

**Database Optimization:**

- Indexes on foreign keys (user_id, project_id, session_id)
- Cascade deletes (prevent orphaned records)
- TIMESTAMPTZ for proper timezone handling

---

---

## 10. Lessons Learned & Best Practices

### Architecture Decisions

✅ **What Worked Well:**

- 3-tier separation (React → Express → FastAPI) keeps concerns separated
- Supabase PostgreSQL excellent developer experience
- JWT authentication simple and effective (30-day tokens)
- tldraw integration straightforward with good documentation
- Glassmorphism design creates professional look with minimal effort
- Modal patterns cleaner than inline forms

## 12. Project Summary

**Selfish** is a fully functional visual productivity platform combining:

- **Infinite Canvas Projects** (tldraw)
- **Todo Management** with calendar sync
- **Google Calendar Integration** (OAuth 2.0)
- **AI Chat with RAG** (Groq + ChromaDB)
- **Modern Glassmorphic UI**

**Project Value:**

- Demonstrates full-stack development (React + Node + Python)
- Shows integration skills (Google APIs, Supabase, AI services)
- Portfolio piece showcasing modern tech stack
- Real-world application of RAG/vector databases
- Clean, professional design aesthetic

---

**Last Updated:** [Current Date]**Project Status:** ✅ Feature Complete - Ready for Deployment**Documentation Status:** ✅ Up to Date

- **Week 5**: Deployment + Documentation

---

## 15. Resources & References

### Documentation

- [tldraw Docs](https://tldraw.dev)
- [Supabase Docs](https://supabase.com/docs)
- [React Router v6](https://reactrouter.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Conclusion

**Selfish** combines visual freedom with persistent cloud storage, creating a unique project tracking experience. The phased approach ensures steady progress from working authentication to a fully-featured canvas editor.
