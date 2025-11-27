import supabase from "../config/supabase.js";

// ============================================
// GET ALL TODOS FOR LOGGED-IN USER
// ============================================
// @desc    Get all todos for the current user with optional status filtering
// @route   GET /api/todos?status=pending
// @access  Protected (requires authentication)
async function getTodos(req, res) {
    try {
        // Start building the query for todos table
        // .eq() filters rows where user_id matches the logged-in user
        let query = supabase
            .from("todos")
            .select("*")
            .eq("user_id", req.user.id); // SECURITY: Only get current user's todos

        // Optional filtering: If ?status=pending is in URL, filter by status
        if (req.query.status) {
            query = query.eq("status", req.query.status);
        }

        // Execute query with sorting:
        // 1. Due date ascending (earliest deadlines first)
        // 2. Priority descending (high -> medium -> low)
        // 3. Created date descending (newest first)
        const { data, error } = await query
            .order("due_date", { ascending: true, nullsLast: true })
            .order("priority", { ascending: false })
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Transform snake_case (database) to camelCase (frontend)
        // This makes JavaScript code more readable
        const formattedTodos = data.map((todo) => ({
            id: todo.id,
            userId: todo.user_id,
            title: todo.title,
            description: todo.description,
            priority: todo.priority,
            status: todo.status,
            dueDate: todo.due_date,
            calendarEventId: todo.calendar_event_id,
            completedAt: todo.completed_at,
            createdAt: todo.created_at,
            updatedAt: todo.updated_at,
        }));

        res.status(200).json(formattedTodos);
    } catch (error) {
        console.error("Get todos error:", error.message);
        res.status(500).json({ error: error.message });
    }
}

// ============================================
// CREATE NEW TODO
// ============================================
// @desc    Create a new todo item
// @route   POST /api/todos
// @access  Protected
async function createTodo(req, res) {
    try {
        const { title, description, dueDate, priority, status } = req.body;

        // Validation: Title is required
        if (!title || title.trim() === "") {
            return res.status(400).json({ error: "Title is required" });
        }

        // Insert new todo into database
        // user_id comes from req.user.id (set by auth middleware)
        const { data, error } = await supabase
            .from("todos")
            .insert([
                {
                    user_id: req.user.id, // SECURITY: Set from authenticated user
                    title: title.trim(),
                    description: description || null,
                    due_date: dueDate || null,
                    priority: priority || "medium",
                    status: status || "pending",
                },
            ])
            .select() // Return the created todo
            .single(); // Return single object, not array

        if (error) throw error;

        // Transform to camelCase for frontend
        const formattedTodo = {
            id: data.id,
            userId: data.user_id,
            title: data.title,
            description: data.description,
            priority: data.priority,
            status: data.status,
            dueDate: data.due_date,
            calendarEventId: data.calendar_event_id,
            completedAt: data.completed_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };

        res.status(201).json(formattedTodo);
    } catch (error) {
        console.error("Create todo error:", error.message);
        res.status(500).json({ error: error.message });
    }
}

// ============================================
// GET SINGLE TODO BY ID
// ============================================
// @desc    Get a single todo by ID
// @route   GET /api/todos/:id
// @access  Protected
async function getTodoById(req, res) {
    try {
        // Fetch todo by ID AND verify it belongs to current user (security!)
        const { data, error } = await supabase
            .from("todos")
            .select("*")
            .eq("id", req.params.id)
            .eq("user_id", req.user.id) // SECURITY: Ensure user owns this todo
            .single();

        if (error || !data) {
            return res.status(404).json({ error: "Todo not found" });
        }

        // Transform to camelCase
        const formattedTodo = {
            id: data.id,
            userId: data.user_id,
            title: data.title,
            description: data.description,
            priority: data.priority,
            status: data.status,
            dueDate: data.due_date,
            calendarEventId: data.calendar_event_id,
            completedAt: data.completed_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };

        res.status(200).json(formattedTodo);
    } catch (error) {
        console.error("Get todo by ID error:", error.message);
        res.status(500).json({ error: error.message });
    }
}

