import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema({
    user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
  }
}, {
  timestamps: true,
});

const Project = mongoose.model('Project', ProjectSchema);

export default Project;
