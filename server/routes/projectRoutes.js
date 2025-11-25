import express from 'express';
import {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject
} from '../controllers/projectController.js';
import protect from '../middleware/auth.js';

const router = express.Router();
router.post('/', protect, createProject);
router.delete('/:id', protect, deleteProject);
router.get('/', protect, getProjects);
router.get('/:id', protect, getProjectById);
router.put('/:id', protect, updateProject);

export default router;
