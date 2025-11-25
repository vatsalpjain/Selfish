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
- Persists all canvas state to MongoDB for seamless recovery
- Dark, modern UI with glassmorphism design (Function Health inspired)

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
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                 API LAYER (Express.js)                  │
│  • Project CRUD    • Canvas State Management            │
│  • Slide CRUD      • User Authentication                │
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
           ▼                      ▼
┌────────────────────┐   ┌──────────────────────────────┐
│  AUTH MIDDLEWARE   │   │    CANVAS STATE HANDLER      │
│  • JWT Verify      │   │    • JSON Serialization      │
│  • User Context    │   │    • Large Object Storage    │
└────────────────────┘   └──────────────────────────────┘
           │                      │
           └──────────┬───────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│              DATABASE (MongoDB Atlas)                   │
│  • users           • projects        • canvas_slides    │
│  • sessions        • project_metadata                   │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

**Frontend:**

- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- **tldraw** (canvas library)
- React Router v6 (navigation)
- Axios (API calls)

**Backend:**

- Node.js 18+ with Express
- ES6 Modules
- JWT (authentication)
- bcryptjs (password hashing)
- Mongoose (MongoDB ODM)

**Database:**

- MongoDB Atlas (cloud)
- Collections: users, projects, canvas_slides

**Deployment:**

- Frontend: Vercel (free tier)
- Backend: Render (free tier)
- Database: MongoDB Atlas M0 (free tier)

---

## 2. Flow to add features

1. Database Model/Schema
   ↓
2. Backend API Route
   ↓
3. Backend Controller Logic
   ↓
4. Test Backend with Postman
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
- Token refresh on app load

**Key Files:**

- `context/AuthContext.tsx` - Global auth state
- `middleware/auth.js` - JWT verification
- `models/User.js` - User schema with password hashing
- `pages/Login.tsx`, `pages/Register.tsx` - Auth UI

### 3.2 Project Management (Chalra hai abhi)

**Purpose**: CRUD operations for user projects

**Schema:**

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  title: String,
  description: String (optional),
  thumbnail: String (base64 or URL - optional),
  createdAt: Date,
  updatedAt: Date
}
```

**API Endpoints:**

```
GET    /api/projects          - List all user projects
GET    /api/projects/:id      - Get single project
POST   /api/projects          - Create new project
PUT    /api/projects/:id      - Update project
DELETE /api/projects/:id      - Delete project
```

**Frontend Components:**

- `Dashboard.tsx`  - Project list with create form
- `ProjectCard.tsx` - Individual project display

### 3.3 Canvas Slide System

**Purpose**: Store multiple canvas states per project (one per day/session)

**Schema:**

```javascript
{
  _id: ObjectId,
  projectId: ObjectId (ref: Project),
  slideNumber: Number,
  title: String (e.g., "Day 1", "Session 3"),
  canvasState: Object,  // tldraw JSON
  thumbnail: String (optional - canvas preview),
  createdAt: Date,
  updatedAt: Date
}
```

**Canvas State Structure (tldraw):**

```javascript
{
  shapes: [
    { id: "shape1", type: "draw", x: 100, y: 50, ... },
    { id: "shape2", type: "text", text: "My note", ... },
    { id: "shape3", type: "sticky", ... }
  ],
  bindings: [...],  // Connections between shapes
  assets: [...]     // Images, files
}
```

**API Endpoints:**

```
GET    /api/projects/:id/slides        - List all slides
GET    /api/slides/:slideId            - Get slide with canvas state
POST   /api/projects/:id/slides        - Create new slide
PUT    /api/slides/:slideId            - Update canvas state
DELETE /api/slides/:slideId            - Delete slide
```

### 3.4 Canvas Editor (tldraw Integration)

**Purpose**: Infinite canvas with drawing, shapes, text, sticky notes

**Features:**

- Freehand drawing with pen tool
- Shapes (rectangle, circle, arrow, line)
- Text boxes and sticky notes
- Image upload and embedding
- Zoom and pan controls
- Undo/redo functionality
- Export canvas as PNG/SVG

**Key Functions:**

```typescript
// Load canvas from saved state
canvas.loadFromJSON(canvasData)

// Save canvas state to backend
const canvasJSON = canvas.toJSON()
await saveCanvasState(slideId, canvasJSON)

