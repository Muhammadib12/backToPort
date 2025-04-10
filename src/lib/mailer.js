import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail", // أو استخدم Mailtrap/Smtp2Go إذا كان Gmail لا يناسبك
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendLikeNotification = async (projectId, newLikes) => {
  const mailOptions = {
    from: `"Braude Projects" <${process.env.EMAIL_USER}>`,
    to: process.env.NOTIFY_EMAIL, // بريدك الشخصي الذي يصلك عليه التنبيه
    subject: `👍 New Like on Project ${projectId}`,
    text: `Project ${projectId} just received a new like! Total likes: ${newLikes}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Like notification sent ✅");
  } catch (error) {
    console.error("Failed to send like notification ❌", error);
  }
};
