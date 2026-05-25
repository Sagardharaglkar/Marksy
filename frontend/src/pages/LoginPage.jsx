import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();

  const isSuperAdmin = state?.superAdmin || false;

  const [step, setStep] = useState(isSuperAdmin ? "creds" : "code");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [college, setCollege] = useState(null);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  async function handleCodeSubmit(e) {
    e.preventDefault();
    setCodeError("");
    if (code.trim().length !== 8) {
      setCodeError("College code must be exactly 8 characters.");
      return;
    }
    setCodeLoading(true);
    try {
      const res = await api.post("/auth/resolve-code", { college_code: code.trim().toUpperCase() });
      setCollege(res.data);
      setStep("creds");
    } catch (err) {
      setCodeError(err.response?.data?.error || "College not found.");
    } finally {
      setCodeLoading(false);
    }
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setLoginError("");
    if (!phone || !password) {
      setLoginError("Phone and password are required.");
      return;
    }
    setLoginLoading(true);
    try {
      const user = await login(college ? college.college_id : null, phone, password);
      if (user.role === "super_admin") navigate("/super-admin");
      else if (user.role === "clerk") navigate("/clerk");
      else navigate("/faculty");
    } catch (err) {
      setLoginError(err.response?.data?.error || "Login failed.");
    } finally {
      setLoginLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col lg:flex-row" data-testid="login-page">

      {/* Left accent panel — visible on large screens */}
      <div className="hidden lg:flex lg:w-[420px] bg-zinc-900 flex-col justify-between p-12 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-20">
            <span className="text-amber-400 text-xl leading-none">◈</span>
            <span className="font-head text-[11px] font-bold tracking-[0.25em] text-zinc-500 uppercase">Marks Portal</span>
          </div>
          <h1 className="font-head text-5xl font-extrabold text-white leading-[1.1] mb-6">
            Academic<br />Records<br />System
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-[260px]">
            Secure marks management for colleges, faculty, and administrators.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-px bg-amber-400"></div>
          <span className="text-zinc-600 text-xs font-mono tracking-widest uppercase">VengurlaTech</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-10">

        {/* Mobile brand */}
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <span className="text-amber-500 text-lg">◈</span>
          <span className="font-head text-xs font-bold tracking-[0.2em] text-zinc-500 uppercase">Marks Portal</span>
        </div>

        <div className="w-full max-w-[360px]">

          {/* ── Step 1: College code ── */}
          {step === "code" && (
            <div>
              <p className="text-[10px] font-mono tracking-widest text-amber-600 uppercase mb-3">Step 1 of 2</p>
              <h2 className="font-head text-3xl font-extrabold text-zinc-900 mb-2">Institution Code</h2>
              <p className="text-zinc-500 text-sm mb-8">Your 8-character college identifier</p>

              <form onSubmit={handleCodeSubmit} className="flex flex-col gap-5">
                <div>
                  <input
                    type="text"
                    maxLength={8}
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX"
                    className="w-full bg-white border-2 border-zinc-200 rounded-xl text-zinc-900 font-mono text-2xl sm:text-3xl tracking-[0.35em] text-center py-4 px-3 outline-none focus:border-amber-400 transition placeholder-zinc-300"
                    data-testid="college-code-input"
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {codeError && (
                    <p className="mt-2 text-xs text-red-500 font-mono" data-testid="code-error">{codeError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={codeLoading}
                  className="w-full bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-white font-head font-bold text-sm tracking-wide py-3.5 rounded-xl transition cursor-pointer"
                  data-testid="code-submit"
                >
                  {codeLoading ? "Verifying…" : "Continue →"}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-zinc-200 text-center">
                <button
                  className="text-xs text-zinc-400 hover:text-zinc-700 font-mono tracking-wide transition"
                  onClick={() => { setStep("creds"); setLoginError(""); setPhone(""); setPassword(""); }}
                >
                  Super-admin access →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Credentials ── */}
          {step === "creds" && (
            <div>
              {isSuperAdmin ? (
                <>
                  <p className="text-[10px] font-mono tracking-widest text-amber-600 uppercase mb-3">Admin</p>
                  <h2 className="font-head text-3xl font-extrabold text-zinc-900 mb-8">Super Admin</h2>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-mono tracking-widest text-amber-600 uppercase mb-3">Step 2 of 2</p>
                  <h2 className="font-head text-2xl font-extrabold text-zinc-900 mb-1">{college?.name}</h2>
                  <p className="text-zinc-500 text-sm mb-8">Sign in to continue</p>
                </>
              )}

              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit number"
                    maxLength={10}
                    inputMode="numeric"
                    className="w-full bg-white border border-zinc-200 rounded-xl text-zinc-900 font-mono text-sm px-4 py-3 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition placeholder-zinc-300"
                    data-testid="login-phone"
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-zinc-200 rounded-xl text-zinc-900 font-mono text-sm px-4 py-3 pr-11 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition placeholder-zinc-300"
                      data-testid="login-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <p className="text-xs text-red-500 font-mono" data-testid="login-error">{loginError}</p>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-white font-head font-bold text-sm tracking-wide py-3.5 rounded-xl transition cursor-pointer"
                  data-testid="login-submit"
                >
                  {loginLoading ? "Signing in…" : "Sign In →"}
                </button>
              </form>

              {!isSuperAdmin && (
                <div className="mt-8 pt-6 border-t border-zinc-200 text-center">
                  <button
                    className="text-xs text-zinc-400 hover:text-zinc-700 font-mono tracking-wide transition"
                    onClick={() => { setStep("code"); setLoginError(""); }}
                  >
                    ← Change college code
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
