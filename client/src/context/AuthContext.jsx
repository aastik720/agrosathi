import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabaseClient.js";

export const AuthContext = createContext(null);
const AUTH_TIMEOUT_MS = 8000;

function withTimeout(promise, label, timeoutMs = AUTH_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(`${label} timed out.`)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const fetchProfile = useCallback(async (userId) => {
    if (!supabase || !userId) {
      setProfile(null);
      return null;
    }

    try {
      const { data, error } = await withTimeout(
        supabase.from("profiles").select("*").eq("id", userId).single(),
        "Profile load"
      );

      if (error) {
        setProfile(null);
        return null;
      }

      setProfile(data);
      setAuthError("");
      return data;
    } catch (error) {
      console.warn("Profile load failed:", error.message);
      setProfile(null);
      setAuthError("Profile load nahi ho paaya. Internet ya Supabase connection check karein.");
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), "Session load");

        if (!mounted) return;

        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setAuthError("");
        }
      } catch (error) {
        console.warn("Session load failed:", error.message);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setAuthError("Login session load nahi ho paaya. Please refresh ya dobara login karein.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSession();

    if (!supabase) {
      return () => {
        mounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      if (!session?.user) {
        setProfile(null);
        setAuthError("");
        setLoading(false);
        return;
      }

      setLoading(true);
      window.setTimeout(async () => {
        if (!mounted) return;

        try {
          await fetchProfile(session.user.id);
        } catch (error) {
          console.warn("Auth state change failed:", error.message);
          setAuthError("Login state update nahi ho paaya.");
        } finally {
          if (mounted) setLoading(false);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async ({ email, password }) => {
    if (!supabase) {
      throw new Error("Supabase environment variables are missing.");
    }

    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({
        email,
        password,
      }),
      "Login"
    );

    if (error) throw error;
    setUser(data.user);
    await fetchProfile(data.user.id);
    return data;
  };

  const register = async ({
    email,
    password,
    fullName,
    userType,
    preferredLanguage,
    location,
  }) => {
    if (!supabase) {
      throw new Error("Supabase environment variables are missing.");
    }

    const { data, error } = await withTimeout(
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: userType,
            preferred_language: preferredLanguage,
            location,
          },
        },
      }),
      "Registration"
    );

    if (error) throw error;
    if (!data.user) throw new Error("Registration failed. Please try again.");

    const profilePayload = {
      id: data.user.id,
      full_name: fullName,
      phone: "",
      location,
      land_size: null,
      crop_types: [],
      preferred_language: preferredLanguage,
      user_type: userType,
    };

    if (data.session) {
      const { error: profileError } = await withTimeout(
        supabase.from("profiles").upsert(profilePayload, { onConflict: "id" }),
        "Profile setup"
      );

      if (profileError) throw profileError;
    }

    if (data.session) {
      setUser(data.user);
      setProfile(profilePayload);
    }
    return data;
  };

  const logout = async () => {
    if (!supabase) return;
    const { error } = await withTimeout(supabase.auth.signOut(), "Logout");
    if (error) throw error;
    setUser(null);
    setProfile(null);
    setAuthError("");
  };

  const updateProfile = async (updates) => {
    if (!supabase || !user) {
      throw new Error("Please login before updating profile.");
    }

    const { data, error } = await withTimeout(
      supabase
        .from("profiles")
        .upsert({ id: user.id, ...updates }, { onConflict: "id" })
        .select()
        .single(),
      "Profile update"
    );

    if (error) throw error;
    setProfile(data);
    setAuthError("");
    return data;
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      authError,
      login,
      logout,
      register,
      updateProfile,
      refreshProfile: () => fetchProfile(user?.id),
    }),
    [user, profile, loading, authError, fetchProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
