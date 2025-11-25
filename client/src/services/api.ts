import axios from "axios";

// Interface defining allowed fields for project updates
interface ProjectUpdateData {
  title?: string; // Project title
  canvasData?: unknown; // Tldraw canvas snapshot data (JSON object)
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
// Slide APIs
export const createSlide = async (projectId: string, name: string) => {
    const response = await API.post('/slides', { projectId, name });
    return response.data;
};
export const getSlidesByProjectId = async (projectId: string) => {
  const response = await API.get(`/slides/project/${projectId}`);
  return response.data;
};
export const updateSlide = async (slideId: string, slideData?: unknown, name?: string) => {
  const response = await API.put(`/slides/${slideId}`, { slideData, name });
  return response.data;
};
export const deleteSlide = async (slideId: string) => {
  const response = await API.delete(`/slides/${slideId}`);
  return response.data;
};
