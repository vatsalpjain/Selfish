/**
 * AI Controller
 * Handles AI chatbot requests by proxying to Python FastAPI service
 */
import axios from 'axios';

// FastAPI service URL (running on port 8000)
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Index user data for RAG
 * Should be called when user first enables AI or after significant updates
 */
export const indexUserData = async (req, res) => {
    try {
        const userId = req.user.id;

        // Call FastAPI indexing endpoint
        const response = await axios.post(`${AI_SERVICE_URL}/index-user-data`, {
            user_id: userId
        }, {
            timeout: 30000 // 30 second timeout for indexing
        });

        res.status(200).json({
            success: true,
            message: response.data.message,
            indexed_count: response.data.indexed_count,
            breakdown: response.data.breakdown
        });

    } catch (error) {
        console.error('Error indexing user data:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to index user data',
            error: error.response?.data?.detail || error.message
        });
    }
};

/**
 * Chat endpoint - streams AI responses
 * Supports conversation history for context
 */
export const chat = async (req, res) => {
    try {
        const userId = req.user.id;
        const { query, history } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Query is required'
            });
        }

        // Set headers for Server-Sent Events (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Call FastAPI chat endpoint with streaming
        const response = await axios.post(`${AI_SERVICE_URL}/chat`, {
            user_id: userId,
            query: query,
            history: history || [],
            stream: true
        }, {
            responseType: 'stream',
            timeout: 60000 // 60 second timeout
        });

        // Pipe the streaming response from FastAPI to client
        response.data.on('data', (chunk) => {
            res.write(chunk);
        });

        response.data.on('end', () => {
            res.end();
        });

        response.data.on('error', (error) => {
            console.error('Stream error:', error);
            res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
            res.end();
        });

    } catch (error) {
        console.error('Error in chat:', error.message);
        
        // If headers not sent yet, send error response
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Chat failed',
                error: error.response?.data?.detail || error.message
            });
        } else {
            // If streaming already started, send error as SSE
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
};

/**
 * Analyze canvas screenshot
 * Uses Gemini Vision API to understand canvas drawings
 */
export const analyzeCanvas = async (req, res) => {
    try {
        const userId = req.user.id;
        const { image_data, query, project_id } = req.body;

        if (!image_data) {
            return res.status(400).json({
                success: false,
                message: 'Image data is required'
            });
        }

        // Set headers for Server-Sent Events (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Call FastAPI canvas analysis endpoint
        const response = await axios.post(`${AI_SERVICE_URL}/analyze-canvas`, {
            user_id: userId,
            image_data: image_data,
            query: query || 'Analyze this canvas',
            project_id: project_id
        }, {
            responseType: 'stream',
            timeout: 60000
        });

        // Pipe the streaming response
        response.data.on('data', (chunk) => {
            res.write(chunk);
        });

        response.data.on('end', () => {
            res.end();
        });

        response.data.on('error', (error) => {
            console.error('Stream error:', error);
            res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
            res.end();
        });

    } catch (error) {
        console.error('Error analyzing canvas:', error.message);
        
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Canvas analysis failed',
                error: error.response?.data?.detail || error.message
            });
        } else {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
};

/**
 * Check AI service health
 */
export const healthCheck = async (req, res) => {
    try {
        const response = await axios.get(`${AI_SERVICE_URL}/health`, {
            timeout: 5000
        });

        res.status(200).json({
            success: true,
            ai_service: response.data,
            connection: 'healthy'
        });

    } catch (error) {
        console.error('AI service health check failed:', error.message);
        res.status(503).json({
            success: false,
            message: 'AI service unavailable',
            error: error.message
        });
    }
};

/**
 * Get chat history for current user
 */
export const getChatHistory = async (req, res) => {
    try {
        const supabase = (await import('../config/supabase.js')).default;
        const userId = req.user.id;
        const { limit = 50, session_id } = req.query;

        // If no session_id provided, return empty (for new chats)
        if (!session_id) {
            return res.status(200).json({
                success: true,
                messages: []
            });
        }
        // Query messages for specific session only
        let query = supabase
            .from('chat_history')
            .select('*')
            .eq('user_id', userId)
            .eq('session_id', session_id) 
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        const { data, error } = await query;

        if (error) throw error;

        // Reverse to get chronological order
        const messages = data.reverse();

        res.status(200).json({
            success: true,
            messages
        });

    } catch (error) {
        console.error('Error getting chat history:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get chat history',
            error: error.message
        });
    }
};
/**
 * Get all chat sessions for current user
 * Returns list of sessions with their first message as title
 */
export const getChatSessions = async (req, res) => {
    try {
        const supabase = (await import('../config/supabase.js')).default;
        const userId = req.user.id;
        // Get all unique session_ids with their earliest message (for title)
        // We'll get all messages grouped by session, then extract first message per session
        const { data: messages, error } = await supabase
            .from('chat_history')
            .select('session_id, content, role, created_at')
            .eq('user_id', userId)
            .not('session_id', 'is', null)  // Only get messages WITH a session_id
            .order('created_at', { ascending: true });
        if (error) throw error;
        // Group messages by session_id and get first user message as title
        const sessionsMap = new Map();
        
        for (const msg of messages) {
            if (!sessionsMap.has(msg.session_id)) {
                // First message of this session - use as title
                sessionsMap.set(msg.session_id, {
                    session_id: msg.session_id,
                    // Use first user message as title, or first message if no user message
                    title: msg.role === 'user' 
                        ? msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')
                        : 'New Chat',
                    created_at: msg.created_at,
                    preview: msg.content.substring(0, 100)
                });
            } else if (msg.role === 'user' && sessionsMap.get(msg.session_id).title === 'New Chat') {
                // Update title with first user message if we haven't found one yet
                const session = sessionsMap.get(msg.session_id);
                session.title = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
            }
        }
        // Convert map to array and sort by created_at descending (newest first)
        const sessions = Array.from(sessionsMap.values())
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.status(200).json({
            success: true,
            sessions
        });
    } catch (error) {
        console.error('Error getting chat sessions:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get chat sessions',
            error: error.message
        });
    }
};
/**
 * Delete a chat session and all its messages
 */
export const deleteChatSession = async (req, res) => {
    try {
        const supabase = (await import('../config/supabase.js')).default;
        const userId = req.user.id;
        const { sessionId } = req.params;
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }
        // Delete all messages for this session (only if user owns them)
        const { error } = await supabase
            .from('chat_history')
            .delete()
            .eq('user_id', userId)
            .eq('session_id', sessionId);
        if (error) throw error;
        res.status(200).json({
            success: true,
            message: 'Session deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting chat session:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete session',
            error: error.message
        });
    }
};
/**
 * Save a chat message
 */
export const saveChatMessage = async (req, res) => {
    try {
        const supabase = (await import('../config/supabase.js')).default;
        const userId = req.user.id;
        const { role, content, session_id } = req.body;

        if (!role || !content) {
            return res.status(400).json({
                success: false,
                message: 'Role and content are required'
            });
        }

        if (!session_id) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }
        // Insert message into chat_history
        const { data, error } = await supabase
            .from('chat_history')
            .insert([{
                user_id: userId,
                role,
                content,
                session_id: session_id 
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: data
        });

    } catch (error) {
        console.error('Error saving chat message:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to save message',
            error: error.message
        });
    }
};

