import express from "express";
import { body } from "express-validator";
import { getCurrentUser, upsertProfile } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/me", requireAuth, getCurrentUser);

router.post(
  "/profile",
  requireAuth,
  [
    body("full_name").trim().notEmpty().withMessage("Full name is required."),
    body("location").trim().notEmpty().withMessage("Location is required."),
    body("preferred_language")
      .isIn(["hindi", "punjabi", "pahadi", "english"])
      .withMessage("Unsupported language."),
    body("user_type").isIn(["farmer", "buyer"]).withMessage("Unsupported user type."),
  ],
  upsertProfile
);

export default router;
