import supabase from "../config/supabase.js";

// Create a new project
async function createProject(req, res) {
    const { title } = req.body;
    try {
        // Create new project in Supabase
        const { data: project, error } = await supabase
            .from('projects')
            .insert([{ 
                user_id: req.user.id,
                title
            }])
            .select()
            .single();

        if (error) {
            console.error("Create Project error:", error);
            return res.status(500).json({ message: "Server error", error: error.message });
        }

        // Transform to frontend format (camelCase)
        const transformedProject = {
            id: project.id,
            userId: project.user_id,
            title: project.title,
            canvasData: project.canvas_data,
            createdAt: project.created_at,
            updatedAt: project.updated_at
        };

        res.status(201).json(transformedProject);
    } catch (error) {
        console.error("Create Project error", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
}

// Get all projects for the logged-in user
const getProjects = async (req, res) => {
    try {
        const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Get Projects error:", error);
            return res.status(500).json({ message: "Server error" });
        }

        // Transform to frontend format
        const transformedProjects = projects.map(p => ({
            id: p.id,
            userId: p.user_id,
            title: p.title,
            canvasData: p.canvas_data,
            createdAt: p.created_at,
            updatedAt: p.updated_at
        }));

        res.status(200).json(transformedProjects);
    } catch (error) {
        console.error("Get Projects error", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// get Project by ID
const getProjectById = async (req, res) => {
    try {
        // 1. Find the project by ID
        const { data: project, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', req.params.id)
            .single();

        // 2. If not found, return 404
        if (error || !project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // 3. Check if the logged-in user is the owner of the project
        if (project.user_id !== req.user.id) {
            return res.status(401).json({ message: "Not authorized to access this project" });
        }

        // 4. Transform and return the project
        const transformedProject = {
            id: project.id,
            userId: project.user_id,
            title: project.title,
            canvasData: project.canvas_data,
            createdAt: project.created_at,
            updatedAt: project.updated_at
        };

        res.status(200).json(transformedProject);
    } catch (error) {
        console.error("Get Project by ID error", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Update project
const updateProject = async (req, res) => {
    try {
        // 1. First check if project exists and user owns it
        const { data: existingProject, error: fetchError } = await supabase
            .from('projects')
            .select('user_id')
            .eq('id', req.params.id)
            .single();

        // 2. If not found, return 404
        if (fetchError || !existingProject) {
            return res.status(404).json({ message: "Project not found" });
        }

        // 3. Security check: Ensure the logged-in user is the owner
        if (existingProject.user_id !== req.user.id) {
            return res.status(401).json({ message: "Not authorized to update this project" });
        }

        // 4. Update the project
        const updateData = {};
        if (req.body.title !== undefined) updateData.title = req.body.title;
        if (req.body.canvasData !== undefined) updateData.canvas_data = req.body.canvasData;
        
        const { data: updatedProject, error: updateError } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (updateError) {
            console.error("Update Project error:", updateError);
            console.error("Update data was:", updateData);
            console.error("Canvas data type:", typeof req.body.canvasData);
            return res.status(500).json({ 
                message: "Server error",
                error: updateError.message,
                details: updateError
            });
        }

        // 5. Transform and return the updated project
        const transformedProject = {
            id: updatedProject.id,
            userId: updatedProject.user_id,
            title: updatedProject.title,
            canvasData: updatedProject.canvas_data,
            createdAt: updatedProject.created_at,
            updatedAt: updatedProject.updated_at
        };

        res.status(200).json(transformedProject);
    } catch (error) {
        console.error("Update Project error", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Delete a project using its ID
const deleteProject = async (req, res) => {
    try {
        // 1. First check if project exists and user owns it
        const { data: project, error: fetchError } = await supabase
            .from('projects')
            .select('user_id')
            .eq('id', req.params.id)
            .single();

        // 2. If not found, return 404
        if (fetchError || !project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // 3. Security check: Ensure the logged-in user is the owner
        if (project.user_id !== req.user.id) {
            return res.status(401).json({ message: "Not authorized to delete this project" });
        }

        // 4. Delete the project (cascade will delete associated slides)
        const { error: deleteError } = await supabase
            .from('projects')
            .delete()
            .eq('id', req.params.id);

        if (deleteError) {
            console.error("Delete Project error:", deleteError);
            return res.status(500).json({ message: "Server error" });
        }

        // 5. Return success message
        res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
        console.error("Delete Project error", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject
}
