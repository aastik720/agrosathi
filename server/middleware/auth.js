import { createUserSupabaseClient, supabaseAdmin } from "../config/supabase.js";

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Missing authorization token." });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ message: "Supabase server is not configured." });
    }

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    req.user = user;
    req.accessToken = token;
    req.supabase = createUserSupabaseClient(token);
    next();
  } catch (error) {
    next(error);
  }
}
