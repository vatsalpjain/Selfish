import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    getTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    completeTodo,
    type Todo,
    type CreateTodoData,
} from '../services/api';

/**
 * TodoPage Component
 * 
 * PURPOSE: Full todo management page with CRUD operations
 * 
 * FEATURES:
 * - Create new todos with title, description, priority, due date
 * - View all todos with filtering (All, Pending, Completed)
 * - Update todo title, priority, status inline
 * - Mark todos as complete/incomplete
 * - Delete todos
 * - Visual priority indicators
 * - Due date warnings (overdue, today, upcoming)
 * - Responsive design matching Dashboard aesthetic
 */

export default function TodoPage() {
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    const [todos, setTodos] = useState<Todo[]>([]);
    const [filteredTodos, setFilteredTodos] = useState<Todo[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');

    // Form state for creating new todos
    const [newTodo, setNewTodo] = useState<CreateTodoData>({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
    });

    // Edit mode state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    // ============================================
    // FETCH TODOS ON MOUNT
    // ============================================
    useEffect(() => {
        fetchTodos();
    }, []);

    // Filter todos whenever filter or todos change
    useEffect(() => {
        filterTodos();
    }, [filter, todos]);

    /**
     * Fetch all todos from API
     */
    const fetchTodos = async () => {
        try {
            setLoading(true);
            const data = await getTodos();
            setTodos(data);
        } catch (error) {
            console.error('Failed to fetch todos:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Filter todos based on selected filter
     */
    const filterTodos = () => {
        if (filter === 'all') {
            setFilteredTodos(todos);
        } else {
            setFilteredTodos(todos.filter((todo) => todo.status === filter));
        }
    };

    // ============================================
    // CREATE TODO
    // ============================================
    const handleCreateTodo = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newTodo.title.trim()) {
            alert('Title is required');
            return;
        }

        try {
            const created = await createTodo({
                title: newTodo.title,
                description: newTodo.description || undefined,
                priority: newTodo.priority,
                dueDate: newTodo.dueDate || undefined,
            });

            setTodos([created, ...todos]); // Add to top of list

            // Reset form
            setNewTodo({
                title: '',
                description: '',
                priority: 'medium',
                dueDate: '',
            });
        } catch (error) {
            console.error('Failed to create todo:', error);
            alert('Failed to create todo');
        }
    };

    // ============================================
    // TOGGLE COMPLETION
    // ============================================
    const handleToggleComplete = async (todoId: string) => {
        try {
            const updated = await completeTodo(todoId);
            setTodos(todos.map((t) => (t.id === todoId ? updated : t)));
        } catch (error) {
            console.error('Failed to toggle todo:', error);
        }
    };

    // ============================================
    // DELETE TODO
    // ============================================
    const handleDeleteTodo = async (todoId: string) => {
        if (!confirm('Are you sure you want to delete this todo?')) return;

        try {
            await deleteTodo(todoId);
            setTodos(todos.filter((t) => t.id !== todoId));
        } catch (error) {
            console.error('Failed to delete todo:', error);
        }
    };

    // ============================================
    // UPDATE TODO (Inline Edit)
    // ============================================
    const startEdit = (todo: Todo) => {
        setEditingId(todo.id);
        setEditTitle(todo.title);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditTitle('');
    };

    const saveEdit = async (todoId: string) => {
        if (!editTitle.trim()) {
            alert('Title cannot be empty');
            return;
        }

        try {
            const updated = await updateTodo(todoId, { title: editTitle });
            setTodos(todos.map((t) => (t.id === todoId ? updated : t)));
            setEditingId(null);
            setEditTitle('');
        } catch (error) {
            console.error('Failed to update todo:', error);
        }
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /**
     * Get priority badge color
     */
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'bg-red-500/20 text-red-400 border-red-500/50';
            case 'medium':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
            case 'low':
                return 'bg-green-500/20 text-green-400 border-green-500/50';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        }
    };

    /**
     * Check if todo is overdue
     */
    const isOverdue = (dueDate?: string) => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    /**
     * Check if due today
     */
    const isDueToday = (dueDate?: string) => {
        if (!dueDate) return false;
        const today = new Date().toDateString();
        return new Date(dueDate).toDateString() === today;
    };

    /**
     * Format due date display
     */
    const formatDueDate = (dueDate?: string) => {
        if (!dueDate) return null;

        const date = new Date(dueDate);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (isOverdue(dueDate)) {
            return <span className="text-red-400 font-semibold">⚠️ Overdue</span>;
        }

        if (isDueToday(dueDate)) {
            return <span className="text-orange-400 font-semibold">🔥 Due Today</span>;
        }

        if (diffDays === 1) {
            return <span className="text-yellow-300">📅 Tomorrow</span>;
        }

        if (diffDays < 7) {
            return <span className="text-gray-300">📅 in {diffDays} days</span>;
        }

        return <span className="text-gray-400">📅 {date.toLocaleDateString()}</span>;
    };

    // ============================================
    // RENDER
    // ============================================
    return (
        <div
            className="min-h-screen bg-gray-900"
            style={{
                backgroundImage: 'url(/background.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
            }}
        >
            {/* Navbar */}
            <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4">
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl px-6 py-3">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-extralight tracking-wider text-white">
                            ✅ Todo List
                        </h1>
                        <Link
                            to="/dashboard"
                            className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all font-medium"
                        >
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-28 px-6 pb-6">
                <div className="max-w-5xl mx-auto">
                    {/* Create Todo Form */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
                        <h2 className="text-xl font-bold text-white mb-4">Create New Todo</h2>
                        <form onSubmit={handleCreateTodo} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={newTodo.title}
                                        onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                                        placeholder="What needs to be done?"
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        required
                                    />
                                </div>

                                {/* Priority */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Priority
                                    </label>
                                    <select
                                        value={newTodo.priority}
                                        onChange={(e) =>
                                            setNewTodo({
                                                ...newTodo,
                                                priority: e.target.value as 'low' | 'medium' | 'high',
                                            })
                                        }
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="low">🟢 Low</option>
                                        <option value="medium">🟡 Medium</option>
                                        <option value="high">🔴 High</option>
                                    </select>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={newTodo.description}
                                        onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                                        placeholder="Add details..."
                                        rows={2}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>

                                {/* Due Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Due Date
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={newTodo.dueDate}
                                        onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-semibold"
                            >
                                + Create Todo
                            </button>
                        </form>
                    </div>

                    {/* Filter Tabs */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 mb-6">
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'all'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                    }`}
                            >
                                All ({todos.length})
                            </button>
                            <button
                                onClick={() => setFilter('pending')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'pending'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                    }`}
                            >
                                Pending ({todos.filter((t) => t.status === 'pending').length})
                            </button>
                            <button
                                onClick={() => setFilter('in-progress')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'in-progress'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                    }`}
                            >
                                In Progress ({todos.filter((t) => t.status === 'in-progress').length})
                            </button>
                            <button
                                onClick={() => setFilter('completed')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'completed'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                    }`}
                            >
                                Completed ({todos.filter((t) => t.status === 'completed').length})
                            </button>
                        </div>
                    </div>

                    {/* Todo List */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {filter === 'all' ? 'All Todos' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Todos`}
                        </h2>

                        {loading ? (
                            <div className="text-center py-12 text-gray-400">
                                <p>Loading todos...</p>
                            </div>
                        ) : filteredTodos.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <div className="text-5xl mb-4">📝</div>
                                <p className="text-lg">No todos found</p>
                                <p className="text-sm mt-2">
                                    {filter === 'all'
                                        ? 'Create your first todo above!'
                                        : `No ${filter} todos yet`}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredTodos.map((todo) => (
                                    <div
                                        key={todo.id}
                                        className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all group"
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Checkbox */}
                                            <button
                                                onClick={() => handleToggleComplete(todo.id)}
                                                className="mt-1 flex-shrink-0"
                                            >
                                                <div
                                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${todo.status === 'completed'
                                                        ? 'bg-green-500 border-green-500'
                                                        : 'border-gray-400 hover:border-orange-500'
                                                        }`}
                                                >
                                                    {todo.status === 'completed' && (
                                                        <svg
                                                            className="w-4 h-4 text-white"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={3}
                                                                d="M5 13l4 4L19 7"
                                                            />
                                                        </svg>
                                                    )}
                                                </div>
                                            </button>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                {/* Title */}
                                                {editingId === todo.id ? (
                                                    <div className="flex gap-2 mb-2">
                                                        <input
                                                            type="text"
                                                            value={editTitle}
                                                            onChange={(e) => setEditTitle(e.target.value)}
                                                            className="flex-1 px-3 py-1 bg-white/10 border border-white/20 text-white rounded"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => saveEdit(todo.id)}
                                                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <h3
                                                        className={`text-lg font-medium mb-1 ${todo.status === 'completed'
                                                            ? 'line-through text-gray-500'
                                                            : 'text-white'
                                                            }`}
                                                    >
                                                        {todo.title}
                                                    </h3>
                                                )}

                                                {/* Description */}
                                                {todo.description && (
                                                    <p className="text-sm text-gray-400 mb-2">{todo.description}</p>
                                                )}

                                                {/* Metadata */}
                                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                                    {/* Priority Badge */}
                                                    <span
                                                        className={`px-2 py-1 rounded border text-xs font-medium ${getPriorityColor(
                                                            todo.priority
                                                        )}`}
                                                    >
                                                        {todo.priority.toUpperCase()}
                                                    </span>

                                                    {/* Status */}
                                                    <span className="text-gray-400">{todo.status}</span>

                                                    {/* Due Date */}
                                                    {todo.dueDate && <div>{formatDueDate(todo.dueDate)}</div>}

                                                    {/* Calendar Link Indicator */}
                                                    {todo.calendarEventId && (
                                                        <span className="text-blue-400" title="Linked to calendar">
                                                            📅
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Edit Button */}
                                                <button
                                                    onClick={() => startEdit(todo)}
                                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all"
                                                    title="Edit"
                                                >
                                                    <svg
                                                        className="w-5 h-5"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                        />
                                                    </svg>
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleDeleteTodo(todo.id)}
                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all"
                                                    title="Delete"
                                                >
                                                    <svg
                                                        className="w-5 h-5"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
