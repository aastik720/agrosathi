import { Navigate, useLocation } from "react-router-dom";
import LoadingSpinner from "./LoadingSpinner.jsx";
import useAuth from "../hooks/useAuth.js";
import useProfileCheck from "../hooks/useProfileCheck.js";

export default function ProtectedRoute({ children, requireComplete = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { profileComplete } = useProfileCheck({ redirect: false });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireComplete && !profileComplete) {
    return <Navigate to="/profile-setup" state={{ from: location }} replace />;
  }

  return children;
}
