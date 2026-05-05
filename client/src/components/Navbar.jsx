import { Leaf, LogOut, Menu, Sprout, User, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, NavLink, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import useLanguage from "../hooks/useLanguage.js";
import { getLanguageOption } from "../utils/translations.js";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, profile, loading, logout } = useAuth();
  const { language, languages, changeLanguage, translate } = useLanguage();
  const navigate = useNavigate();
  const currentLanguage = getLanguageOption(language);
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const appLinks = [
    { href: "/dashboard", label: translate("dashboard") },
    { href: "/chatbot", label: translate("chatbot") },
    { href: "/disease-scanner", label: translate("disease") },
    { href: "/market", label: translate("market") },
    { href: "/marketplace", label: translate("marketplace") },
    { href: "/schemes", label: translate("schemes") },
  ];

  const navLinkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition ${
      isActive ? "bg-green-100 text-agro-green" : "text-slate-700 hover:bg-green-50"
    }`;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully.");
      navigate("/");
    } catch (error) {
      toast.error(error.message || "Logout failed.");
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-green-100 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-agro-green text-white">
            <Sprout size={22} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-lg font-extrabold leading-5 text-agro-green">
              AgroSaathi
            </span>
            <span className="block text-xs font-semibold text-agro-orange">
              किसान साथी
            </span>
          </span>
        </Link>

        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-green-100 text-slate-700 md:hidden"
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className="hidden flex-wrap items-center justify-end gap-1 md:flex">
          <NavLink to="/" className={navLinkClass}>
            {translate("home")}
          </NavLink>
          {loading ? null : user ? (
            <>
              {appLinks.map((item) => (
                <NavLink key={item.href} to={item.href} className={navLinkClass}>
                  {item.label}
                </NavLink>
              ))}
              <select
                className="rounded-lg border border-green-100 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-agro-green"
                value={language}
                aria-label="Change language"
                onChange={(event) => changeLanguage(event.target.value)}
              >
                {languages.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.icon} {item.nativeName}
                  </option>
                ))}
              </select>
              <span className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-slate-700">
                <User size={17} aria-hidden="true" />
                {displayName}
              </span>
              <button
                className="secondary-button min-h-10 px-3 py-2 text-sm"
                type="button"
                onClick={handleLogout}
              >
                <LogOut size={17} aria-hidden="true" />
                {translate("logout")}
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass}>
                {translate("login")}
              </NavLink>
              <Link className="primary-button min-h-10 px-4 py-2 text-sm" to="/register">
                <Leaf size={17} aria-hidden="true" />
                {translate("register")}
              </Link>
            </>
          )}
        </div>
      </nav>

      {open && (
        <div className="border-t border-green-100 bg-white px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-2">
            <NavLink to="/" className={navLinkClass} onClick={() => setOpen(false)}>
              {translate("home")}
            </NavLink>
            {loading ? null : user ? (
              <>
                {appLinks.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={navLinkClass}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
                <label className="block">
                  <span className="field-label">{translate("language")}</span>
                  <select
                    className="field-input"
                    value={language}
                    onChange={(event) => changeLanguage(event.target.value)}
                  >
                    {languages.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.icon} {item.nativeName}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-slate-700">
                  <User size={17} aria-hidden="true" />
                  {displayName} · {currentLanguage.nativeName}
                </div>
                <button
                  className="secondary-button justify-start"
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut size={17} aria-hidden="true" />
                  {translate("logout")}
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass} onClick={() => setOpen(false)}>
                  {translate("login")}
                </NavLink>
                <Link
                  className="primary-button justify-start"
                  to="/register"
                  onClick={() => setOpen(false)}
                >
                  <Leaf size={17} aria-hidden="true" />
                  {translate("register")}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
