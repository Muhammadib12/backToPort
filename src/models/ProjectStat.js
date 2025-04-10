import mongoose from "mongoose";

const ProjectStatSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    unique: true,
  },
  likes: {
    type: Number,
    default: 0,
  },
});

export default mongoose.models.ProjectStat ||
  mongoose.model("ProjectStat", ProjectStatSchema);