// Auto-save every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    saveCanvasState()
  }, 30000)
  return () => clearInterval(interval)
}, [])
```

**Component Structure:**

```typescript
<ProjectCanvas projectId={id}>
  <SlideNavigation slides={slides} />
  <TldrawEditor 
    initialData={currentSlide.canvasState}
    onSave={handleSave}
  />
  <Toolbar />
</ProjectCanvas>
```

### 3.5 UI/UX Design System

**Design Principles:**

- Dark mode by default (`bg-gray-900`)
- Glassmorphism effects (`backdrop-blur`, `bg-white/10`)
- Floating elements with transparency
- Orange accent color (#f97316)
- Smooth transitions and hover states

**Component Patterns:**

```tsx
// Glassmorphism Card
<div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-6">

// Floating Navbar
<nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur-lg">

// Orange CTA Button
<button className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
```

---

## 4. Development Phases

### Phase 1: Core Infrastructure (DONE)

**Deliverables:**

1. [X] Backend API with Express + MongoDB
2. [X] User authentication (register, login, JWT)
3. [X] Frontend auth pages (Login, Register)
4. [X] Protected route system
5. [X] Dashboard with project list
6. [X] Basic styling with Tailwind
7. [X] Deployed to development environment

**Status:** COMPLETE

- Backend: Running on localhost:5000
- Frontend: Running on localhost:5173
- Auth flow working end-to-end

---

### Phase 2: Project Management (Chalra hai)

**Goal:** Full CRUD for projects with API integration

**Tasks:**

1. [X] Backend: Create Project model and routes
2. [X] Backend: Implement project CRUD controllers
3. [X] Backend: Add project-user association
4. [X] Frontend: Update Dashboard with real API calls
5. [X] Frontend: Add project creation flow
6. [X] Frontend: Add project edit/delete functionality
7. [X] Frontend: Add empty states and loading indicators
8. [X] Test: Full project lifecycle

**Success Criteria:**

- Can create, view, edit, delete projects
- Projects persist across sessions
- UI shows real-time updates

**Estimated Time:** 3-4 days

---

### Phase 3: Canvas Integration (Week 2-3)

**Goal:** Working canvas editor with tldraw

**Tasks:**

1. [X] Install and configure tldraw library
2. [X] Create ProjectCanvas page component
3. [X] Implement canvas state save/load
4. [ ] Add slide navigation sidebar
5. [ ] Implement "New Slide" functionality
6. [ ] Add auto-save (every 30 seconds)
7. [ ] Add manual save button with feedback
8. [ ] Style canvas UI with dark theme
9. [ ] Test: Draw, save, reload, verify persistence

**Success Criteria:**

- Can draw on canvas and see shapes
- Canvas state saves to MongoDB
- Reloading page restores canvas
- Multiple slides per project work

**Estimated Time:** 4-5 days

---

### Phase 4: Slides System (Week 3)

**Goal:** Multiple canvas slides per project

**Tasks:**

1. [ ] Backend: Create Slide model and routes
2. [ ] Backend: Implement slide CRUD
3. [ ] Frontend: Slide navigation component
4. [ ] Frontend: "Previous/Next Slide" buttons
5. [ ] Frontend: Slide thumbnail generation
6. [ ] Frontend: Slide deletion with confirmation
7. [ ] Frontend: Slide reordering (drag-and-drop)
8. [ ] Test: Create 5 slides, navigate, delete

**Success Criteria:**

- Can create unlimited slides per project
- Navigation between slides is smooth
- Each slide maintains its own canvas state
- Thumbnails show canvas preview

**Estimated Time:** 3-4 days

---

### Phase 5: Polish & UX (Week 4)

**Goal:** Professional UI and smooth user experience

**Tasks:**

1. [ ] Add loading skeletons for all async operations
2. [ ] Implement error handling with toast notifications
3. [ ] Add confirmation modals for destructive actions
4. [ ] Optimize canvas rendering performance
5. [ ] Add keyboard shortcuts (Ctrl+S to save, etc.)
6. [ ] Implement responsive design (mobile-friendly)
7. [ ] Add project search/filter on dashboard
8. [ ] Add recent projects section
9. [ ] Create 404 and error pages
1. [ ] Write comprehensive error messages

**Success Criteria:**

- No jarring UI transitions
- Clear feedback for all actions
- Works on mobile (basic functionality)
- Professional, polished feel

**Estimated Time:** 3-4 days

---

### Phase 6: Deployment & Documentation (Week 4-5)

**Goal:** Production-ready deployment with docs

**Tasks:**

1. [ ] Deploy backend to Render
2. [ ] Deploy frontend to Vercel
3. [ ] Configure MongoDB Atlas production database
4. [ ] Setup environment variables for production
5. [ ] Add CORS configuration for production URLs
6. [ ] Write comprehensive README
7. [ ] Create demo video (3-5 minutes)
8. [ ] Add code comments and documentation
9. [ ] Create user guide (how to use)
1. [ ] Performance testing and optimization

**Success Criteria:**

- App accessible via public URL
- All features work in production
- Clear documentation for future development
- Demo video showcases key features

**Estimated Time:** 2-3 days

---

## 5. Database Schema Details

### Users Collection

```javascript
{
  _id: ObjectId,
  username: String (unique, required),
  email: String (unique, required),
  password: String (hashed, required),
  createdAt: Date,
  updatedAt: Date
}
```

### Projects Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: "User"),
  title: String (required),
  description: String,
  thumbnail: String,  // Base64 or URL
  slideCount: Number (default: 0),
  lastOpenedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Canvas Slides Collection

```javascript
{
  _id: ObjectId,
  projectId: ObjectId (ref: "Project"),
  slideNumber: Number (auto-increment per project),
  title: String (default: "Slide {number}"),
  canvasState: {
    shapes: Array,
    bindings: Array,
    assets: Array,
    viewport: Object
  },
  thumbnail: String,  // Canvas preview as base64
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

```javascript
// Projects
db.projects.createIndex({ userId: 1, createdAt: -1 })
db.projects.createIndex({ userId: 1, lastOpenedAt: -1 })

// Slides
db.canvas_slides.createIndex({ projectId: 1, slideNumber: 1 })
db.canvas_slides.createIndex({ projectId: 1, createdAt: -1 })
```

---

## 6. API Endpoints Reference

### Authentication

```
POST   /api/auth/register    - Create new user
POST   /api/auth/login       - Login user
GET    /api/auth/me          - Get current user (protected)
```

### Projects

```
GET    /api/projects                - List all user projects
POST   /api/projects                - Create new project
GET    /api/projects/:id            - Get single project
PUT    /api/projects/:id            - Update project
DELETE /api/projects/:id            - Delete project (and all slides)
GET    /api/projects/recent         - Get recently opened projects
```

### Canvas Slides

```
GET    /api/projects/:projectId/slides          - List all slides for project
POST   /api/projects/:projectId/slides          - Create new slide
GET    /api/slides/:slideId                     - Get slide with canvas state
PUT    /api/slides/:slideId                     - Update canvas state
DELETE /api/slides/:slideId                     - Delete slide
PUT    /api/slides/:slideId/reorder             - Reorder slides
```

---

## 7. Frontend Routes

```typescript
// Public Routes
/login           - Login page
/register        - Register page

// Protected Routes (require authentication)
/dashboard       - Project list + create
/project/:id     - Canvas editor for project
  - Query params: ?slide=1  (default to slide 1)

// Future Routes
/settings        - User settings
/profile         - User profile
```

---

## 8. Key Technical Decisions

### Why tldraw?

- **Production-ready**: Used by major companies
- **Flexible**: Supports custom shapes and tools
- **Performant**: Handles large canvases smoothly
- **JSON Export**: Easy to serialize to MongoDB
- **Open Source**: Free for personal projects

### Why Multiple Slides vs. Single Canvas?

- **Organization**: Natural day-by-day progression
- **Performance**: Smaller canvas states = faster load
- **Mental Model**: Matches notebook/presentation metaphor
- **History**: Can see project evolution over time

### Why MongoDB Over SQL?

- **Schema Flexibility**: Canvas state is JSON (perfect for MongoDB)
- **Easy Setup**: Atlas free tier is generous
- **Document Model**: Projects and slides are natural documents
- **Learning Value**: NoSQL experience on resume

### Why Dark Theme Default?

- **Modern Aesthetic**: Matches design tools (Figma, VS Code)
- **Reduced Eye Strain**: Better for long sessions
- **Canvas Contrast**: White/colored shapes pop on dark background
- **Professional**: Looks polished and intentional

---

## 9. Development Workflow

### Daily Development Cycle

**Morning (Planning):**

1. Review current phase tasks
2. Pick 2-3 tasks for the day
3. Write failing tests (if applicable)

**Afternoon (Implementation):**
4. Implement backend endpoint
5. Test with Postman/Thunder Client
6. Implement frontend component
7. Connect to API and test in browser

**Evening (Polish):**
8. Add error handling
9. Style component with Tailwind
10. Commit with descriptive message
11. Update blueprint with progress

### Git Workflow

```bash
# Feature branches
git checkout -b feature/project-crud
git commit -m "feat: add project CRUD endpoints"
git push origin feature/project-crud

# Merge to main after testing
git checkout main
git merge feature/project-crud
```

### Testing Strategy

**Manual Testing:**

- Test each API endpoint with Thunder Client
- Test each UI flow in browser
- Test auth flow end-to-end
- Test canvas save/load functionality

**Automated Testing (Phase 6):**

- Backend: Jest + Supertest
- Frontend: React Testing Library
- E2E: Playwright (optional)

---

## 10. Success Metrics

### Technical Metrics

- **Canvas Save Time**: < 500ms for typical canvas
- **Page Load Time**: < 2s for dashboard
- **Canvas Load Time**: < 1s to render saved state
- **API Latency**: P95 < 300ms
- **Database Queries**: Optimized with indexes

### User Experience Metrics

- **Time to First Canvas**: < 30 seconds from signup
- **Auto-save Reliability**: 100% success rate
- **Canvas Responsiveness**: 60 FPS during drawing
- **Mobile Usability**: Basic functionality works on phone

### Portfolio Impact

- "Built visual project tracker with **infinite canvas** using React + tldraw"
- "Implemented **real-time canvas persistence** to MongoDB"
- "Designed **glassmorphism UI** with Tailwind CSS"
- "Deployed full-stack MERN app to **Vercel + Render** (free tier)"

---

## 11. Future Enhancements (Post-MVP)

### Phase 7: Advanced Features

- [ ] Collaboration (share projects, real-time cursors)
- [ ] Templates (pre-built canvas layouts)
- [ ] Export (PDF, PNG, SVG)
- [ ] Version history (time-travel through canvas states)
- [ ] Tags and categories for projects
- [ ] Full-text search across all canvases

### Phase 8: AI Integration

- [ ] AI-powered canvas suggestions
- [ ] Automatic organization of shapes
- [ ] Text-to-shape generation
- [ ] Smart connectors between elements

---

## 12. Risk Mitigation

| Risk                                      | Impact | Mitigation                                          |
| ----------------------------------------- | ------ | --------------------------------------------------- |
| tldraw learning curve                     | Medium | Follow official docs, use examples, join Discord    |
| Large canvas states (MongoDB size limits) | Medium | Compress JSON, paginate slides, lazy load           |
| Free tier limitations                     | Low    | Monitor usage, optimize queries, cache aggressively |
| Deployment complexity                     | Low    | Use Docker for local dev, document deployment steps |

---

## 14. Timeline Summary

**Total Project Duration**: 4-5 weeks

- **Week 1**: ✅ Authentication & Infrastructure (DONE)
- **Week 2**: 🔄 Project Management + Canvas Integration (CURRENT)
- **Week 3**: Slides System + Basic Features
- **Week 4**: Polish + UX Improvements
- **Week 5**: Deployment + Documentation

**Minimum Viable Product**: End of Week 3
**Portfolio Ready**: End of Week 4
**Fully Polished**: End of Week 5

---

## 15. Resources & References

### Documentation

- [tldraw Docs](https://tldraw.dev)
- [MongoDB Mongoose Guide](https://mongoosejs.com/docs/guide.html)
- [React Router v6](https://reactrouter.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Example Projects

- [tldraw Examples](https://github.com/tldraw/tldraw/tree/main/apps)
- [Excalidraw](https://github.com/excalidraw/excalidraw) - Similar concept

### Design Inspiration

- Function Health (glassmorphism, dark theme)
- Notion (project organization)
- Figma (canvas interactions)

---

## Conclusion

**Selfish** combines visual freedom with persistent cloud storage, creating a unique project tracking experience. The phased approach ensures steady progress from working authentication to a fully-featured canvas editor.

**Key Success Factors:**

1. Build incrementally (auth → projects → canvas → slides)
2. Test each component thoroughly before moving on
3. Keep UI consistent with dark glassmorphism theme
4. Focus on canvas performance and reliability
5. Document as you build

**Start Now:** Complete Phase 2 (Project CRUD) within 2-3 days, then move to canvas integration. The foundation is solid—time to build the unique canvas experience!
