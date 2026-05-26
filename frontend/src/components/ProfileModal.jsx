import { useState, useEffect, useRef } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

// "profile" | "change_password" | "forgot_otp" | "done"
export default function ProfileModal({ user, onClose }) {
  const { logout } = useAuth();

  const [profile, setProfile]              = useState(null);
  const [step, setStep]                    = useState("profile");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]      = useState("");
  const [reEnterPassword, setReEnterPassword] = useState("");
  const [otp, setOtp]                      = useState("");
  const [loading, setLoading]              = useState(false);
  const [error, setError]                  = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
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

  useEffect(() => {
    api.get("/profile").then(r => setProfile(r.data)).catch(() => {});
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  function openChangePassword() {
    setStep("change_password");
    setCurrentPassword(""); setNewPassword(""); setReEnterPassword("");
    setOtp(""); setError("");
  }

  async function handleSendOtp() {
    setError(""); setLoading(true);
    try {
      await api.post("/profile/send-otp");
      setStep("forgot_otp");
      startResendCooldown();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    } finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6)          { setError("New password must be at least 6 characters"); return; }
    if (newPassword !== reEnterPassword) { setError("Passwords do not match"); return; }

    const body = { new_password: newPassword };
    if (step === "change_password") body.old_password = currentPassword;
    if (step === "forgot_otp")      body.otp = otp;

    setLoading(true);
    try {
      await api.post("/profile/change-password", body);
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change password");
    } finally { setLoading(false); }
  }

  function handleSignOut() {
    logout();
    onClose();
  }

  const displayName  = profile?.name  ?? user?.name  ?? "—";
  const displayPhone = profile?.phone ?? "—";
  const displayRole  = profile?.role  ?? user?.role  ?? "—";
  const collegeName  = profile?.college_name ?? null;

  const roleLabel = {
    clerk:       "Clerk",
    faculty:     "Faculty",
    super_admin: "Super Admin",
  }[displayRole] ?? displayRole;

  const avatarColor = displayRole === "faculty" ? "bg-sky-600" : "bg-violet-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="font-head text-lg font-bold text-zinc-900">My Profile</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition text-xl leading-none">×</button>
        </div>

        <div className="px-7 py-6 flex flex-col gap-5">

          {/* Profile view */}
          {step === "profile" && (
            <>
              {/* Avatar + identity */}
              <div className="flex items-center gap-4">
                <div className={`${avatarColor} w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-head font-bold text-xl">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{displayName}</p>
                  <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase mt-0.5">{roleLabel}</p>
                </div>
              </div>

              {/* Info rows */}
              <div className="flex flex-col gap-3 bg-stone-50 rounded-xl px-4 py-3">
                <InfoRow label="Phone" value={displayPhone} mono />
                {collegeName && <InfoRow label="College" value={collegeName} />}
              </div>

              {/* Actions */}
              <button
                onClick={openChangePassword}
                className="w-full bg-zinc-900 hover:bg-zinc-700 text-white font-mono text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                Change Password
              </button>

              <button
                onClick={handleSignOut}
                className="w-full border border-red-200 text-red-500 hover:bg-red-50 font-mono text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                Sign Out
              </button>
            </>
          )}

          {/* Change password */}
          {(step === "change_password" || step === "forgot_otp") && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">

              {step === "forgot_otp" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit OTP"
                    autoFocus
                    className="w-full bg-stone-50 border border-zinc-200 rounded-xl font-mono text-lg tracking-[0.4em] text-center px-4 py-2.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                  />
                  <p className="text-[10px] text-zinc-400 font-mono">
                    OTP sent to your registered phone.{" "}
                    {resendCooldown > 0
                      ? <span className="text-zinc-400">Resend in {resendCooldown}s</span>
                      : <button type="button" onClick={handleSendOtp} disabled={loading} className="text-amber-600 hover:underline disabled:opacity-50">Resend</button>
                    }
                  </p>
                </div>
              )}

              {step === "change_password" && (
                <PwdField label="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Your current password" />
              )}

              <PwdField label="New Password"      value={newPassword}     onChange={e => setNewPassword(e.target.value)}     placeholder="At least 6 characters" />
              <PwdField label="Re-enter Password" value={reEnterPassword} onChange={e => setReEnterPassword(e.target.value)} placeholder="Repeat new password" />

              {error && <p className="text-xs text-red-500 font-mono">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-white font-mono text-xs py-2.5 rounded-xl transition cursor-pointer mt-1"
              >
                {loading ? "Saving…" : "Change Password"}
              </button>

              {/* Forgot password — only on change_password step */}
              {step === "change_password" && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="text-xs text-zinc-400 hover:text-zinc-700 font-mono underline underline-offset-2 transition disabled:opacity-50"
                  >
                    {loading ? "Sending OTP…" : "Forgot password? Verify via OTP"}
                  </button>
                </div>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep("profile")}
                  className="text-xs text-zinc-400 hover:text-zinc-600 font-mono transition"
                >
                  ← Back
                </button>
              </div>
            </form>
          )}

          {/* Success */}
          {step === "done" && (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-mono text-center">
                Password changed successfully.
              </div>
              <button
                onClick={onClose}
                className="w-full border border-zinc-200 text-zinc-500 hover:bg-zinc-50 font-mono text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase flex-shrink-0">{label}</span>
      <span className={`text-sm text-zinc-700 text-right truncate ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
    </div>
  );
}

function PwdField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-stone-50 border border-zinc-200 rounded-xl font-mono text-sm px-4 py-2.5 pr-10 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition"
        >
          {show
            ? <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          }
        </button>
      </div>
    </div>
  );
}
