import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import diseaseRoutes from "./routes/disease.js";
import marketRoutes from "./routes/market.js";
import marketplaceRoutes from "./routes/marketplace.js";
import schemesRoutes from "./routes/schemes.js";
import weatherRoutes from "./routes/weather.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(helmet());
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "8mb" }));
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({
    message: "AgroSaathi Node.js API is running.",
    service: "server",
    status: "ok",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "agrosathi-server",
    port: Number(PORT),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/disease", diseaseRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/schemes", schemesRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`AgroSaathi server running on port ${PORT}`);
});
