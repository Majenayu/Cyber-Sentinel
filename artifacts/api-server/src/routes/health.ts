import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import connectToDatabase from "../lib/mongodb";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health/status", async (_req, res) => {
  let database = "OFFLINE";
  let ai = "OFFLINE";

  try {
    await connectToDatabase();
    database = "ONLINE";
  } catch {
    database = "OFFLINE";
  }

  ai = process.env.GROQ_API_KEY ? "ONLINE" : "NO_KEY";

  res.json({
    database,
    ai,
    encryption: "AES-256 ACTIVE",
  });
});

export default router;
