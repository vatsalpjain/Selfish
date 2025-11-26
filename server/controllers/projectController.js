import Project from "../models/Project.js";

// Create a new project
async function createProject(req, res) {
    const { title } = req.body;
    try {
        // Create new project instance
        const newProject = new Project({
            user: req.user._id,
            title,
            canvasData: '' 
        });
        // Save project to database
        const savedProject = await newProject.save();
        // Respond with the new project
        res.status(201).json(savedProject);
    } catch (error) {
        console.error("Create Project error", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
}

// Get all projects for the logged-in user
const getProjects = async (req, res) => {
    try {
    const projects = await Project.find({ user: req.user._id });
        res.status(200).json(projects);
    } catch (error) {
        console.error("Get Projects error", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// get Project by ID
const getProjectById = async (req, res) => {
    try {
         // 1. Find the project by the ID from the URL (req.params.id)
        const project = await Project.findOne({ _id: req.params.id, user: req.user._id });
        // 2. If not found, return 404
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        // 3. Check if the logged-in user is the owner of the project
        if (project.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to access this project" });
        }
        // 4. Return the project
        res.status(200).json(project);
    } catch (error) {
        console.error("Get Project by ID error", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Update project canvas data
const updateProject = async (req, res) => {
    try {
        // 1.Find the project by ID and user
        const project = await Project.findOne({ _id: req.params.id, user: req.user._id });
        // 2. If not found, return 404
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        // 3. Security check: Ensure the logged-in user is the owner
        if (project.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to update this project" });
        }
        // 4. Update the canvasData
        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            req.body,  
            { new: true, runValidators: true }
        );
        // 5. Return the updated project
        res.status(200).json(updatedProject);
    } catch (error) {
        console.error("Update Project error", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Delete a project using its ID
const deleteProject = async (req, res) => {
    try {
        // 1. Find the project by ID and user
        const project = await Project.findOne({ _id: req.params.id, user: req.user._id });
        // 2. If not found, return 404
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        // 3. Security check: Ensure the logged-in user is the owner
        if (project.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Not authorized to delete this project" });
        }
        // 4. Delete the project
        await Project.findByIdAndDelete(req.params.id);
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
