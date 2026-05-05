import crypto from "crypto";
import axios from "axios";
import express from "express";
import { body, param, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { checkDiseaseScanLimit } from "../utils/rateLimiter.js";

const router = express.Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const DISEASE_BUCKET = "disease-images";
const CACHE_DAYS = 7;

function dataUrlParts(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1],
    base64: match[2],
  };
}

function extensionForContentType(contentType) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function hashImage(base64) {
  return crypto.createHash("sha256").update(base64).digest("hex");
}

function cacheSinceIso() {
  return new Date(Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

async function createSignedImageUrl(supabase, path, expiresIn = 60 * 60) {
  if (!supabase || !path) return null;

  const { data, error } = await supabase.storage
    .from(DISEASE_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) return null;
  return data?.signedUrl || null;
}

async function createSignedScan(supabase, scan) {
  const thumbnailUrl = await createSignedImageUrl(supabase, scan.image_url, 60 * 30);
  return {
    ...scan,
    image_path: scan.image_url,
    thumbnail_url: thumbnailUrl,
    image_url: thumbnailUrl,
    status: scan.is_healthy ? "healthy" : scan.disease_name ? "disease_found" : "error",
    treatment: {
      organic: scan.treatment_organic || "",
      chemical: scan.treatment_chemical || "",
      prevention: scan.treatment_prevention || "",
    },
    ai_generated_advice: scan.ai_advice || "",
    scan_id: scan.id,
  };
}

function buildScanRecord({ farmerId, imagePath, imageHash, requestBody, aiResult }) {
  return {
    farmer_id: farmerId,
    crop_type: requestBody.crop_type || "Fasal",
    image_url: imagePath,
    image_hash: imageHash,
    disease_name: aiResult.disease_name || null,
    disease_name_hindi: aiResult.disease_name_hindi || aiResult.disease_name || null,
    confidence: Number(aiResult.confidence || aiResult.health_score || 0),
    is_healthy: aiResult.status === "healthy" || Boolean(aiResult.is_healthy),
    treatment_organic: aiResult.treatment?.organic || "",
    treatment_chemical: aiResult.treatment?.chemical || "",
    treatment_prevention: aiResult.treatment?.prevention || "",
    ai_advice: aiResult.ai_generated_advice || "",
    location: requestBody.location || "",
  };
}

async function insertCachedScan(req, cachedScan, requestBody) {
  const payload = {
    farmer_id: req.user.id,
    crop_type: requestBody.crop_type || cachedScan.crop_type,
    image_url: cachedScan.image_url,
    image_hash: cachedScan.image_hash,
    disease_name: cachedScan.disease_name,
    disease_name_hindi: cachedScan.disease_name_hindi,
    confidence: cachedScan.confidence,
    is_healthy: cachedScan.is_healthy,
    treatment_organic: cachedScan.treatment_organic,
    treatment_chemical: cachedScan.treatment_chemical,
    treatment_prevention: cachedScan.treatment_prevention,
    ai_advice: cachedScan.ai_advice,
    location: requestBody.location || cachedScan.location,
  };

  const { data, error } = await req.supabase
    .from("disease_scans")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return createSignedScan(req.supabase, data);
}

router.post(
  "/analyze",
  requireAuth,
  [
    body("image_base64").isString().withMessage("Photo upload karna zaroori hai."),
    body("crop_type").optional({ nullable: true }).isString(),
    body("location").optional({ nullable: true }).isString(),
    body("language").optional({ nullable: true }).isString(),
  ],
  async (req, res, next) => {
    let uploadedPath = null;

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Photo theek nahi mili.", errors: errors.array() });
      }

      if (!req.supabase) {
        return res.status(500).json({ message: "Supabase configure nahi hai." });
      }

      const parts = dataUrlParts(req.body.image_base64);
      if (!parts) {
        return res.status(400).json({ message: "Sirf JPG, PNG, ya WebP photo upload karein." });
      }

      const limit = await checkDiseaseScanLimit(req.supabase, req.user.id);
      if (!limit.allowed) {
        return res.status(429).json({
          message: limit.message,
          rate_limit: limit,
        });
      }

      const imageHash = hashImage(parts.base64);
      const { data: cached } = await req.supabase
        .from("disease_scans")
        .select("*")
        .eq("farmer_id", req.user.id)
        .eq("image_hash", imageHash)
        .gte("created_at", cacheSinceIso())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        const scan = await insertCachedScan(req, cached, req.body);
        return res.json({
          ...scan,
          cached: true,
          quota: { saved_api_call: true },
          rate_limit: {
            ...limit,
            remaining: Math.max(limit.remaining - 1, 0),
          },
        });
      }

      const imageBuffer = Buffer.from(parts.base64, "base64");
      const extension = extensionForContentType(parts.contentType);
      uploadedPath = `${req.user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await req.supabase.storage
        .from(DISEASE_BUCKET)
        .upload(uploadedPath, imageBuffer, {
          contentType: parts.contentType,
          cacheControl: "604800",
          upsert: false,
        });

      if (uploadError) {
        return res.status(400).json({ message: `Photo save nahi ho paayi: ${uploadError.message}` });
      }

      const { data: aiResult } = await axios.post(
        `${AI_SERVICE_URL}/ai/disease/analyze`,
        {
          image_base64: req.body.image_base64,
          crop_type: req.body.crop_type,
          location: req.body.location,
          language: req.body.language || "hindi",
          farmer_context: {
            id: req.user.id,
            location: req.body.location,
            crop_type: req.body.crop_type,
          },
        },
        { timeout: 75000 }
      );

      const record = buildScanRecord({
        farmerId: req.user.id,
        imagePath: uploadedPath,
        imageHash,
        requestBody: req.body,
        aiResult,
      });

      const { data: savedScan, error: saveError } = await req.supabase
        .from("disease_scans")
        .insert(record)
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      const signedScan = await createSignedScan(req.supabase, savedScan);

      return res.status(201).json({
        ...aiResult,
        ...signedScan,
        cached: false,
        rate_limit: {
          ...limit,
          remaining: Math.max(limit.remaining - 1, 0),
        },
      });
    } catch (error) {
      if (uploadedPath && req.supabase) {
        await req.supabase.storage.from(DISEASE_BUCKET).remove([uploadedPath]);
      }

      if (error.response?.data?.detail) {
        return res.status(error.response.status || 502).json({
          message: error.response.data.detail,
        });
      }

      next(error);
    }
  }
);

router.get("/history", requireAuth, async (req, res, next) => {
  try {
    if (!req.supabase) {
      return res.status(500).json({ message: "Supabase configure nahi hai." });
    }

    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const { data, error } = await req.supabase
      .from("disease_scans")
      .select("*")
      .eq("farmer_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const scans = await Promise.all((data || []).map((scan) => createSignedScan(req.supabase, scan)));
    res.json({ scans });
  } catch (error) {
    next(error);
  }
});

router.delete("/history", requireAuth, async (req, res, next) => {
  try {
    if (!req.supabase) {
      return res.status(500).json({ message: "Supabase configure nahi hai." });
    }

    const { data: scans, error: fetchError } = await req.supabase
      .from("disease_scans")
      .select("id,image_url")
      .eq("farmer_id", req.user.id);

    if (fetchError) {
      return res.status(400).json({ message: fetchError.message });
    }

    const paths = [...new Set((scans || []).map((scan) => scan.image_url).filter(Boolean))];
    if (paths.length) {
      await req.supabase.storage.from(DISEASE_BUCKET).remove(paths);
    }

    const { error: deleteError } = await req.supabase
      .from("disease_scans")
      .delete()
      .eq("farmer_id", req.user.id);

    if (deleteError) {
      return res.status(400).json({ message: deleteError.message });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete(
  "/scan/:id",
  requireAuth,
  [param("id").isUUID().withMessage("Valid scan id zaroori hai.")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.supabase) {
        return res.status(500).json({ message: "Supabase configure nahi hai." });
      }

      const { data: scan, error: fetchError } = await req.supabase
        .from("disease_scans")
        .select("id,image_url")
        .eq("id", req.params.id)
        .eq("farmer_id", req.user.id)
        .single();

      if (fetchError || !scan) {
        return res.status(404).json({ message: "Scan nahi mila." });
      }

      if (scan.image_url) {
        await req.supabase.storage.from(DISEASE_BUCKET).remove([scan.image_url]);
      }

      const { error: deleteError } = await req.supabase
        .from("disease_scans")
        .delete()
        .eq("id", req.params.id)
        .eq("farmer_id", req.user.id);

      if (deleteError) {
        return res.status(400).json({ message: deleteError.message });
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
