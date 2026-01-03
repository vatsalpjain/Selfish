# Selfish

> A visual-first project management platform combining infinite canvas workspace with AI-powered assistant and Google Calendar integration.

<video src="https://github.com/user-attachments/assets/25d9f5ca-3aa2-4788-8184-94724af11012" width="600" controls>Demo</video>

## 🎯 Overview

**Selfish** is a modern project management tool that breaks free from traditional list-based interfaces. Built for individuals who think visually, it combines an infinite canvas workspace (powered by tldraw) with Google Calendar integration, AI chat, and todo management—all wrapped in a sleek glassmorphism UI.

### Key Features

- **Infinite Canvas** - Freehand drawing, sticky notes, shapes, and text on unlimited 2D space
- **Project Slides** - Multiple canvas states per project for day-by-day progression
- **Bidirectional Calendar Sync** - Google Calendar integration with automatic todo synchronization
- **RAG-Powered AI Chat** - Context-aware AI assistant with access to your projects and slides
- **Todo Management** - Priority tracking with calendar event sync
- **Auto-Save** - All canvas state persisted to Supabase in real-time

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   USER INTERFACE                            │
│         (React + TypeScript + Tailwind + tldraw)            │
│  • Dashboard  • Projects  • Calendar  • Todos  • AI Chat    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              API LAYER (Express.js)                         │
│  • Auth  • Projects  • Slides  • Calendar  • Todos  • AI   │
└──────────┬──────────────────────┬───────────────────────────┘
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
┌─────────────────────────────────────────────────────────────┐
│          DATABASE (Supabase PostgreSQL + pgvector)          │
│  • users • projects • slides • todos • embeddings           │
│  • calendar_tokens • chat_sessions • chat_messages          │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│            EXTERNAL INTEGRATIONS                            │
│  • Google Calendar API (OAuth 2.0)                          │
│  • Groq API (LLM Inference)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Styling with glassmorphism
- **tldraw** - Infinite canvas editor
- **React Router v6** - Navigation
- **Axios** - HTTP client

### Backend (Node.js)
- **Express** - Web framework
- **JWT** - Authentication (30-day expiry)
- **@supabase/supabase-js** - Database client
- **googleapis** - Google Calendar API
- **bcryptjs** - Password hashing

### AI Service (Python)
- **FastAPI** - Async web framework
- **Groq API** - LLM (llama-3.3-70b-versatile, llama-4-scout for vision)
- **Supabase pgvector** - Vector database for RAG
- **Gemini text-embedding-004** - 768-dimensional embeddings

### Database
- **Supabase PostgreSQL** with pgvector extension
- Tables: `users`, `projects`, `slides`, `todos`, `calendar_tokens`, `chat_sessions`, `chat_messages`, `embeddings`

---

## 📸 Screenshots

### Dashboard
<img width="1120" height="664" alt="Screenshot 2026-01-01 220249" src="https://github.com/user-attachments/assets/596be5d1-4c2a-4a57-a3fb-b54f55e4cd5d" />

### Projects View
<img width="1120" height="664" alt="Screenshot 2026-01-01 220452" src="https://github.com/user-attachments/assets/d1ca73c2-6361-4f22-903c-e9fa8d0aa940" />

### Canvas Editor
<img width="1120" height="664" alt="Screenshot 2026-01-01 220520" src="https://github.com/user-attachments/assets/db235a90-45ec-4202-9e99-272945a789fc" />

### Calendar Integration
<img width="1120" height="664" alt="Screenshot 2026-01-01 220416" src="https://github.com/user-attachments/assets/bcea4956-6fb5-4506-9607-a8f6fbeaed49" />

### Todo Management
<img width="2240" height="1328" alt="Screenshot 2026-01-01 220216" src="https://github.com/user-attachments/assets/3d081576-39e9-490f-a7f9-7c81385de0b3" />

### AI Chat
<img width="1120" height="664" alt="Screenshot 2026-01-01 220601" src="https://github.com/user-attachments/assets/327394e4-0bb6-4361-a281-4fdc01f627ba" />
<img width="1120" height="664" alt="Screenshot 2026-01-01 220630" src="https://github.com/user-attachments/assets/60c721c6-5aca-40ee-8305-42e4415de894" />


---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account
- Google Cloud Console project (for Calendar API)
- Groq API key
- Google Gemini API key

### Environment Variables

**Backend** (`server/.env`)
```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback
```

**AI Service** (`ai_services/.env`)
```env
GOOGLE_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Frontend** (`client/.env`)
```env
VITE_API_URL=http://localhost:5000
VITE_AI_API_URL=http://localhost:8000
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/selfish.git
   cd selfish
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd server
   npm install

   # Frontend
   cd ../client
   npm install

   # AI Service
   cd ../ai_services
   pip install -r requirements.txt
   ```

3. **Start development servers**
   ```bash
   # Terminal 1 - Backend (from /server)
   node server.js

   # Terminal 2 - AI Service (from /ai_services)
   uv run

   # Terminal 3 - Frontend (from /client)
   npm run dev
   ```

4. **Access the application**
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:5000`
   - AI Service: `http://localhost:8000`

---

