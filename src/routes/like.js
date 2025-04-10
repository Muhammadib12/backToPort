import express from "express";
import ProjectStat from "../models/ProjectStat.js";
import { sendLikeNotification } from "./../lib/mailer.js";

const router = express.Router();

// الحصول على جميع الإعجابات
router.get("/", async (req, res) => {
  try {
    const allStats = await ProjectStat.find({}, "projectId likes -_id");
    res.status(200).json(allStats);
  } catch (err) {
    console.error("Error fetching likes:", err);
    res.status(500).json({ message: "Failed to fetch likes" });
  }
});

// تحديث الإعجاب
router.post("/", async (req, res) => {
  const { projectId, action } = req.body;

  if (!projectId || !["like", "unlike"].includes(action)) {
    return res.status(400).json({ message: "Invalid request data" });
  }

  try {
    const updatedStat = await ProjectStat.findOneAndUpdate(
      { projectId },
      { $inc: { likes: action === "like" ? 1 : -1 } },
      { upsert: true, new: true }
    );

    // ✅ أرسل الإيميل بعد الحصول على updatedStat
    if (action === "like") {
      await sendLikeNotification(updatedStat.projectId, updatedStat.likes);
    }

    res.status(200).json({
      message: "Like updated successfully",
      projectId: updatedStat.projectId,
      likes: updatedStat.likes,
    });
  } catch (err) {
    console.error("Error updating like:", err);
    res.status(500).json({ message: "Failed to update like" });
  }
});

export default router;
