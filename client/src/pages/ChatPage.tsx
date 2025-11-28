import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { streamChat, type ChatMessage } from '../services/aiChat';
import { indexUserData, checkAIHealth, getChatHistory, saveChatMessage } from '../services/api';

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

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Check AI service health and load chat history on mount
    useEffect(() => {
        checkAIHealth()
            .then(() => setAiHealthy(true))
            .catch(() => setAiHealthy(false));

        // Load chat history
        getChatHistory(50)
            .then(result => {
                if (result.success && result.messages) {
                    setMessages(result.messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })));
                }
            })
            .catch(err => console.error('Failed to load chat history:', err));
    }, []);

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

        // Save user message to history
        saveChatMessage('user', userMessage.content).catch(err =>
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
                    // Save assistant response to history
                    const assistantContent = currentMessageRef.current;
                    if (assistantContent) {
                        saveChatMessage('assistant', assistantContent).catch(err =>
                            console.error('Failed to save assistant message:', err)
                        );
                    }
                    // Don't clear ref here immediately as pending state updates might need it
                    // It will be cleared at start of next send anyway
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

            {/* Main Content */}
            <main className="pt-28 px-6 pb-6">
                <div className="max-w-4xl mx-auto">

                    {/* Header */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-6">
                        <h2 className="text-3xl font-bold text-white mb-2">
                            🤖 Selfish AI
                        </h2>
                        <p className="text-gray-300">
                            Your intelligent assistant that understands your projects, todos, and canvas work
                        </p>

                        {/* Status Indicators */}
                        <div className="flex gap-4 mt-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${aiHealthy ? 'bg-green-500' : aiHealthy === false ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                <span className="text-sm text-gray-400">
                                    {aiHealthy ? 'AI Service Online' : aiHealthy === false ? 'AI Service Offline' : 'Checking...'}
                                </span>
                            </div>
                            <button
                                onClick={handleIndexData}
                                disabled={isIndexing || !aiHealthy}
                                className="text-sm text-orange-400 hover:text-orange-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                            >
                                {isIndexing ? '⏳ Indexing...' : '🔄 Refresh Data'}
                            </button>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-4 h-[500px] overflow-y-auto">
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
                            <div className="space-y-4">
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

                    {/* Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask me anything about your work..."
                            disabled={isLoading || !aiHealthy}
                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-5 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 backdrop-blur-sm"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim() || !aiHealthy}
                            className="px-8 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
                        >
                            {isLoading ? '...' : 'Send'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
