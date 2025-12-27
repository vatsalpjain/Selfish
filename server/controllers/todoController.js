import supabase from "../config/supabase.js";
import { 
    createCalendarEventHelper, 
    updateCalendarEventHelper, 
    deleteCalendarEventHelper 
} from "./calenderController.js";

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

        // ============================================
        // AUTO-SYNC TO GOOGLE CALENDAR
        // ============================================
        // If todo has a due date, automatically create calendar event
        let calendarEventId = data.calendar_event_id;
        
        if (dueDate) {
            console.log(`Todo has due date, attempting calendar sync for user ${req.user.id}`);
            
            // Calculate event end time (1 hour after start)
            const startDate = new Date(dueDate);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour
            
            // Attempt to create calendar event
            const calendarResult = await createCalendarEventHelper(
                req.user.id,
                title.trim(),
                startDate.toISOString(),
                endDate.toISOString()
            );
            
            if (calendarResult.success) {
                console.log(`✓ Calendar event created: ${calendarResult.eventId}`);
                
                // Update todo with calendar_event_id
                const { data: updatedData, error: updateError } = await supabase
                    .from("todos")
                    .update({ calendar_event_id: calendarResult.eventId })
                    .eq("id", data.id)
                    .select()
                    .single();
                
                if (!updateError) {
                    calendarEventId = updatedData.calendar_event_id;
                    console.log(`✓ Todo updated with calendar event ID`);
                }
            } else {
                // Calendar sync failed (user may not have calendar connected)
                console.log(`⚠ Calendar sync skipped: ${calendarResult.error}`);
            }
        }

        // Transform to camelCase for frontend
        const formattedTodo = {
            id: data.id,
            userId: data.user_id,
            title: data.title,
            description: data.description,
            priority: data.priority,
            status: data.status,
            dueDate: data.due_date,
            calendarEventId: calendarEventId, 
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
            .select("*") // Select all fields to check calendar_event_id and current values
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

        // ============================================
        // AUTO-SYNC TO GOOGLE CALENDAR
        // ============================================
        let calendarEventId = updatedTodo.calendar_event_id;
        
        // Check if title or dueDate was updated (need to sync to calendar)
        const titleChanged = req.body.title !== undefined && req.body.title !== existingTodo.title;
        const dueDateChanged = req.body.dueDate !== undefined && req.body.dueDate !== existingTodo.due_date;
        
        if (titleChanged || dueDateChanged) {
            // Case 1: Todo has existing calendar event - UPDATE it
            if (existingTodo.calendar_event_id && updatedTodo.due_date) {
                console.log(`Updating calendar event ${existingTodo.calendar_event_id}`);
                
                const startDate = new Date(updatedTodo.due_date);
                const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour
                
                const updateResult = await updateCalendarEventHelper(
                    req.user.id,
                    existingTodo.calendar_event_id,
                    updatedTodo.title,
                    startDate.toISOString(),
                    endDate.toISOString()
                );
                
                if (updateResult.success) {
                    console.log(`✓ Calendar event updated`);
                } else {
                    console.log(`⚠ Calendar update failed: ${updateResult.error}`);
                }
            }
            // Case 2: Todo has new due date but no calendar event - CREATE one
            else if (!existingTodo.calendar_event_id && updatedTodo.due_date) {
                console.log(`Creating new calendar event for todo ${updatedTodo.id}`);
                
                const startDate = new Date(updatedTodo.due_date);
                const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour
                
                const createResult = await createCalendarEventHelper(
                    req.user.id,
                    updatedTodo.title,
                    startDate.toISOString(),
                    endDate.toISOString()
                );
                
                if (createResult.success) {
                    console.log(`✓ Calendar event created: ${createResult.eventId}`);
                    
                    // Update todo with calendar_event_id
                    const { data: reUpdatedData, error: reUpdateError } = await supabase
                        .from("todos")
                        .update({ calendar_event_id: createResult.eventId })
                        .eq("id", updatedTodo.id)
                        .select()
                        .single();
                    
                    if (!reUpdateError) {
                        calendarEventId = reUpdatedData.calendar_event_id;
                        console.log(`✓ Todo updated with calendar event ID`);
                    }
                } else {
                    console.log(`⚠ Calendar sync skipped: ${createResult.error}`);
                }
            }
            // Case 3: Due date was removed - DELETE calendar event
            else if (existingTodo.calendar_event_id && !updatedTodo.due_date) {
                console.log(`Deleting calendar event ${existingTodo.calendar_event_id}`);
                
                const deleteResult = await deleteCalendarEventHelper(
                    req.user.id,
                    existingTodo.calendar_event_id
                );
                
                if (deleteResult.success) {
                    console.log(`✓ Calendar event deleted`);
                    
                    // Remove calendar_event_id from todo
                    await supabase
                        .from("todos")
                        .update({ calendar_event_id: null })
                        .eq("id", updatedTodo.id);
                    
                    calendarEventId = null;
                } else {
                    console.log(`⚠ Calendar delete failed: ${deleteResult.error}`);
                }
            }
        }

        // Transform to camelCase
        const formattedTodo = {
            id: updatedTodo.id,
            userId: updatedTodo.user_id,
            title: updatedTodo.title,
            description: updatedTodo.description,
            priority: updatedTodo.priority,
            status: updatedTodo.status,
            dueDate: updatedTodo.due_date,
            calendarEventId: calendarEventId, // Use updated value
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
            .select("*") // Select all fields to get calendar_event_id
            .eq("id", req.params.id)
            .single();

        if (fetchError || !existingTodo) {
            return res.status(404).json({ error: "Todo not found" });
        }

        // SECURITY: Ensure user owns this todo
        if (existingTodo.user_id !== req.user.id) {
            return res.status(401).json({ error: "Not authorized to delete this todo" });
        }

        // ============================================
        // DELETE LINKED CALENDAR EVENT (if exists)
        // ============================================
        if (existingTodo.calendar_event_id) {
            console.log(`Deleting linked calendar event ${existingTodo.calendar_event_id}`);
            
            const deleteResult = await deleteCalendarEventHelper(
                req.user.id,
                existingTodo.calendar_event_id
            );
            
            if (deleteResult.success) {
                console.log(`✓ Calendar event deleted`);
            } else {
                console.log(`⚠ Calendar event delete failed: ${deleteResult.error}`);
                // Continue with todo deletion even if calendar delete fails
            }
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