import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "./useAuth.js";

export function isProfileComplete(profile) {
  if (profile?.user_type === "buyer") {
    return Boolean(
      profile?.preferred_language &&
        profile?.location &&
        Array.isArray(profile?.crop_types) &&
        profile.crop_types.length > 0
    );
  }

  return Boolean(
    profile?.preferred_language &&
      profile?.location &&
      profile?.land_size !== null &&
      profile?.land_size !== undefined &&
      Array.isArray(profile?.crop_types) &&
      profile.crop_types.length > 0
  );
}

export default function useProfileCheck({ redirect = true } = {}) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const complete = useMemo(() => isProfileComplete(profile), [profile]);

  useEffect(() => {
    if (!redirect || loading || !user) return;

    if (!complete && location.pathname !== "/profile-setup") {
      navigate("/profile-setup", {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [complete, loading, user, redirect, location.pathname, navigate]);

  return {
    profileComplete: complete,
    checkingProfile: loading,
  };
}
