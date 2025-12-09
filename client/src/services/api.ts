import axios from "axios";

// Interface defining allowed fields for project updates
interface ProjectUpdateData {
  title?: string; // Project title
  canvasData?: unknown; // Tldraw canvas snapshot data (JSON object)
}

// ============================================
// TODO INTERFACES
// ============================================
// TypeScript interfaces for Todo data structure
export interface Todo {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  dueDate?: string; // ISO 8601 datetime string
  calendarEventId?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Interface for creating a new todo (only required/optional fields)
export interface CreateTodoData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in-progress' | 'completed';
  dueDate?: string;
}

// Interface for updating a todo (all fields optional)
export interface UpdateTodoData {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in-progress' | 'completed';
  dueDate?: string;
}

// ============================================
// CHAT SESSION INTERFACES
// ============================================
export interface ChatSession {
  session_id: string;
  title: string;
  created_at: string;
  preview: string;
}

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const register = async (username: string, email: string, password: string) => {
    const response = await API.post('/auth/register', { username, email, password });
    return response.data;
};

export const login = async (email: string, password: string) => {
    const response = await API.post('/auth/login', { email, password });
    return response.data;
};

export const getMe = async () => {
    const response = await API.get('/auth/me');
    return response.data;
};

// Project APIs
export const getProjects = async () => {
    const response = await API.get('/projects');
    return response.data;
};


export const createProject = async (title: string) => {
    const response = await API.post('/projects', { title });
    return response.data;
};


export const getProjectById = async (projectId: string) => {
    const response = await API.get(`/projects/${projectId}`);
    return response.data;
};

export const updateProject = async (projectId: string, data: ProjectUpdateData) => {
    const response = await API.put(`/projects/${projectId}`, data);
    return response.data;
};

export const deleteProject = async (projectId: string) => {
    const response = await API.delete(`/projects/${projectId}`);
    return response.data;
}

// Calendar APIs
export const connectCalendar = async () => {
    const response = await API.get('/calendar/auth/google');
    return response.data;
}

export const disconnectCalendar = async () => {
    const response = await API.delete('/calendar/disconnect');
    return response.data;
}

export const getCalendarEvents = async () => {
    const response = await API.get('/calendar/events');
    return response.data;
}

export const addEvent = async (title: string, start: string, end: string) => {
    // Convert datetime-local format to ISO 8601 with timezone
    const startISO = new Date(start).toISOString();
    const endISO = new Date(end).toISOString();
    const response = await API.post('/calendar/addEvent', { title, start: startISO, end: endISO });
    return response.data;
}

export const updateEvent = async (eventId: string, title: string, start: string, end: string) => {
    // Convert datetime-local format to ISO 8601 with timezone
    const startISO = new Date(start).toISOString();
    const endISO = new Date(end).toISOString();
    const response = await API.put('/calendar/updateEvent', { eventId, title, start: startISO, end: endISO });
    return response.data;
}

export const deleteEvent = async (eventId: string) => {
    const response = await API.delete('/calendar/deleteEvent', { data: { eventId } });
    return response.data;
}

// Slide APIs
export const createSlide = async (projectId: string, name: string) => {
    const response = await API.post('/slides', { projectId, name });
    return response.data;
};
export const getSlidesByProjectId = async (projectId: string) => {
  const response = await API.get(`/slides/project/${projectId}`);
  return response.data;
};
export const updateSlide = async (slideId: string, slideData?: unknown, name?: string, screenshotData?: string) => {
  const response = await API.put(`/slides/${slideId}`, { slideData, name, screenshotData });
  return response.data;
};
export const deleteSlide = async (slideId: string) => {
  const response = await API.delete(`/slides/${slideId}`);
  return response.data;
};

// ============================================
// TODO APIs
// ============================================

/**
 * Get all todos for the logged-in user
 * @param status - Optional filter by status ('pending', 'in-progress', 'completed')
 * @returns Array of todos
 */
export const getTodos = async (status?: string): Promise<Todo[]> => {
  const url = status ? `/todos?status=${status}` : '/todos';
  const response = await API.get(url);
  return response.data;
};

/**
 * Create a new todo
 * @param todoData - Todo creation data (title is required)
 * @returns The created todo
 */
