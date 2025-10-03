import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import likeRouter from "./src/routes/like.js";
import { connectDb } from "./src/lib/mongodb.js";
import { visitEmailer } from "./src/lib/visitEmailer.js";
import { verifyEmailTransport } from "./src/lib/mailer.js";

dotenv.config();
verifyEmailTransport();

const app = express();

// Middleware

app.use(express.json());
app.set("trust proxy", true);
app.use(
  cors({
    origin: ["http://localhost:5173", "https://muhammad-bice.vercel.app"],
  })
);

// مسار تتبّع بسيط: يستدعى عند فتح أي صفحة في الفرونت
app.get(
  "/api/track",
  (req, res, next) => {
    console.log("HIT /api/track");
    next();
  },
  visitEmailer,
  (req, res) => {
    console.log("HANDLER /api/track");
    res.send("Okayyyyy");
  }
);

// Routes
app.use("/api/projects/like", likeRouter);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  connectDb();
  console.log(`Server running on port ${PORT}`);
});
