import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import likeRouter from "./src/routes/like.js";
import { connectDb } from "./src/lib/mongodb.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/projects/like", likeRouter);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  connectDb();
  console.log(`Server running on port ${PORT}`);
});