## 🎨 Features Deep Dive

### Canvas Workspace
- **Infinite 2D space** for visual planning
- **Multiple tools**: Pen, shapes, text, sticky notes, images
- **Slide system**: Create multiple canvas states per project
- **Auto-save**: Real-time persistence to Supabase
- **Screenshot generation**: Auto-generated previews for slides

### Calendar Management
- **Bidirectional sync** with Google Calendar
- **Todo → Calendar**: Creating a todo with due date auto-creates calendar event
- **Calendar → Todo**: Creating calendar event auto-creates linked todo
- **CRUD operations**: Create, edit, delete events
- **Auto-refresh tokens**: Seamless background token renewal

### Todo System
- **Priority levels**: Low, Medium, High
- **Status tracking**: Pending, In-Progress, Completed
- **Calendar sync**: Automatic synchronization with Google Calendar
- **Sync status badges**: Visual indicators (SYNCED/NOT SYNCED)

### AI Chat
- **Streaming responses** via Server-Sent Events
- **Multi-session management** with persistent history
- **RAG context**: Smart retrieval from projects, slides, and todos
- **Canvas analysis**: Upload and analyze canvas screenshots
- **Smart filtering**: Automatically detects project names in queries

### 🧠 AI Token Optimization Architecture

The AI service uses a smart 5-stage pipeline to minimize token usage while maximizing context quality:

<img src="./selfish_architecture.png" alt="Token Optimization Architecture" width="800" />

**Key Optimizations:**
1. **Query Intelligence** - Lightweight classifier (llama-3.1-8b-instant) determines if RAG is needed in ~200 tokens
2. **Hybrid RAG** - Projects/Todos sent as plain text, only slides use vector embeddings
3. **Project Filtering** - Infers project scope from query to reduce irrelevant context
4. **Conditional Vision** - Vision model only used when visual content is needed
5. **Pre-indexed Descriptions** - AI descriptions generated at save time, eliminating vision calls at query time

#### Token Savings in Action

<img src="./selfish_comparison.png" alt="Query Comparison Flow" width="800" />

---

## 🔐 Security

- **JWT-based authentication** (30-day expiry)
- **Password hashing** using bcryptjs
- **Protected routes** on both frontend and backend
- **OAuth 2.0** for Google Calendar access
- **Row-Level Security (RLS)** on Supabase for user isolation
- **Environment variable** configuration for sensitive data

---

## 📁 Project Structure

```
selfish/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React context providers (AuthContext)
│   │   ├── pages/         # Route components
│   │   ├── services/      # API service layer
│   │   └── App.tsx        # Main app component
│   └── package.json
│
├── server/                 # Backend Node.js application
│   ├── controllers/       # Request handlers
│   ├── middleware/        # Auth middleware (JWT verification)
│   ├── config/           # Supabase configuration
│   ├── routes/           # API routes
│   ├── server.js         # Entry point
│   └── package.json
│
├── ai_services/           # Python AI service
│   ├── main.py           # FastAPI entry point
│   ├── rag.py            # RAG implementation with pgvector
│   └── requirements.txt
│
└── README.md
```

---

## 🧪 API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns JWT)
- `GET /api/auth/me` - Get current user (protected)

### Projects (`/api/projects`)
- `GET /api/projects` - List all user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get single project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project + all slides

### Slides (`/api/slides`)
- `GET /api/slides/project/:projectId` - Get all slides for project
- `POST /api/slides` - Create new slide
- `GET /api/slides/:id` - Get slide by ID
- `PUT /api/slides/:id` - Update slide (data, name, screenshot)
- `DELETE /api/slides/:id` - Delete slide

### Todos (`/api/todos`)
- `GET /api/todos` - Get all user todos
- `POST /api/todos` - Create todo (auto-syncs to calendar)
- `PUT /api/todos/:id` - Update todo (syncs changes)
- `DELETE /api/todos/:id` - Delete todo (deletes linked event)
- `PUT /api/todos/:id/complete` - Toggle completion status

### Calendar (`/api/calendar`)
- `GET /api/calendar/auth/google` - Get OAuth URL
- `GET /api/calendar/callback` - OAuth callback handler
- `GET /api/calendar/status` - Check connection status
- `GET /api/calendar/events` - Get all calendar events
- `POST /api/calendar/addEvent` - Create event (auto-creates todo)
- `PUT /api/calendar/updateEvent` - Update event (updates linked todo)
- `DELETE /api/calendar/deleteEvent` - Delete event (deletes linked todo)
- `DELETE /api/calendar/disconnect` - Remove calendar connection

### AI Chat (`/api/ai`)
- `GET /api/ai/health` - Check AI service status
- `POST /api/ai/index` - Index user data for RAG
- `POST /api/ai/chat` - Stream chat response
- `POST /api/ai/analyze-canvas` - Analyze canvas screenshot
- `GET /api/ai/chat-history/:sessionId` - Get chat messages
- `GET /api/ai/chat-sessions` - Get all chat sessions
- `DELETE /api/ai/chat-sessions/:sessionId` - Delete session

---

## 🙏 Acknowledgments

<div align="center">

**[⬆ Back to Top](#selfish)**

</div>
