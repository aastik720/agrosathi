import express from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function currentSessionStart() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  return twoHoursAgo;
}

router.post(
  "/save",
  requireAuth,
  [
    body("session_id").isUUID().withMessage("Valid session id is required."),
    body("role").isIn(["user", "assistant"]).withMessage("Role must be user or assistant."),
    body("content").trim().notEmpty().withMessage("Message content is required."),
    body("is_voice").optional().isBoolean(),
    body("ai_used").optional({ nullable: true }).isIn(["ollama", "gemini"]),
    body("language").optional().isString(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.supabase) {
        return res.status(500).json({ message: "Supabase is not configured." });
      }

      const { session_id, role, content, is_voice = false, ai_used = null, language = "hindi" } =
        req.body;

      const { data, error } = await req.supabase
        .from("chat_history")
        .insert({
          farmer_id: req.user.id,
          session_id,
          role,
          content,
          is_voice,
          ai_used: ai_used || null,
          language,
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      res.status(201).json({ message: data });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/history", requireAuth, async (req, res, next) => {
  try {
    if (!req.supabase) {
      return res.status(500).json({ message: "Supabase is not configured." });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const sessionSince = currentSessionStart();

    const { data, error } = await req.supabase
      .from("chat_history")
      .select("*")
      .eq("farmer_id", req.user.id)
      .gte("created_at", sessionSince)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const messages = [...(data || [])]
      .filter((message) => message.ai_used !== "feedback")
      .reverse();
    const grouped = messages.reduce((acc, message) => {
      acc[message.session_id] = acc[message.session_id] || [];
      acc[message.session_id].push(message);
      return acc;
    }, {});

    res.json({
      messages,
      sessions: grouped,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/feedback",
  requireAuth,
  [
    body("session_id").isUUID().withMessage("Valid session id is required."),
    body("message_id").optional({ nullable: true }).isUUID(),
    body("feedback")
      .isIn(["helpful", "not_helpful"])
      .withMessage("Feedback must be helpful or not_helpful."),
    body("language").optional().isString(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.supabase) {
        return res.status(500).json({ message: "Supabase is not configured." });
      }

      const { session_id, message_id = null, feedback, language = "hindi" } = req.body;
      const content = JSON.stringify({
        type: "assistant_feedback",
        message_id,
        feedback,
      });

      const { data, error } = await req.supabase
        .from("chat_history")
        .insert({
          farmer_id: req.user.id,
          session_id,
          role: "user",
          content,
          is_voice: false,
          ai_used: "feedback",
          language,
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      res.status(201).json({ feedback: data });
    } catch (error) {
      next(error);
    }
  }
);

router.delete("/clear", requireAuth, async (req, res, next) => {
  try {
    if (!req.supabase) {
      return res.status(500).json({ message: "Supabase is not configured." });
    }

    const { error } = await req.supabase
      .from("chat_history")
      .delete()
      .eq("farmer_id", req.user.id);

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
