import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUpcomingTodos, type Todo } from '../services/api';

/**
 * TodoWidget Component
 * 
 * PURPOSE: Shows top 2 upcoming todos on the dashboard sidebar
 * 
 * FEATURES:
 * - Fetches upcoming todos with due dates
 * - Shows priority color indicator
 * - Displays relative time (e.g., "in 2 hours", "tomorrow")
 * - Links to full todo page
 * - Auto-refreshes when component mounts
 */

export default function TodoWidget() {
    // State to store the upcoming todos (max 2)
    const [upcomingTodos, setUpcomingTodos] = useState<Todo[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch upcoming todos when component mounts
    useEffect(() => {
        fetchUpcomingTodos();
    }, []);

    /**
     * Fetch the top 2 upcoming todos from API
     */
    const fetchUpcomingTodos = async () => {
        try {
            setLoading(true);
            const todos = await getUpcomingTodos(2); // Get top 2
            setUpcomingTodos(todos);
        } catch (error) {
            console.error('Failed to fetch upcoming todos:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Get color for priority indicator
     */
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'bg-red-500';
            case 'medium':
                return 'bg-yellow-500';
            case 'low':
                return 'bg-green-500';
            default:
                return 'bg-gray-500';
        }
    };

    /**
     * Format due date to relative time (e.g., "in 2 hours", "tomorrow")
     */
    const formatRelativeTime = (dueDate: string) => {
        const now = new Date();
        const due = new Date(dueDate);
        const diffMs = due.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        // Overdue
        if (diffMs < 0) {
            return <span className="text-red-400 font-semibold">⚠️ Overdue</span>;
        }

        // Due today
        if (diffDays === 0) {
            if (diffHours === 0) {
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                return <span className="text-orange-400">🔥 {diffMinutes}m</span>;
            }
            return <span className="text-orange-400">🔥 {diffHours}h</span>;
        }

        // Due tomorrow
        if (diffDays === 1) {
            return <span className="text-yellow-300">📅 Tomorrow</span>;
        }

        // Due in X days
        if (diffDays < 7) {
            return <span className="text-gray-300">📅 {diffDays}d</span>;
        }

        // More than a week
        return <span className="text-gray-400">📅 {due.toLocaleDateString()}</span>;
    };

    return (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>📌</span>
                    Upcoming Tasks
                </h3>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="text-center py-4 text-gray-400">
                    <p className="text-sm">Loading...</p>
                </div>
            ) : upcomingTodos.length === 0 ? (
                /* Empty State */
                <div className="text-center py-4 text-gray-400">
                    <div className="text-3xl mb-2">✅</div>
                    <p className="text-sm">No upcoming tasks!</p>
                    <p className="text-xs mt-1">You're all caught up</p>
                </div>
            ) : (
                /* Todo List */
                <div className="space-y-2">
                    {upcomingTodos.map((todo) => (
                        <div
                            key={todo.id}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 transition-all cursor-pointer group"
                            title={todo.description || todo.title}
                        >
                            {/* Priority Indicator Dot + Title */}
                            <div className="flex items-start gap-2">
                                {/* Priority color dot */}
                                <div
                                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getPriorityColor(
                                        todo.priority
                                    )}`}
                                />

                                {/* Todo Title */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate group-hover:text-orange-400 transition-colors">
                                        {todo.title}
                                    </p>

                                    {/* Due Date */}
                                    {todo.dueDate && (
                                        <div className="text-xs mt-1">
                                            {formatRelativeTime(todo.dueDate)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* View All Link */}
            <Link
                to="/todos"
                className="block mt-3 pt-3 border-t border-white/10 text-center text-sm text-orange-400 hover:text-orange-300 transition-colors"
            >
                View All →
            </Link>
        </div>
    );
}
