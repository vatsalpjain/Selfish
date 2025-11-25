import express from 'express';
import {
    createSlide,
    getSlidesByProjectId,
    updateSlide,
    deleteSlide
} from '../controllers/slideController.js';
import protect from '../middleware/auth.js';

const router = express.Router();
router.post('/', protect, createSlide);
router.get('/project/:projectId', protect, getSlidesByProjectId);
router.put('/:slideId', protect, updateSlide);
router.delete('/:slideId', protect, deleteSlide);

export default router;