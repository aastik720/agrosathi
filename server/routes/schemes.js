import crypto from "crypto";
import express from "express";
import { body, param, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { checkEligibility, getSchemeById, governmentSchemes } from "../utils/schemeEligibility.js";

const router = express.Router();

function validationErrorResponse(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ message: "Request details theek nahi hain.", errors: errors.array() });
  return true;
}

async function getProfile(req) {
  const { data, error } = await req.supabase
    .from("profiles")
    .select("*")
    .eq("id", req.user.id)
    .single();

  if (error) throw error;
  return data;
}

async function getApplications(req) {
  const { data, error } = await req.supabase
    .from("scheme_applications")
    .select("*")
    .eq("farmer_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn(`Scheme applications unavailable: ${error.message}`);
    return [];
  }

  return data || [];
}

function totalBenefit(schemes) {
  return schemes
    .filter((scheme) => scheme.eligible)
    .reduce((sum, scheme) => sum + Number(scheme.estimated_benefit_amount || 0), 0);
}

function buildTrackingId(schemeId) {
  const prefix = String(schemeId || "scheme")
    .split("-")
    .map((part) => part[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
  const year = new Date().getFullYear();
  const suffix = crypto.randomInt(100000, 999999);
  return `${prefix}-${year}-${suffix}`;
}

router.get("/", (_req, res) => {
  res.json({
    source: "phase-7",
    message: "Government scheme auto-matcher is live.",
    schemes: governmentSchemes,
  });
});

router.get("/all", (_req, res) => {
  res.json({
    schemes: governmentSchemes,
    data: governmentSchemes,
    total: governmentSchemes.length,
  });
});

router.get("/eligible", requireAuth, async (req, res, next) => {
  try {
    if (!req.supabase) {
      return res.status(500).json({ message: "Supabase is not configured." });
    }

    const [profile, applications] = await Promise.all([getProfile(req), getApplications(req)]);
    const schemes = checkEligibility(profile, applications);
    const eligibleSchemes = schemes.filter((scheme) => scheme.eligible);
    const applicationsByScheme = applications.reduce((acc, application) => {
      acc[application.scheme_id || application.scheme_name] = application;
      return acc;
    }, {});

    res.json({
      schemes,
      eligible_schemes: eligibleSchemes,
      non_eligible_schemes: schemes.filter((scheme) => !scheme.eligible),
      applications,
      applications_by_scheme: applicationsByScheme,
      eligible_count: eligibleSchemes.length,
      total_possible_benefit: totalBenefit(schemes),
      profile_summary: {
        land_size: profile.land_size,
        location: profile.location,
        crops: profile.crop_types || [],
        farmer_type: Number(profile.land_size || 0) <= 2 ? "Small/Marginal Farmer" : "Large Farmer",
      },
      notifications: [
        eligibleSchemes[0]
          ? `Aap ${eligibleSchemes[0].scheme_name} ke liye eligible hain! Apply karein.`
          : "Nayi schemes ke liye profile update rakhein.",
        "New scheme launched in HP for apple growers.",
      ],
    });
  } catch (error) {
    next(error);
  }
});

router.get("/details/:id", requireAuth, [param("id").isString().notEmpty()], async (req, res, next) => {
  try {
    if (validationErrorResponse(req, res)) return;
    if (!req.supabase) {
      return res.status(500).json({ message: "Supabase is not configured." });
    }

    const scheme = getSchemeById(req.params.id);
    if (!scheme) return res.status(404).json({ message: "Scheme nahi mili." });

    const [profile, applications] = await Promise.all([getProfile(req), getApplications(req)]);
    const evaluated = checkEligibility(profile, applications).find((item) => item.id === scheme.id);

    res.json({
      scheme: evaluated,
      success_stories: [
        {
          farmer: "Ramesh Kumar",
          location: "Theog",
          quote: "Maine apply kiya aur PM Kisan se ₹6,000 mila.",
        },
        {
          farmer: "Sunita Devi",
          location: "Kotkhai",
          quote: "Soil Health Card se khad ka kharcha kam hua.",
        },
      ],
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/apply",
  requireAuth,
  [
    body("scheme_id").isString().notEmpty(),
    body("documents_uploaded").optional().isArray(),
  ],
  async (req, res, next) => {
    try {
      if (validationErrorResponse(req, res)) return;
      if (!req.supabase) {
        return res.status(500).json({ message: "Supabase is not configured." });
      }

      const scheme = getSchemeById(req.body.scheme_id);
      if (!scheme) return res.status(404).json({ message: "Scheme nahi mili." });

      const profile = await getProfile(req);
      const [evaluated] = checkEligibility(profile, []).filter((item) => item.id === scheme.id);
      if (!evaluated?.eligible) {
        return res.status(400).json({ message: evaluated?.reason || "Aap is scheme ke liye eligible nahi hain." });
      }

      const trackingId = buildTrackingId(scheme.id);
      const payload = {
        farmer_id: req.user.id,
        scheme_id: scheme.id,
        scheme_name: scheme.scheme_name,
        scheme_url: scheme.apply_link,
        status: "applied",
        application_status: "applied",
        application_date: new Date().toISOString().slice(0, 10),
        amount_received: 0,
        documents_uploaded: req.body.documents_uploaded || [],
        tracking_id: trackingId,
      };

      const { data: existing } = await req.supabase
        .from("scheme_applications")
        .select("id")
        .eq("farmer_id", req.user.id)
        .eq("scheme_id", scheme.id)
        .maybeSingle();

      const query = existing?.id
        ? req.supabase
            .from("scheme_applications")
            .update(payload)
            .eq("id", existing.id)
            .eq("farmer_id", req.user.id)
        : req.supabase.from("scheme_applications").insert(payload);

      let { data, error } = await query.select().single();

      if (error && /column|schema cache|tracking_id|scheme_id|application_status|documents_uploaded/i.test(error.message || "")) {
        const legacyPayload = {
          farmer_id: req.user.id,
          scheme_name: scheme.scheme_name,
          scheme_url: scheme.apply_link,
          status: "applied",
        };
        const legacyResult = await req.supabase
          .from("scheme_applications")
          .insert(legacyPayload)
          .select()
          .single();
        data = {
          ...(legacyResult.data || legacyPayload),
          scheme_id: scheme.id,
          application_status: "applied",
          application_date: new Date().toISOString().slice(0, 10),
          amount_received: 0,
          documents_uploaded: req.body.documents_uploaded || [],
          tracking_id: trackingId,
        };
        error = legacyResult.error;
      }

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      res.status(201).json({
        application: data,
        tracking_id: trackingId,
        message: "Application submitted successfully!",
        notification: `Aapki ${scheme.scheme_name} application submit ho gayi.`,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/applications/:id/status",
  requireAuth,
  [
    param("id").isUUID(),
    body("application_status").isIn(["not_applied", "applied", "pending", "approved", "rejected"]),
  ],
  async (req, res, next) => {
    try {
      if (validationErrorResponse(req, res)) return;
      const updates = {
        application_status: req.body.application_status,
        status: req.body.application_status === "approved" ? "approved" : req.body.application_status,
        approval_date: req.body.application_status === "approved" ? new Date().toISOString().slice(0, 10) : null,
        amount_received: req.body.amount_received || 0,
        rejection_reason: req.body.rejection_reason || null,
      };

      const { data, error } = await req.supabase
        .from("scheme_applications")
        .update(updates)
        .eq("id", req.params.id)
        .eq("farmer_id", req.user.id)
        .select()
        .single();

      if (error) return res.status(400).json({ message: error.message });
      res.json({ application: data });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
