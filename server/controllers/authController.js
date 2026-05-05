import { validationResult } from "express-validator";
import { supabaseAdmin } from "../config/supabase.js";

export async function getCurrentUser(req, res, next) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ message: "Supabase server is not configured." });
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      return res.status(400).json({ message: error.message });
    }

    res.json({
      user: req.user,
      profile: profile || null,
    });
  } catch (error) {
    next(error);
  }
}

export async function upsertProfile(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ message: "Supabase server is not configured." });
    }

    const {
      full_name,
      phone = "",
      location,
      land_size = null,
      crop_types = [],
      preferred_language,
      user_type,
    } = req.body;

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: req.user.id,
          full_name,
          phone,
          location,
          land_size,
          crop_types,
          preferred_language,
          user_type,
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.status(201).json({ profile: data });
  } catch (error) {
    next(error);
  }
}
