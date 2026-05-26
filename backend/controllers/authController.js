const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/queries");
const { audit } = require("../db/audit");
const { sendOtp } = require("../services/whatsapp");
const { validatePassword } = require("../utils/validate");

const OTP_TTL = 10 * 60 * 1000;

function genOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }

async function resolveCollegeCode(req, res) {
  const { college_code } = req.body;
  if (!college_code || college_code.length !== 8) {
    return res.status(400).json({ error: "Invalid college code" });
  }
  const college = await db.getCollegeByCode(college_code.trim());
  if (!college) {
    return res.status(404).json({ error: "College not found" });
  }
  return res.json({ college_id: college.college_id, name: college.name });
}

async function login(req, res) {
  const { college_id, phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: "Phone and password required" });
  }

  let user;
  if (!college_id) {
    user = await db.getSuperAdminByPhone(phone);
  } else {
    const college = await db.getCollegeById(Number(college_id));
    if (!college) {
      return res.status(404).json({ error: "College not found" });
    }
    if (!college.is_active) {
      return res.status(403).json({ error: "College access is currently disabled." });
    }
    user = await db.getUserByPhone(Number(college_id), phone);
  }

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (user.is_blocked) {
    return res.status(403).json({ error: "Account is blocked. Contact your administrator." });
  }

  const jti = require("crypto").randomUUID();
  const payload = {
    jti,
    user_id: user.user_id,
    college_id: user.college_id || null,
    role: user.role,
    name: user.name,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });

  // Audit login — attach user info manually since req.user isn't set yet
  req.user = { user_id: user.user_id, name: user.name, role: user.role, college_id: user.college_id || null };
  audit(req, "USER_LOGIN", { type: "user", id: user.user_id, name: user.name });

  const isProd = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    maxAge: 8 * 60 * 60 * 1000, // 8 hours in ms
  });

  return res.json({ user: { user_id: user.user_id, name: user.name, role: user.role } });
}

// POST /api/auth/forgot-password/send-otp
// Body: { college_id, phone }
async function forgotPasswordSendOtp(req, res) {
  const { college_id, phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone required" });

  const user = college_id
    ? await db.getUserByPhone(Number(college_id), phone)
    : await db.getSuperAdminByPhone(phone);

  if (!user) return res.status(404).json({ error: "No account found with this phone number" });

  const otp = genOtp();
  await db.saveOtp(user.user_id, "forgot", otp, OTP_TTL);

  try {
    await sendOtp(user.phone, otp);
  } catch (err) {
    return res.status(502).json({ error: err.message || "Failed to send OTP" });
  }

  return res.json({ ok: true });
}

// POST /api/auth/forgot-password/reset
// Body: { college_id, phone, otp, new_password }
async function forgotPasswordReset(req, res) {
  const { college_id, phone, otp, new_password } = req.body;
  if (!phone || !otp || !new_password) {
    return res.status(400).json({ error: "phone, otp and new_password required" });
  }
  const pwdErr = validatePassword(new_password);
  if (pwdErr) return res.status(400).json({ error: pwdErr });

  const user = college_id
    ? await db.getUserByPhone(Number(college_id), phone)
    : await db.getSuperAdminByPhone(phone);

  if (!user) return res.status(401).json({ error: "Invalid OTP" });

  const valid = await db.verifyAndConsumeOtp(user.user_id, "forgot", otp);
  if (!valid) return res.status(401).json({ error: "Invalid or expired OTP" });

  const password_hash = await bcrypt.hash(new_password, 10);
  await db.updateUserPassword(user.user_id, user.college_id ?? null, password_hash);

  req.user = { user_id: user.user_id, name: user.name, role: user.role, college_id: user.college_id || null };
  audit(req, "PASSWORD_CHANGED", { type: "user", id: user.user_id, name: user.name }, { method: "forgot_otp" });

  return res.json({ ok: true });
}

async function logout(req, res) {
  const isProd = process.env.NODE_ENV === "production";
  // Blacklist the token so it can't be reused even if someone captured it
  const token = req.cookies?.token;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.jti && payload.exp) {
        await db.blacklistToken(payload.jti, new Date(payload.exp * 1000));
      }
    } catch { /* token already invalid — nothing to blacklist */ }
  }
  res.clearCookie("token", { httpOnly: true, secure: isProd, sameSite: isProd ? "strict" : "lax" });
  return res.json({ ok: true });
}

module.exports = { resolveCollegeCode, login, logout, forgotPasswordSendOtp, forgotPasswordReset };
