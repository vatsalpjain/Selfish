import express from 'express';
import protect from '../middleware/auth.js';
import { 
  healthCheck, 
  indexUserData, 
  chat, 
  analyzeCanvas,
  getChatHistory,
  saveChatMessage,
  getChatSessions,     
  deleteChatSession    
} from '../controllers/aiController.js';

const router = express.Router();

// Health check
router.get('/health', healthCheck);

// Index user data for RAG
router.post('/index', protect, indexUserData);

// Chat endpoint
router.post('/chat', protect, chat);

// Canvas analysis
router.post('/analyze-canvas', protect, analyzeCanvas);

// Chat history
router.get('/history', protect, getChatHistory);
router.post('/history', protect, saveChatMessage);

// Chat sessions management
router.get('/sessions', protect, getChatSessions);           // Get all user's chat sessions
router.delete('/sessions/:sessionId', protect, deleteChatSession);  // Delete a session

export default router;
