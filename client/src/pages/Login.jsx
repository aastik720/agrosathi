import { LogIn } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await login(form);
      toast.success("AgroSaathi mein swagat hai.");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error.message || "Login nahi ho paaya. Email/password check karein.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-shell flex min-h-[78vh] items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-green-100 bg-white p-6 shadow-soft sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-bold text-agro-orange">Login</p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-950">Swagat hai</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Apna dashboard, mausam, Saathi AI aur disease scanner kholne ke liye login karein.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="field-label">Email</span>
            <input
              className="field-input"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="farmer@example.com"
              required
            />
          </label>

          <label className="block">
            <span className="field-label">Password</span>
            <input
              className="field-input"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Your password"
              required
            />
          </label>

          <button className="primary-button w-full" type="submit" disabled={submitting}>
            {submitting ? <span className="spinner" /> : <LogIn size={19} aria-hidden="true" />}
            {submitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          New to AgroSaathi?{" "}
          <Link className="font-bold text-agro-green hover:underline" to="/register">
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}
