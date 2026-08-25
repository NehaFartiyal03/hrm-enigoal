import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogIn,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { Alert, Spinner } from "../components/ui";
import { msg } from "../api/axios";

export default function Login() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Login function
  const submit = async () => {
    setError("");

    if (!form.email.trim()) {
      setError("Please enter your work email.");
      return;
    }

    if (!form.password) {
      setError("Please enter your password.");
      return;
    }

    setBusy(true);

    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(msg(err));
    } finally {
      setBusy(false);
    }
  };

  // Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !busy) {
      submit();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center lg:p-6">

      {/* Main Login Card */}
      <div className="w-full min-h-screen lg:min-h-0 lg:max-w-6xl lg:h-[680px] bg-white lg:rounded-3xl overflow-hidden shadow-2xl grid lg:grid-cols-2">

        {/* =====================================================
            LEFT SIDE - BRAND PANEL
        ====================================================== */}
        <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-brand-700 text-white p-10 xl:p-14">

          {/* Background Decorations */}
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-white/10 blur-3xl" />

          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl" />

          <div className="absolute top-1/2 right-10 w-32 h-32 rounded-full border border-white/10" />

          <div className="absolute bottom-20 right-20 w-16 h-16 rounded-full border border-white/10" />


          {/* =================================================
              ENIGOAL LOGO
          ================================================== */}
          <div className="relative z-10">

            <div className="inline-flex items-center bg-white rounded-2xl px-4 py-3 shadow-xl">

              <img
                src="/logo.png"
                alt="Enigoal Logo"
                className="h-16 xl:h-20 w-auto object-contain"
              />

            </div>

          </div>


          {/* =================================================
              BRAND CONTENT
          ================================================== */}
          <div className="relative z-10 max-w-xl">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-sm text-brand-100 mb-6">

              <ShieldCheck size={16} />

              <span>
                Smart HR Management
              </span>

            </div>


            {/* Heading */}
            <h1 className="font-display text-4xl xl:text-5xl font-extrabold leading-[1.1] tracking-tight">

              Every employee,
              <br />

              every day,
              <br />

              <span className="text-brand-200">
                on one sheet.
              </span>

            </h1>


            {/* Description */}
            <p className="text-brand-100 mt-6 max-w-lg text-base xl:text-lg leading-7">

              Attendance, employee documents and ID cards for your
              entire team — managed quickly, simply and securely.

            </p>

          </div>


          {/* =================================================
              PROCESS STEPS
          ================================================== */}
          <div className="relative z-10">

            <div className="h-px w-full bg-white/10 mb-6" />

            <div className="flex items-center gap-8">

              {/* Step 1 */}
              <div>
                <span className="block text-2xl font-bold text-white">
                  01
                </span>

                <span className="text-sm text-brand-200">
                  Mark
                </span>
              </div>


              {/* Divider */}
              <div className="h-8 w-px bg-white/10" />


              {/* Step 2 */}
              <div>
                <span className="block text-2xl font-bold text-white">
                  02
                </span>

                <span className="text-sm text-brand-200">
                  Verify
                </span>
              </div>


              {/* Divider */}
              <div className="h-8 w-px bg-white/10" />


              {/* Step 3 */}
              <div>
                <span className="block text-2xl font-bold text-white">
                  03
                </span>

                <span className="text-sm text-brand-200">
                  Report
                </span>
              </div>

            </div>

          </div>

        </div>


        {/* =====================================================
            RIGHT SIDE - LOGIN FORM
        ====================================================== */}
        <div className="relative flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">

          {/* Mobile Top Border */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-brand-700 lg:hidden" />


          <div className="w-full max-w-md">


            {/* =================================================
                MOBILE LOGO
            ================================================== */}
            <div className="lg:hidden flex justify-center mb-10">

              <div className="bg-white rounded-2xl px-5 py-3 shadow-lg border border-slate-100">

                <img
                  src="/logo.png"
                  alt="Enigoal Logo"
                  className="h-16 sm:h-20 w-auto object-contain"
                />

              </div>

            </div>


            {/* =================================================
                WELCOME SECTION
            ================================================== */}
            <div className="mb-8">

              {/* Secure Portal Badge */}
              <div className="hidden lg:inline-flex items-center gap-2 text-sm font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full mb-4">

                <ShieldCheck size={15} />

                Secure employee portal

              </div>


              {/* Heading */}
              <h2 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-slate-900">

                Welcome back

              </h2>


              {/* Description */}
              <p className="text-sm sm:text-base text-slate-500 mt-2 leading-6">

                Sign in to your Enigoal account to continue.

              </p>

            </div>


            {/* =================================================
                ERROR MESSAGE
            ================================================== */}
            {error && (
              <div className="mb-5">
                <Alert>
                  {error}
                </Alert>
              </div>
            )}


            {/* =================================================
                LOGIN FORM
            ================================================== */}
            <div className="space-y-5">


              {/* =================================================
                  EMAIL
              ================================================== */}
              <div>

                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Work email
                </label>


                <div className="relative">

                  {/* Email Icon */}
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />


                  {/* Email Input */}
                  <input
                    id="email"
                    className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        email: e.target.value,
                      })
                    }
                    onKeyDown={handleKeyDown}
                  />

                </div>

              </div>


              {/* =================================================
                  PASSWORD
              ================================================== */}
              <div>

                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Password
                </label>


                <div className="relative">

                  {/* Lock Icon */}
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />


                  {/* Password Input */}
                  <input
                    id="password"
                    className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        password: e.target.value,
                      })
                    }
                    onKeyDown={handleKeyDown}
                  />

                </div>

              </div>


              {/* =================================================
                  SIGN IN BUTTON
              ================================================== */}
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="group relative w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-brand-700 text-white font-semibold text-sm shadow-lg shadow-brand-700/20 transition-all duration-200 hover:bg-brand-800 hover:shadow-xl hover:shadow-brand-700/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >

                {busy ? (
                  <>
                    <Spinner />

                    <span>
                      Signing in...
                    </span>
                  </>
                ) : (
                  <>
                    <LogIn size={17} />

                    <span>
                      Sign in
                    </span>

                    <ArrowRight
                      size={16}
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </>
                )}

              </button>

            </div>


            {/* =================================================
                FORGOT PASSWORD
            ================================================== */}
            <div className="mt-8 pt-6 border-t border-slate-100">

              <p className="text-xs text-slate-500 leading-5">

                Forgot your password? Ask your{" "}

                <span className="font-semibold text-slate-700">
                  HR administrator
                </span>{" "}

                to reset it.

              </p>

            </div>


            {/* =================================================
                SECURITY MESSAGE
            ================================================== */}
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">

              <ShieldCheck size={14} />

              <span>
                Your account information is securely protected.
              </span>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}