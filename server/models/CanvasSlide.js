import mongoose from "mongoose";

const CanvasSlideSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Project',
    },
    name: {
        type: String,
        default: 'New Slide',
    },
    slideData: {
        type: String, // Store slide data as JSON string
        default: '',  // Initialize with empty string
    },
}, {
    timestamps: true,
});

const CanvasSlide = mongoose.model('CanvasSlide', CanvasSlideSchema);

export default CanvasSlide;