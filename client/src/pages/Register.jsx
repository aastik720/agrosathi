import { UserPlus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  userType: "farmer",
  preferredLanguage: "hindi",
  location: "",
};

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await register(form);
      if (data.session) {
        toast.success("Account created. Please complete your profile.");
        navigate("/profile-setup", { replace: true });
      } else {
        toast.success("Account created. Please verify your email, then login.");
        navigate("/login", { replace: true });
      }
    } catch (error) {
      toast.error(error.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-shell flex min-h-[78vh] items-center justify-center">
      <div className="w-full max-w-2xl rounded-lg border border-green-100 bg-white p-6 shadow-soft sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-bold text-agro-orange">Register</p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-950">
            AgroSaathi par naya account
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Pehle login details banayein. Uske baad apni bhasha, zameen aur fasal
            ki profile complete hogi.
          </p>
        </div>

        <form className="grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block sm:col-span-2">
            <span className="field-label">Full Name</span>
            <input
              className="field-input"
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Ramesh Sharma"
              required
            />
          </label>

          <label className="block sm:col-span-2">
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
              placeholder="Minimum 6 characters"
              required
            />
          </label>

          <label className="block">
            <span className="field-label">Confirm Password</span>
            <input
              className="field-input"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat password"
              required
            />
          </label>

          <label className="block">
            <span className="field-label">User Type</span>
            <select
              className="field-input"
              name="userType"
              value={form.userType}
              onChange={handleChange}
              required
            >
              <option value="farmer">Farmer</option>
              <option value="buyer">Buyer</option>
            </select>
          </label>

          <label className="block">
            <span className="field-label">Language Preference</span>
            <select
              className="field-input"
              name="preferredLanguage"
              value={form.preferredLanguage}
              onChange={handleChange}
              required
            >
              <option value="hindi">Hindi</option>
              <option value="punjabi">Punjabi</option>
              <option value="pahadi">Pahadi</option>
              <option value="english">English</option>
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="field-label">Location</span>
            <input
              className="field-input"
              name="location"
              type="text"
              value={form.location}
              onChange={handleChange}
              placeholder="Theog, Himachal Pradesh"
              required
            />
          </label>

          <button className="primary-button w-full sm:col-span-2" type="submit" disabled={submitting}>
            {submitting ? <span className="spinner" /> : <UserPlus size={19} aria-hidden="true" />}
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link className="font-bold text-agro-green hover:underline" to="/login">
            Login here
          </Link>
        </p>
      </div>
    </section>
  );
}
