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
            screenshotUrl: s.screenshot_url || null,
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
    const { slideData, name, screenshotData } = req.body; 
    
    try {
        const updates = {};
        
        // If saving canvas, parse the string back to JSON for storage
        if (slideData) updates.slide_data = JSON.parse(slideData);
        if (name) updates.name = name;

        // Handle screenshot upload if provided
        if (screenshotData) {
            try {
                // 1. Extract base64 data (remove 'data:image/png;base64,' prefix)
                const base64Data = screenshotData.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                // 2. Generate unique filename
                const timestamp = Date.now();
                const filename = `slide-${slideId}-${timestamp}.png`;
                const filePath = `screenshots/${filename}`;
                
                // 3. Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('slides-screenshots')
                    .upload(filePath, buffer, {
                        contentType: 'image/png',
                        upsert: true // Replace if exists
                    });
                
                if (uploadError) {
                    console.error('Screenshot upload error:', uploadError);
                } else {
                    // 4. Get public URL
                    const { data: urlData } = supabase.storage
                        .from('slides-screenshots')
                        .getPublicUrl(filePath);
                    
                    if (urlData?.publicUrl) {
                        updates.screenshot_url = urlData.publicUrl;
                    }
                }
            } catch (screenshotError) {
                console.error('Error processing screenshot:', screenshotError);
                // Continue with slide update even if screenshot fails
            }
        }

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
            screenshotUrl: data.screenshot_url || null,
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