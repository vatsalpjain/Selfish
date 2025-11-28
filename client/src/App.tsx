// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ProjectPage from './pages/ProjectPage';
import CalenderPage from './pages/Calender';
import TodoPage from './pages/TodoPage';
import ChatPage from './pages/ChatPage';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root - Redirect to dashboard if logged in, otherwise login */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Calendar Page - Protected Route */}
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <CalenderPage />
            </ProtectedRoute>
          }
        />

        {/* Todo Page - Protected Route */}
        <Route
          path="/todos"
          element={
            <ProtectedRoute>
              <TodoPage />
            </ProtectedRoute>
          }
        />

        {/* Individual Project Page - Protected Route */}
        <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <ProjectPage />
            </ProtectedRoute>
          }
        />

        {/* AI Chat Page - Protected Route */}
        <Route
          path="/ai-chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;