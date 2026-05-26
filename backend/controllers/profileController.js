const bcrypt  = require("bcryptjs");
const db      = require("../db/queries");
const { sendOtp } = require("../services/whatsapp");
const { audit }   = require("../db/audit");
const { validatePassword } = require("../utils/validate");

const OTP_TTL = 10 * 60 * 1000; // 10 minutes

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── GET /api/profile ─────────────────────────────────────────────────────────

async function getProfile(req, res) {
  const { user_id, college_id } = req.user;
  const user = await db.getUserById(user_id, college_id);
  if (!user) return res.status(404).json({ error: "User not found" });

  let college_name = null;
  if (college_id) {
    const college = await db.getCollegeById(college_id);
    college_name = college?.name || null;
  }

  return res.json({
    user_id:      user.user_id,
    name:         user.name,
    phone:        user.phone,
    role:         user.role,
    college_name,
  });
}

// ─── POST /api/profile/send-otp ───────────────────────────────────────────────
// Generates OTP and sends it to the user's registered phone via WhatsApp.

async function requestOtp(req, res) {
  const { user_id, college_id } = req.user;
  const user = await db.getUserById(user_id, college_id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const otp = generateOtp();
  await db.saveOtp(user_id, "profile", otp, OTP_TTL);

  try {
    await sendOtp(user.phone, otp);
  } catch (err) {
    return res.status(502).json({ error: err.message || "Failed to send OTP" });
  }

  return res.json({ ok: true, message: "OTP sent to your registered phone number" });
}

// ─── POST /api/profile/change-password ───────────────────────────────────────
// Body: { old_password?, otp?, new_password }
// One of old_password or otp must be provided.

async function changePassword(req, res) {
  const { user_id, college_id } = req.user;
  const { old_password, otp, new_password } = req.body;

  const pwdErr = validatePassword(new_password);
  if (pwdErr) return res.status(400).json({ error: pwdErr });
  if (!old_password && !otp) {
    return res.status(400).json({ error: "Provide either old password or OTP" });
  }

  const user = await db.getUserById(user_id, college_id);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Verify identity
  if (old_password) {
    const match = await bcrypt.compare(old_password, user.password_hash);
    if (!match) return res.status(400).json({ error: "Old password is incorrect" });
  } else {
    const valid = await db.verifyAndConsumeOtp(user_id, "profile", otp);
    if (!valid) return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  const password_hash = await bcrypt.hash(new_password, 10);
  await db.updateUserPassword(user_id, college_id, password_hash);

  audit(req, "PASSWORD_CHANGED", { type: "user", id: user_id, name: user.name }, {
    method: old_password ? "old_password" : "otp",
  });

  return res.json({ ok: true, message: "Password changed successfully" });
}

module.exports = { getProfile, requestOtp, changePassword };