// ============================================
// UPDATE TODO
// ============================================
// @desc    Update todo fields (title, description, priority, status, dueDate)
// @route   PUT /api/todos/:id
// @access  Protected
async function updateTodo(req, res) {
    try {
        // First, verify the todo exists and user owns it
        const { data: existingTodo, error: fetchError } = await supabase
            .from("todos")
            .select("user_id")
            .eq("id", req.params.id)
            .single();

        if (fetchError || !existingTodo) {
            return res.status(404).json({ error: "Todo not found" });
        }

        // SECURITY: Ensure user owns this todo
        if (existingTodo.user_id !== req.user.id) {
            return res.status(401).json({ error: "Not authorized to update this todo" });
        }

        // Build update object with only provided fields
        const updateData = {};
        if (req.body.title !== undefined) updateData.title = req.body.title.trim();
        if (req.body.description !== undefined) updateData.description = req.body.description;
        if (req.body.priority !== undefined) updateData.priority = req.body.priority;
        if (req.body.status !== undefined) updateData.status = req.body.status;
        if (req.body.dueDate !== undefined) updateData.due_date = req.body.dueDate;

        // If no fields to update, return error
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }

        // Perform update
        const { data: updatedTodo, error: updateError } = await supabase
            .from("todos")
            .update(updateData)
            .eq("id", req.params.id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Transform to camelCase
        const formattedTodo = {
            id: updatedTodo.id,
            userId: updatedTodo.user_id,
            title: updatedTodo.title,
            description: updatedTodo.description,
            priority: updatedTodo.priority,
            status: updatedTodo.status,
            dueDate: updatedTodo.due_date,
            calendarEventId: updatedTodo.calendar_event_id,
            completedAt: updatedTodo.completed_at,
            createdAt: updatedTodo.created_at,
            updatedAt: updatedTodo.updated_at,
        };

        res.status(200).json(formattedTodo);
    } catch (error) {
        console.error("Update todo error:", error.message);
        res.status(500).json({ error: error.message });
    }
}

// ============================================
// DELETE TODO
// ============================================
// @desc    Delete a todo
// @route   DELETE /api/todos/:id
// @access  Protected
async function deleteTodo(req, res) {
    try {
        // First verify todo exists and user owns it
        const { data: existingTodo, error: fetchError } = await supabase
            .from("todos")
            .select("user_id")
            .eq("id", req.params.id)
            .single();

        if (fetchError || !existingTodo) {
            return res.status(404).json({ error: "Todo not found" });
        }

        // SECURITY: Ensure user owns this todo
        if (existingTodo.user_id !== req.user.id) {
            return res.status(401).json({ error: "Not authorized to delete this todo" });
        }

        // Perform deletion
        const { error: deleteError } = await supabase
            .from("todos")
            .delete()
            .eq("id", req.params.id);

        if (deleteError) throw deleteError;

        res.status(200).json({ message: "Todo deleted successfully" });
    } catch (error) {
        console.error("Delete todo error:", error.message);
        res.status(500).json({ error: error.message });
    }
}

