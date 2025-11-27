import express from 'express';
import {
    getTodos,
    createTodo,
    getTodoById,
    updateTodo,
    deleteTodo,
    completeTodo,
    getUpcomingTodos,
    linkTodoToCalendar,
} from '../controllers/todoController.js';
import protect from '../middleware/auth.js';

// Create Express router
const router = express.Router();

// ============================================
// EXPLANATION OF ROUTING PATTERN
// ============================================
// All routes are protected with 'protect' middleware
// This middleware:
// 1. Checks if JWT token is in Authorization header
// 2. Verifies the token is valid
// 3. Attaches user info to req.user
// 4. If no token or invalid token, returns 401 Unauthorized

// ============================================
// ROUTES
// ============================================

// @route   GET /api/todos/upcoming
// @desc    Get upcoming todos for dashboard widget
// @access  Protected
// NOTE: This MUST come before /:id route, otherwise "upcoming" will be treated as an ID
router.get('/upcoming', protect, getUpcomingTodos);

// @route   GET /api/todos
// @desc    Get all todos for logged-in user (supports ?status=pending filter)
// @access  Protected
router.get('/', protect, getTodos);

// @route   POST /api/todos
// @desc    Create a new todo
// @access  Protected
router.post('/', protect, createTodo);

// @route   GET /api/todos/:id
// @desc    Get a single todo by ID
// @access  Protected
router.get('/:id', protect, getTodoById);

// @route   PUT /api/todos/:id
// @desc    Update todo (title, description, priority, status, dueDate)
// @access  Protected
router.put('/:id', protect, updateTodo);

// @route   DELETE /api/todos/:id
// @desc    Delete a todo
// @access  Protected
router.delete('/:id', protect, deleteTodo);

// @route   PUT /api/todos/:id/complete
// @desc    Toggle todo completion status (quick complete/uncomplete)
// @access  Protected
router.put('/:id/complete', protect, completeTodo);

// @route   PUT /api/todos/:id/link-calendar
// @desc    Link todo to a Google Calendar event
// @access  Protected
router.put('/:id/link-calendar', protect, linkTodoToCalendar);

// Export the router to be used in server.js
export default router;