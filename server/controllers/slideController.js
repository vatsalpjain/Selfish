import supabase from '../config/supabase.js';

// @desc    Create a new slide
// @route   POST /api/slides
const createSlide = async (req, res) => {
    const { projectId, name } = req.body;
    
    try {
        // 1. Insert into 'slides' table
        // Note: We map 'projectId' (frontend) to 'project_id' (database)
        const { data, error } = await supabase
            .from('slides')
            .insert([{ 
                project_id: projectId, 
                name: name || 'New Slide',
                slide_data: {} // Initialize with empty JSON object
            }])
            .select()
            .single();

        if (error) throw error;

        // 2. Convert snake_case (DB) to camelCase (Frontend)
        // This ensures your React code doesn't break!
        const slide = {
            _id: data.id,
            project: data.project_id,
            name: data.name,
            // We stringify it because Tldraw expects a JSON string initially
            slideData: JSON.stringify(data.slide_data),
            createdAt: data.created_at
        };

        res.status(201).json(slide);
    } catch (error) {
        console.error("Create Slide error:", error.message);
        res.status(500).json({ message: "Server error" });
    }       
}

// @desc    Get all slides for a project
// @route   GET /api/slides/project/:projectId
const getSlidesByProjectId = async (req, res) => {
    const { projectId } = req.params;
    try {
        // 1. Select slides for this project, sorted by creation time
        const { data, error } = await supabase
            .from('slides')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // 2. Map the array to match frontend expectations
        const slides = data.map(s => ({
            _id: s.id,
            project: s.project_id,
            name: s.name,
            slideData: JSON.stringify(s.slide_data),
            createdAt: s.created_at
        }));

        res.status(200).json(slides);
    } catch (error) {
        console.error("Get Slides error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
}

// @desc    Update slide data (save canvas)
// @route   PUT /api/slides/:slideId
const updateSlide = async (req, res) => {
    const { slideId } = req.params;
    const { slideData, name } = req.body; 
    
    try {
        const updates = {};
        
        // If saving canvas, parse the string back to JSON for storage
        if (slideData) updates.slide_data = JSON.parse(slideData);
        if (name) updates.name = name;

        const { data, error } = await supabase
            .from('slides')
            .update(updates)
            .eq('id', slideId)
            .select()
            .single();

        if (error) throw error;

        const updatedSlide = {
            _id: data.id,
            project: data.project_id,
            name: data.name,
            slideData: JSON.stringify(data.slide_data),
            createdAt: data.created_at
        };

        res.status(200).json(updatedSlide);
    } catch (error) {
        console.error("Update Slide error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
}

// @desc    Delete a slide
// @route   DELETE /api/slides/:slideId
const deleteSlide = async (req, res) => {
    const { slideId } = req.params;
    try {
        const { error } = await supabase
            .from('slides')
            .delete()
            .eq('id', slideId);

        if (error) throw error;
        
        res.status(200).json({ message: "Slide deleted successfully" });
    } catch (error) {
        console.error("Delete Slide error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
}

export {
    createSlide,
    getSlidesByProjectId,
    updateSlide,
    deleteSlide
};