// ============================================
// COMPLETE TODO (Quick toggle)
// ============================================
// @desc    Mark todo as completed (sets status to 'completed' and records timestamp)
// @route   PUT /api/todos/:id/complete
// @access  Protected
async function completeTodo(req, res) {
    try {
        // Verify ownership first
        const { data: existingTodo, error: fetchError } = await supabase
            .from("todos")
            .select("user_id, status")
            .eq("id", req.params.id)
            .single();

        if (fetchError || !existingTodo) {
            return res.status(404).json({ error: "Todo not found" });
        }

        if (existingTodo.user_id !== req.user.id) {
            return res.status(401).json({ error: "Not authorized" });
        }

        // Toggle completion: if already completed, mark as pending; otherwise mark as completed
        const newStatus = existingTodo.status === "completed" ? "pending" : "completed";
        const completedAt = newStatus === "completed" ? new Date().toISOString() : null;

        // Update status and completed_at timestamp
        const { data: updatedTodo, error: updateError } = await supabase
            .from("todos")
            .update({
                status: newStatus,
                completed_at: completedAt,
            })
            .eq("id", req.params.id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Transform to camelCase
        const formattedTodo = {
            id: updatedTodo.id,
            userId: updatedTodo.user_id,
            title: updatedTodo.title,
            description: updatedTodo.description,
            priority: updatedTodo.priority,
            status: updatedTodo.status,
            dueDate: updatedTodo.due_date,
            calendarEventId: updatedTodo.calendar_event_id,
            completedAt: updatedTodo.completed_at,
            createdAt: updatedTodo.created_at,
            updatedAt: updatedTodo.updated_at,
        };

        res.status(200).json(formattedTodo);
    } catch (error) {
        console.error("Complete todo error:", error.message);
        res.status(500).json({ error: error.message });
    }
}

// ============================================
// GET UPCOMING TODOS (For Dashboard Widget)
// ============================================
// @desc    Get upcoming todos (not completed, with due date) sorted by due date
// @route   GET /api/todos/upcoming?limit=2
// @access  Protected
async function getUpcomingTodos(req, res) {
    try {
        // Get limit from query params (default: 2 for dashboard widget)
        const limit = parseInt(req.query.limit) || 2;

        // Query upcoming todos:
        // - Not completed
        // - Has a due date
        // - Due date is in the future OR today
        // - Sorted by due date (nearest first)
        const { data, error } = await supabase
            .from("todos")
            .select("*")
            .eq("user_id", req.user.id)
            .neq("status", "completed") // Not completed
            .not("due_date", "is", null) // Has a due date
            .gte("due_date", new Date().toISOString()) // Due date >= now
            .order("due_date", { ascending: true }) // Nearest due date first
            .limit(limit);

        if (error) throw error;

        // Transform to camelCase
        const formattedTodos = data.map((todo) => ({
            id: todo.id,
            userId: todo.user_id,
            title: todo.title,
            description: todo.description,
            priority: todo.priority,
            status: todo.status,
            dueDate: todo.due_date,
            calendarEventId: todo.calendar_event_id,
            completedAt: todo.completed_at,
            createdAt: todo.created_at,
            updatedAt: todo.updated_at,
        }));

        res.status(200).json(formattedTodos);
    } catch (error) {
        console.error("Get upcoming todos error:", error.message);
        res.status(500).json({ error: error.message });
    }
}

// ============================================
// LINK TODO TO CALENDAR EVENT
// ============================================
// @desc    Link a todo to a Google Calendar event
// @route   PUT /api/todos/:id/link-calendar
// @access  Protected
async function linkTodoToCalendar(req, res) {
    try {
        const { eventId } = req.body;

        if (!eventId) {
            return res.status(400).json({ error: "Event ID is required" });
        }

        // Verify ownership
        const { data: existingTodo, error: fetchError } = await supabase
            .from("todos")
            .select("user_id")
            .eq("id", req.params.id)
            .single();

        if (fetchError || !existingTodo) {
            return res.status(404).json({ error: "Todo not found" });
        }

        if (existingTodo.user_id !== req.user.id) {
            return res.status(401).json({ error: "Not authorized" });
        }

        // Update calendar_event_id
        const { data: updatedTodo, error: updateError } = await supabase
            .from("todos")
            .update({ calendar_event_id: eventId })
            .eq("id", req.params.id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Transform to camelCase
        const formattedTodo = {
            id: updatedTodo.id,
            userId: updatedTodo.user_id,
            title: updatedTodo.title,
            description: updatedTodo.description,
            priority: updatedTodo.priority,
            status: updatedTodo.status,
            dueDate: updatedTodo.due_date,
            calendarEventId: updatedTodo.calendar_event_id,
            completedAt: updatedTodo.completed_at,
            createdAt: updatedTodo.created_at,
            updatedAt: updatedTodo.updated_at,
        };

        res.status(200).json(formattedTodo);
    } catch (error) {
        console.error("Link to calendar error:", error.message);
        res.status(500).json({ error: error.message });
    }
}

// Export all controller functions
export {
    getTodos,
    createTodo,
    getTodoById,
    updateTodo,
    deleteTodo,
    completeTodo,
    getUpcomingTodos,
    linkTodoToCalendar,
};