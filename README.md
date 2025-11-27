# Selfish

> A visual-first project management platform combining infinite canvas workspace with intelligent calendar integration.



## 🎯 Overview

**Selfish** is a modern project management tool that breaks free from traditional list-based interfaces. Built for individuals who think visually, it combines an infinite canvas workspace (powered by tldraw) with Google Calendar integration, all wrapped in a sleek glassmorphism UI.

Think less todo-list, more creative workspace.

### Key Features

- **Infinite Canvas** - Freehand drawing, sticky notes, shapes, and text on unlimited 2D space
- **Project Slides** - Multiple canvas states per project for iterative development
- **Smart Calendar** - Google Calendar integration with auto-refresh tokens and event management
- **Visual Planning** - See connections between tasks, ideas, and goals
- **Auto-Save** - All canvas state persisted to MongoDB in real-time
- **Dark Mode** - Function Health-inspired glassmorphism design

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (React + TS)           │
│  • Canvas Editor (tldraw)               │
│  • Calendar Management                  │
│  • Project Dashboard                    │
└──────────────┬──────────────────────────┘
               │ REST API
               ▼
┌─────────────────────────────────────────┐
│       Backend (Node.js + Express)       │
│  • JWT Authentication                   │
│  • Google OAuth 2.0                     │
│  • Canvas State Management              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Database (MongoDB Atlas)        │
│  • Users • Projects • Canvas Slides     │
│  • Calendar Tokens                      │
└─────────────────────────────────────────┘
```

---

## 🚀 Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **tldraw** - Canvas library
- **React Router v6** - Navigation
- **Axios** - HTTP client

### Backend
- **Node.js 18+** - Runtime
- **Express** - Web framework
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **googleapis** - Google Calendar API
- **bcryptjs** - Password hashing

### Database
- **MongoDB Atlas** - Cloud database
- Collections: `users`, `projects`, `canvas_slides`, `calendar_tokens`

---

## 📸 Screenshots

### Dashboard
<img width="2213" height="1187" alt="image" src="https://github.com/user-attachments/assets/0c24f19b-d8fb-4db6-9ac4-d5b23821f14f" />

### Canvas Editor
<img width="2239" height="1196" alt="image" src="https://github.com/user-attachments/assets/f65014a0-1766-4281-810c-711670755e13" />

### Calendar Integration
<img width="2239" height="1190" alt="image" src="https://github.com/user-attachments/assets/3c2a7b7b-b99d-46ed-8643-d5ee8fcfa776" />

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Google Cloud Console project (for Calendar API)

### Environment Variables

**Backend** (`.env` in `/server`)
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
GOOGLE_CLIENT_ID=your_google_clientid
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/calendar/auth/google/callback
```

**Frontend** (`.env` in `/client`)
```env
VITE_API_URL=http://localhost:5000
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
   ```

3. **Start development servers**
   ```bash
   # Backend (from /server)
   npm start

   # Frontend (from /client)
   npm run dev
   ```

4. **Access the application**
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:5000`

---

## 🎨 Features Deep Dive

### Canvas Workspace
- **Infinite 2D space** for visual planning
- **Multiple tools**: Pen, shapes, text, sticky notes
- **Slide system**: Create multiple canvas states per project
- **Auto-save**: Real-time persistence to MongoDB
- **JSON serialization**: Efficient storage of tldraw state

### Calendar Management
- **Google Calendar sync** via OAuth 2.0
- **CRUD operations**: Create, edit, delete events
- **Search & filter**: Find events by title
- **Auto-refresh tokens**: Seamless background token renewal
- **Smart time zones**: Automatic timezone handling

### Project Management
- **Dashboard view**: All projects at a glance
- **Project slides**: Day-by-day progression tracking
- **Quick actions**: Create, edit, delete projects
- **Real-time updates**: Instant UI feedback

---

## 🔐 Security

- **JWT-based authentication** with HTTP-only cookies
- **Password hashing** using bcryptjs with salt rounds
- **Protected routes** on both frontend and backend
- **OAuth 2.0** for Google Calendar access
- **Token refresh** with secure refresh token storage
- **Environment variable** configuration for sensitive data

---

## 📁 Project Structure

```
selfish/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React context providers
│   │   ├── pages/         # Route components
│   │   ├── services/      # API service layer
│   │   └── App.tsx        # Main app component
│   └── package.json
│
├── server/                # Backend Node.js application
│   ├── controllers/       # Request handlers
│   ├── middleware/        # Custom middleware
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API routes
│   ├── server.js         # Entry point
│   └── package.json
│
└── README.md
```

---

## 🧪 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Projects
- `GET /api/projects` - Get all user projects
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Canvas Slides
- `GET /api/slides/project/:projectId` - Get project slides
- `POST /api/slides` - Create new slide
- `PUT /api/slides/:id` - Update slide canvas data
- `DELETE /api/slides/:id` - Delete slide

### Calendar
- `GET /api/calendar/status` - Check connection status
- `GET /api/calendar/events` - Fetch calendar events
- `POST /api/calendar/addEvent` - Create event
- `PUT /api/calendar/updateEvent` - Update event
- `DELETE /api/calendar/deleteEvent` - Delete event
- `GET /api/calendar/auth/google` - Initiate OAuth flow
- `DELETE /api/calendar/disconnect` - Disconnect calendar

---




## 🙏 Acknowledgments

<div align="center">

**[⬆ Back to Top](#selfish)**

Crazy

</div>
