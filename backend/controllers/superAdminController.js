const bcrypt = require("bcryptjs");
const db = require("../db/queries");
const { audit } = require("../db/audit");
const { validatePassword, validatePhone } = require("../utils/validate");

const toTitleCase = s => s.trim().replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1));

async function editClerk(req, res) {
  const { college_id, user_id } = req.params;
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: "name and phone required" });
  }
  const phoneErr = validatePhone(phone);
  if (phoneErr) return res.status(400).json({ error: phoneErr });

  const existing = await db.getUserByPhone(Number(college_id), phone.trim());
  if (existing && existing.user_id !== Number(user_id)) {
    return res.status(409).json({ error: "Phone already in use by another user" });
  }

  const n = toTitleCase(name);
  await db.updateClerk(Number(college_id), Number(user_id), n, phone.trim());
  audit(req, "CLERK_UPDATED", { type: "clerk", id: user_id, name: n }, { college_id, phone: phone.trim() });
  return res.json({ ok: true });
}

async function removeClerk(req, res) {
  const { college_id, user_id } = req.params;
  await db.deleteClerk(Number(college_id), Number(user_id));
  audit(req, "CLERK_DELETED", { type: "clerk", id: user_id }, { college_id });
  return res.json({ ok: true });
}

async function blockClerk(req, res) {
  const { college_id, user_id } = req.params;
  const { is_blocked } = req.body;
  if (typeof is_blocked !== "boolean") {
    return res.status(400).json({ error: "is_blocked (boolean) required" });
  }
  await db.setClerkBlocked(Number(college_id), Number(user_id), is_blocked);
  audit(req, is_blocked ? "CLERK_BLOCKED" : "CLERK_UNBLOCKED", { type: "clerk", id: user_id }, { college_id });
  return res.json({ ok: true, is_blocked });
}

async function toggleCollegeActive(req, res) {
  const { college_id } = req.params;
  const { is_active } = req.body;
  if (typeof is_active !== "boolean") {
    return res.status(400).json({ error: "is_active (boolean) required" });
  }
  await db.setCollegeActive(Number(college_id), is_active);
  audit(req, is_active ? "COLLEGE_ACTIVATED" : "COLLEGE_DEACTIVATED", { type: "college", id: college_id }, {});
  return res.json({ ok: true, is_active });
}

function generateCollegeCode() {
  // 8 uppercase alphanumeric characters
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function createCollege(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "College name required" });
  }

  // Generate a unique 8-char code — retry on collision (rare)
  let college_code;
  let attempts = 0;
  while (attempts < 10) {
    college_code = generateCollegeCode();
    const existing = await db.getCollegeByCode(college_code);
    if (!existing) break;
    attempts++;
  }

  const n = toTitleCase(name);
  const college_id = await db.createCollege(n, college_code);
  audit(req, "COLLEGE_CREATED", { type: "college", id: college_id, name: n }, { college_code });
  return res.status(201).json({ college_id, college_code, name: n });
}

async function listColleges(req, res) {
  const { page, limit } = req.query;
  const result = await db.getAllColleges(page, limit);
  return res.json(result);
}

async function listClerks(req, res) {
  const { college_id } = req.params;
  const { page, limit } = req.query;
  const result = await db.getClerksByCollege(Number(college_id), page, limit);
  return res.json(result);
}

async function createFirstClerk(req, res) {
  const { college_id, name, phone, password } = req.body;
  if (!college_id || !name || !phone || !password) {
    return res.status(400).json({ error: "college_id, name, phone, password required" });
  }
  const phoneErr = validatePhone(phone);
  if (phoneErr) return res.status(400).json({ error: phoneErr });
  const pwdErr = validatePassword(password);
  if (pwdErr) return res.status(400).json({ error: pwdErr });

  const college = await db.getCollegeById(Number(college_id));
  if (!college) {
    return res.status(404).json({ error: "College not found" });
  }

  const existing = await db.getUserByPhone(Number(college_id), phone);
  if (existing) {
    return res.status(409).json({ error: "Phone already registered in this college" });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const n = toTitleCase(name);
  const user_id = await db.createUser(Number(college_id), "clerk", n, phone.trim(), password_hash);
  audit(req, "CLERK_CREATED", { type: "clerk", id: user_id, name: n }, { college_id, phone: phone.trim() });
  return res.status(201).json({ user_id, name: n, role: "clerk" });
}

module.exports = { createCollege, listColleges, listClerks, createFirstClerk, editClerk, removeClerk, blockClerk, toggleCollegeActive };
