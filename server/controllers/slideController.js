import CanvasSlide from "../models/CanvasSlide.js";


//Create a new slide for a project
const createSlide = async (req, res) => {
    const { projectId, name } = req.body;
    
    try {
        const newSlide = new CanvasSlide({
            project: projectId,
            name: name || 'New Slide',
            slideData: '' // Start with an empty canvas
        });

        const savedSlide = await newSlide.save();
        res.status(201).json(savedSlide);
    } catch (error) {
        console.error("Create Slide error", error.message);
        res.status(500).json({ message: "Server error" });
    }       
}


//Get all slides for a specific project
const getSlidesByProjectId = async (req, res) => {
    const { projectId } = req.params;
    try {
        // Sort by 'createdAt' ascending (1). 
        // This ensures the first slide created is always first in the array.
        const slides = await CanvasSlide.find({ project: projectId }).sort({ createdAt: 1 });
        res.status(200).json(slides);
    } catch (error) {
        console.error("Get Slides error", error.message);
        res.status(500).json({ message: "Server error" });
    }
}

//Update slide data (canvas state) and/or name
const updateSlide = async (req, res) => {
    const { slideId } = req.params;
    const { slideData, name } = req.body; 
    
    try {
        const slide = await CanvasSlide.findById(slideId);
        if (!slide) {
            return res.status(404).json({ message: "Slide not found" });
        }

        // Only update fields if they are actually sent in the request
        if (slideData !== undefined) slide.slideData = slideData;
        if (name !== undefined) slide.name = name;

        const updatedSlide = await slide.save();
        res.status(200).json(updatedSlide);
    } catch (error) {
        console.error("Update Slide error", error.message);
        res.status(500).json({ message: "Server error" });
    }
}

//Delete a slide by ID
const deleteSlide = async (req, res) => {
    const { slideId } = req.params;
    try {
        const slide = await CanvasSlide.findByIdAndDelete(slideId);
        if (!slide) {
            return res.status(404).json({ message: "Slide not found" });
        }
        res.status(200).json({ message: "Slide deleted successfully" });
    } catch (error) {
        console.error("Delete Slide error", error.message);
        res.status(500).json({ message: "Server error" });
    }
}

export {
    createSlide,
    getSlidesByProjectId,
    updateSlide,
    deleteSlide
};