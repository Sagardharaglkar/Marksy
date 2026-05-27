import { useState, useEffect, useRef } from "react";
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

  // Forgot password flow
  const [forgotStep, setForgotStep] = useState(null); // null | "send" | "otp" | "newpwd" | "done"
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNew, setForgotNew] = useState("");
  const [forgotReenter, setForgotReenter] = useState("");
  const [forgotShowNew, setForgotShowNew] = useState(false);
  const [forgotShowReenter, setForgotShowReenter] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0); // seconds remaining
  const cooldownRef = useRef(null);

  function startResendCooldown() {
    setResendCooldown(30);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function openForgot() {
    setForgotStep("send");
    setForgotPhone(phone);
    setForgotOtp(""); setForgotNew(""); setForgotReenter("");
    setForgotError(""); setForgotShowNew(false); setForgotShowReenter(false);
    setResendCooldown(0);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  }
  function closeForgot() {
    setForgotStep(null);
    setResendCooldown(0);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  }

  async function handleForgotSendOtp(e) {
    if (e) e.preventDefault();
    setForgotError(""); setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password/send-otp", {
        college_id: college ? college.college_id : undefined,
        phone: forgotPhone,
      });
      setForgotStep("otp");
      startResendCooldown();
    } catch (err) {
      setForgotError(err.response?.data?.error || "Failed to send OTP");
    } finally { setForgotLoading(false); }
  }

  function handleForgotVerifyOtp(e) {
    e.preventDefault();
    setForgotError("");
    if (forgotOtp.length !== 6) { setForgotError("Enter the 6-digit OTP"); return; }
    setForgotStep("newpwd");
  }

  async function handleForgotReset(e) {
    e.preventDefault();
    setForgotError("");
    if (forgotNew.length < 6) { setForgotError("Password must be at least 6 characters"); return; }
    if (forgotNew !== forgotReenter) { setForgotError("Passwords do not match"); return; }
    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password/reset", {
        college_id: college ? college.college_id : undefined,
        phone: forgotPhone,
        otp: forgotOtp,
        new_password: forgotNew,
      });
      setForgotStep("done");
    } catch (err) {
      // If OTP was wrong/expired, go back to OTP step
      if (err.response?.status === 401) {
        setForgotStep("otp");
        setForgotOtp("");
      }
      setForgotError(err.response?.data?.error || "Failed to reset password");
    } finally { setForgotLoading(false); }
  }

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
      const user = await login(college ? college.college_id : null, phone, password, college?.name);
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

      {/* Forgot Password Modal */}
      {forgotStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={closeForgot}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-5 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="font-head text-lg font-bold text-zinc-900">Forgot Password</h2>
              <button onClick={closeForgot} className="text-zinc-400 hover:text-zinc-600 transition text-xl leading-none">×</button>
            </div>
            <div className="px-7 py-6 flex flex-col gap-4">

              {/* Step 1: Enter phone */}
              {forgotStep === "send" && (
                <form onSubmit={handleForgotSendOtp} className="flex flex-col gap-4">
                  <p className="text-xs text-zinc-500 font-mono">Enter your registered phone number. We'll send an OTP via WhatsApp.</p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Phone</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={forgotPhone}
                      onChange={e => setForgotPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit number"
                      autoFocus
                      className="w-full bg-stone-50 border border-zinc-200 rounded-xl font-mono text-sm px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                    />
                  </div>
                  {forgotError && <p className="text-xs text-red-500 font-mono">{forgotError}</p>}
                  <button type="submit" disabled={forgotLoading} className="w-full bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-white font-mono text-xs py-2.5 rounded-xl transition cursor-pointer">
                    {forgotLoading ? "Sending OTP…" : "Send OTP →"}
                  </button>
                </form>
              )}

              {/* Step 2: Enter OTP */}
              {forgotStep === "otp" && (
                <form onSubmit={handleForgotVerifyOtp} className="flex flex-col gap-4">
                  <p className="text-xs text-zinc-500 font-mono">OTP sent to your WhatsApp.</p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">OTP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={e => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit OTP"
                      autoFocus
                      className="w-full bg-stone-50 border border-zinc-200 rounded-xl font-mono text-lg tracking-[0.4em] text-center px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                    />
                    <p className="text-[10px] text-zinc-400 font-mono">
                      Didn't receive it?{" "}
                      {resendCooldown > 0
                        ? <span className="text-zinc-400">Resend in {resendCooldown}s</span>
                        : <button type="button" onClick={handleForgotSendOtp} disabled={forgotLoading} className="text-amber-600 hover:underline disabled:opacity-50">Resend</button>
                      }
                    </p>
                  </div>
                  {forgotError && <p className="text-xs text-red-500 font-mono">{forgotError}</p>}
                  <button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-700 text-white font-mono text-xs py-2.5 rounded-xl transition cursor-pointer">
                    Verify OTP →
                  </button>
                  <div className="text-center">
                    <button type="button" onClick={() => { setForgotStep("send"); setForgotError(""); }} className="text-xs text-zinc-400 hover:text-zinc-600 font-mono transition">← Back</button>
                  </div>
                </form>
              )}

              {/* Step 3: Enter new password */}
              {forgotStep === "newpwd" && (
                <form onSubmit={handleForgotReset} className="flex flex-col gap-3">
                  <p className="text-xs text-zinc-500 font-mono">OTP verified. Set your new password.</p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">New Password</label>
                    <div className="relative">
                      <input
                        type={forgotShowNew ? "text" : "password"}
                        value={forgotNew}
                        onChange={e => setForgotNew(e.target.value)}
                        placeholder="At least 6 characters"
                        autoFocus
                        className="w-full bg-stone-50 border border-zinc-200 rounded-xl font-mono text-sm px-4 py-2.5 pr-10 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                      />
                      <button type="button" tabIndex={-1} onClick={() => setForgotShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition">
                        {forgotShowNew
                          ? <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        }
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Re-enter Password</label>
                    <div className="relative">
                      <input
                        type={forgotShowReenter ? "text" : "password"}
                        value={forgotReenter}
                        onChange={e => setForgotReenter(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full bg-stone-50 border border-zinc-200 rounded-xl font-mono text-sm px-4 py-2.5 pr-10 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                      />
                      <button type="button" tabIndex={-1} onClick={() => setForgotShowReenter(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition">
                        {forgotShowReenter
                          ? <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        }
                      </button>
                    </div>
                  </div>
                  {forgotError && <p className="text-xs text-red-500 font-mono">{forgotError}</p>}
                  <button type="submit" disabled={forgotLoading} className="w-full bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-white font-mono text-xs py-2.5 rounded-xl transition cursor-pointer mt-1">
                    {forgotLoading ? "Saving…" : "Reset Password"}
                  </button>
                </form>
              )}

              {forgotStep === "done" && (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-mono text-center">
                    Password reset successfully. You can now sign in.
                  </div>
                  <button onClick={closeForgot} className="w-full border border-zinc-200 text-zinc-500 hover:bg-zinc-50 font-mono text-xs py-2.5 rounded-xl transition cursor-pointer">
                    Back to Sign In
                  </button>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Left accent panel — visible on large screens */}
      <div className="hidden lg:flex lg:w-[420px] bg-zinc-900 flex-col justify-between p-12 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-20">
            <span className="text-amber-400 text-xl leading-none">◈</span>
            <span className="font-head text-[11px] font-bold tracking-[0.25em] text-zinc-500 uppercase">Marks Portal</span>
          </div>
          <h1 className="font-head text-5xl font-extrabold text-white leading-[1.1] mb-6">
            Semester<br />Evaluation<br />Record System
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

                {!isSuperAdmin && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={openForgot}
                      className="text-xs text-zinc-400 hover:text-zinc-700 font-mono underline underline-offset-2 transition"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
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