export const createTodo = async (todoData: CreateTodoData): Promise<Todo> => {
  const response = await API.post('/todos', todoData);
  return response.data;
};

/**
 * Get a single todo by ID
 * @param todoId - The todo ID
 * @returns The todo object
 */
export const getTodoById = async (todoId: string): Promise<Todo> => {
  const response = await API.get(`/todos/${todoId}`);
  return response.data;
};

/**
 * Update a todo
 * @param todoId - The todo ID
 * @param updates - Fields to update (all optional)
 * @returns The updated todo
 */
export const updateTodo = async (todoId: string, updates: UpdateTodoData): Promise<Todo> => {
  const response = await API.put(`/todos/${todoId}`, updates);
  return response.data;
};

/**
 * Delete a todo
 * @param todoId - The todo ID
 * @returns Success message
 */
export const deleteTodo = async (todoId: string): Promise<{ message: string }> => {
  const response = await API.delete(`/todos/${todoId}`);
  return response.data;
};

/**
 * Toggle todo completion status
 * @param todoId - The todo ID
 * @returns The updated todo
 */
export const completeTodo = async (todoId: string): Promise<Todo> => {
  const response = await API.put(`/todos/${todoId}/complete`);
  return response.data;
};

/**
 * Get upcoming todos (for dashboard widget)
 * @param limit - Number of todos to return (default: 2)
 * @returns Array of upcoming todos
 */
export const getUpcomingTodos = async (limit: number = 2): Promise<Todo[]> => {
  const response = await API.get(`/todos/upcoming?limit=${limit}`);
  return response.data;
};

/**
 * Link a todo to a Google Calendar event
 * @param todoId - The todo ID
 * @param eventId - The Google Calendar event ID
 * @returns The updated todo
 */
export const linkTodoToCalendar = async (todoId: string, eventId: string): Promise<Todo> => {
  const response = await API.put(`/todos/${todoId}/link-calendar`, { eventId });
  return response.data;
};

// ============================================
// AI CHATBOT APIs
// ============================================

/**
 * Index user data for RAG
 * Call this when user first enables AI or after major updates
 */
export const indexUserData = async (): Promise<{ success: boolean; message: string; indexed_count: number }> => {
  const response = await API.post('/ai/index');
  return response.data;
};

/**
 * Check AI service health
 */
export const checkAIHealth = async (): Promise<{ success: boolean; ai_service: any }> => {
  const response = await API.get('/ai/health');
  return response.data;
};

/**
 * Get chat history for a specific session
 * @param sessionId - The session ID to get messages for (required for specific session)
 * @param limit - Maximum number of messages to return
 * @returns Chat messages for that session, or empty array if no sessionId
 */
export const getChatHistory = async (sessionId?: string, limit = 50): Promise<{ success: boolean; messages: any[] }> => {
  // Build query params
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (sessionId) {
    params.append('session_id', sessionId);
  }
  
  const response = await API.get(`/ai/history?${params.toString()}`);
  return response.data;
};

/**
 * Save a chat message to a session
 * @param role - 'user' or 'model'
 * @param content - Message content
 * @param sessionId - The session ID this message belongs to (REQUIRED)
 */
export const saveChatMessage = async (
  role: string, 
  content: string, 
  sessionId: string
): Promise<{ success: boolean }> => {
  const response = await API.post('/ai/history', { role, content, session_id: sessionId });
  return response.data;
};

/**
 * Get all chat sessions for the current user
 * Returns sessions sorted by most recent first
 */
export const getChatSessions = async (): Promise<{ success: boolean; sessions: ChatSession[] }> => {
  const response = await API.get('/ai/sessions');
  return response.data;
};
/**
 * Delete a chat session and all its messages
 * @param sessionId - The session ID to delete
 */
export const deleteChatSession = async (sessionId: string): Promise<{ success: boolean }> => {
  const response = await API.delete(`/ai/sessions/${sessionId}`);
  return response.data;
};
/**
 * Generate a new unique session ID
 * Uses crypto.randomUUID() for browser-native UUID generation
 */
export const generateSessionId = (): string => {
  return crypto.randomUUID();
};
