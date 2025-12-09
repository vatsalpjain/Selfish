import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { streamChat, type ChatMessage } from '../services/aiChat';
import {
    indexUserData,
    checkAIHealth,
    getChatHistory,
    saveChatMessage,
    getChatSessions,
    deleteChatSession,
    generateSessionId,
    type ChatSession
} from '../services/api';

/**
 * AI Chat Page
 * Streaming chat interface with RAG-powered AI assistant
 */
export default function ChatPage() {
    const { logout } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isIndexing, setIsIndexing] = useState(false);
    const [aiHealthy, setAiHealthy] = useState<boolean | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const currentMessageRef = useRef<string>('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // ===== Session Management State =====
    const [sessions, setSessions] = useState<ChatSession[]>([]);           // List of all sessions
    const [currentSessionId, setCurrentSessionId] = useState<string>('');  // Active session ID
    const [showSidebar, setShowSidebar] = useState(true);                  // Toggle sidebar visibility
    const [sessionsLoading, setSessionsLoading] = useState(true);          // Loading state for sessions

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto-resize textarea based on content
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const maxHeight = 128;
            const newHeight = Math.min(textarea.scrollHeight, maxHeight);
            textarea.style.height = `${newHeight}px`;
            // Show scrollbar only when content exceeds max height
            textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
        }
    }, [input]);


    // ===== Session Management Functions =====

    /**
     * Load all sessions from backend
     */
    const loadSessions = useCallback(async () => {
        try {
            setSessionsLoading(true);
            const result = await getChatSessions();
            if (result.success) {
                setSessions(result.sessions);
            }
        } catch (err) {
            console.error('Failed to load sessions:', err);
        } finally {
            setSessionsLoading(false);
        }
    }, []);

    /**
     * Start a new chat session
     * Clears messages and generates a new session ID
     */
    const handleNewChat = useCallback(() => {
        const newSessionId = generateSessionId();
        setCurrentSessionId(newSessionId);
        setMessages([]);  // Clear current messages
        // Save to localStorage so it persists on refresh
        localStorage.setItem('currentChatSessionId', newSessionId);
    }, []);

    /**
     * Switch to an existing session
     * Loads messages for that session
     */
    const handleSwitchSession = useCallback(async (sessionId: string) => {
        try {
            setCurrentSessionId(sessionId);
            localStorage.setItem('currentChatSessionId', sessionId);

            // Load messages for this session
            const result = await getChatHistory(sessionId, 50);
            if (result.success && result.messages) {
                setMessages(result.messages.map(msg => ({
                    role: msg.role === 'model' ? 'assistant' : msg.role,
                    content: msg.content
                })));
            }
        } catch (err) {
            console.error('Failed to load session messages:', err);
        }
    }, []);

    /**
     * Delete a session and refresh the list
     */
    const handleDeleteSession = useCallback(async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();  // Prevent triggering session switch

        if (!confirm('Delete this chat? This cannot be undone.')) return;

        try {
            await deleteChatSession(sessionId);

            // If we deleted the current session, start a new one
            if (sessionId === currentSessionId) {
                handleNewChat();
            }

            // Refresh sessions list
            await loadSessions();
        } catch (err) {
            console.error('Failed to delete session:', err);
        }
    }, [currentSessionId, handleNewChat, loadSessions]);

    // ===== Initialize on mount =====
    useEffect(() => {
        // Check AI service health
        checkAIHealth()
            .then(() => setAiHealthy(true))
            .catch(() => setAiHealthy(false));

        // Load all sessions
        loadSessions();

        // Try to restore last session from localStorage, or start new chat
        const savedSessionId = localStorage.getItem('currentChatSessionId');

        if (savedSessionId) {
            // Restore previous session
            handleSwitchSession(savedSessionId);
        } else {
            // Start with a fresh chat (new session)
            handleNewChat();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);  // Intentionally only run once on mount

    // Index user data
    const handleIndexData = async () => {
        setIsIndexing(true);
        try {
            const result = await indexUserData();
            alert(`✅ Indexed ${result.indexed_count} items!\n${result.message}`);
        } catch (error) {
            alert('❌ Failed to index data. Make sure AI service is running.');
        } finally {
            setIsIndexing(false);
        }
    };

    // Send message
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: input.trim()
        };

        // Add user message and placeholder assistant message together
        setMessages(prev => [
            ...prev,
            userMessage,
            { role: 'assistant', content: '' }
        ]);

        setInput('');
        setIsLoading(true);
        currentMessageRef.current = '';

        // Save user message to history WITH session ID
        saveChatMessage('user', userMessage.content, currentSessionId).catch(err =>
            console.error('Failed to save user message:', err)
        );

        try {
            await streamChat(
                userMessage.content,
                messages,
                // onChunk
                (chunk) => {
                    currentMessageRef.current += chunk;
                    // Capture current text to avoid race condition with onEnd clearing the ref
                    const textSoFar = currentMessageRef.current;

                    setMessages(prev => {
                        const newMessages = [...prev];
                        // Update the last message (assistant's response)
                        const lastIndex = newMessages.length - 1;
                        if (lastIndex >= 0) {
                            newMessages[lastIndex] = {
                                role: 'assistant',
                                content: textSoFar
                            };
                        }
                        return newMessages;
                    });
                },
                // onEnd
                () => {
                    setIsLoading(false);
                    // Save assistant response to history WITH session ID
                    const assistantContent = currentMessageRef.current;
                    if (assistantContent) {
                        saveChatMessage('model', assistantContent, currentSessionId).catch(err =>
                            console.error('Failed to save model message:', err)
                        );
                    }
                    // Refresh sessions list to show new/updated session
                    loadSessions();
                },
                // onError
                (error) => {
                    setIsLoading(false);
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastIndex = newMessages.length - 1;
                        newMessages[lastIndex] = {
                            role: 'assistant',
                            content: `❌ Error: ${error}`
                        };
                        return newMessages;
                    });
                }
            );
        } catch (error) {
            setIsLoading(false);
            console.error('Send error:', error);
        }
    };

    return (
        <div
            className="min-h-screen bg-gray-900"
            style={{
                backgroundImage: "url(/background.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
            }}
        >
            {/* Floating Navbar */}
            <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4">
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl px-6 py-3">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-extralight tracking-wider text-white">Selfish</h1>
                        <div className="flex items-center gap-4">
                            <Link to="/dashboard" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all font-medium">
                                Dashboard
                            </Link>
                            <Link to="/calendar" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all font-medium">
                                📅 Calendar
                            </Link>
                            <Link to="/todos" className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all font-medium">
                                ✅ Todos
                            </Link>
                            <Link to="/ai-chat" className="px-4 py-2 text-white bg-white/20 rounded-lg transition-all font-medium">
                                🤖 AI Chat
                            </Link>
                            <button className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-colors font-medium" onClick={logout}>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content with Sidebar */}
            <div className="pt-28 px-6 pb-4 flex gap-4 max-w-7xl mx-auto h-[calc(100vh-20px)]">

                {/* ===== Sessions Sidebar ===== */}
                {showSidebar && (
                    <aside className="w-64 flex-shrink-0">
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 h-full flex flex-col">

                            {/* New Chat Button */}
                            <button
                                onClick={handleNewChat}
                                className="w-full mb-4 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <span>✨</span> New Chat
                            </button>

                            {/* Sessions List */}
                            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                                    Chat History
                                </h3>

                                {sessionsLoading ? (
                                    <div className="text-center text-gray-500 py-4">Loading...</div>
                                ) : sessions.length === 0 ? (
                                    <div className="text-center text-gray-500 py-4 text-sm">
                                        No chat history yet
                                    </div>
                                ) : (
                                    sessions.map((session) => (
                                        <div
                                            key={session.session_id}
                                            onClick={() => handleSwitchSession(session.session_id)}
                                            className={`group relative p-3 rounded-xl cursor-pointer transition-all ${currentSessionId === session.session_id
                                                ? 'bg-orange-500/20 border border-orange-500/30'
                                                : 'bg-white/5 hover:bg-white/10 border border-transparent'
                                                }`}
                                        >
                                            {/* Session Title */}
                                            <div className="text-sm text-white truncate pr-6">
                                                {session.title}
                                            </div>

                                            {/* Session Date */}
                                            <div className="text-xs text-gray-500 mt-1">
                                                {new Date(session.created_at).toLocaleDateString()}
                                            </div>

                                            {/* Delete Button (shows on hover) */}
                                            <button
                                                onClick={(e) => handleDeleteSession(session.session_id, e)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-opacity"
                                                title="Delete chat"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Toggle Sidebar Button (inside sidebar) */}
                            <button
                                onClick={() => setShowSidebar(false)}
                                className="mt-2 pt-2 border-t border-white/10 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                ← Hide sidebar
                            </button>
                        </div>
                    </aside>
                )}

                {/* Collapsed Sidebar Strip (when hidden) - slim vertical bar */}
                {!showSidebar && (
                    <aside
                        onClick={() => setShowSidebar(true)}
                        className="w-10 flex-shrink-0 cursor-pointer group"
                    >
                        <div className="bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl h-full flex flex-col items-center py-4 transition-all">
                            {/* Expand icon */}
                            <div className="text-gray-400 group-hover:text-orange-400 transition-colors mb-2">
                                →
                            </div>
                            {/* Vertical text */}
                            <div className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                                Chat History
                            </div>
                        </div>
                    </aside>
                )}

                {/* Main Chat Area - expands when sidebar hidden */}
                <main className={`flex-1 flex flex-col min-h-0 ${showSidebar ? 'max-w-4xl' : ''}`}>

                    {/* Header - Compact */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 mb-3 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    🤖 Selfish AI
                                </h2>
                                <p className="text-gray-400 text-sm">
                                    Your intelligent assistant for projects, todos, and canvas
                                </p>
                            </div>
                            {/* Status Indicators */}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${aiHealthy ? 'bg-green-500' : aiHealthy === false ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                    <span className="text-xs text-gray-400">
                                        {aiHealthy ? 'Online' : aiHealthy === false ? 'Offline' : '...'}
                                    </span>
                                </div>
                                <button
                                    onClick={handleIndexData}
                                    disabled={isIndexing || !aiHealthy}
                                    className="text-xs text-orange-400 hover:text-orange-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isIndexing ? '⏳' : '🔄 Refresh'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Chat Messages - Fills remaining space */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 mb-3 flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <p className="text-lg mb-4">👋 Hi! I'm your Selfish AI assistant.</p>
                                <p className="text-sm mb-6">Ask me about your projects, todos, or anything else!</p>
                                <div className="grid grid-cols-2 gap-4 max-w-md">
                                    <button onClick={() => setInput('What projects am I working on?')} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-all">
                                        📊 My projects
                                    </button>
                                    <button onClick={() => setInput('What are my upcoming todos?')} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-all">
                                        ✅ My todos
                                    </button>
                                    <button onClick={() => setInput('Help me organize my work')} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-all">
                                        🎯 Organize work
                                    </button>
                                    <button onClick={() => setInput('Give me productivity tips')} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-all">
                                        💡 Tips
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 w-full overflow-hidden">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-orange-500 text-white' : 'bg-white/10 backdrop-blur-sm border border-white/10 text-gray-100'}`}>
                                            <div className="text-xs mb-1 opacity-70">
                                                {msg.role === 'user' ? 'You' : '🤖 AI'}
                                            </div>
                                            <div className="whitespace-pre-wrap">{msg.content}</div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Input - Fixed at bottom */}
                    <div className="flex gap-2 flex-shrink-0">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder="Ask me anything about your work..."
                            disabled={isLoading || !aiHealthy}
                            rows={1}
                            className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 backdrop-blur-sm resize-none max-h-32 min-h-[42px] break-all"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim() || !aiHealthy}
                            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
                        >
                            {isLoading ? '...' : 'Send'}
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
}
