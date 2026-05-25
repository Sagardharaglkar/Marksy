const bcrypt = require("bcryptjs");
const db = require("../db/queries");

async function editClerk(req, res) {
  const { college_id, user_id } = req.params;
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: "name and phone required" });
  }

  // Check phone not taken by another user in same college
  const existing = await db.getUserByPhone(Number(college_id), phone.trim());
  if (existing && existing.user_id !== Number(user_id)) {
    return res.status(409).json({ error: "Phone already in use by another user" });
  }

  await db.updateClerk(Number(college_id), Number(user_id), name.trim(), phone.trim());
  return res.json({ ok: true });
}

async function removeClerk(req, res) {
  const { college_id, user_id } = req.params;
  await db.deleteClerk(Number(college_id), Number(user_id));
  return res.json({ ok: true });
}

async function blockClerk(req, res) {
  const { college_id, user_id } = req.params;
  const { is_blocked } = req.body;
  if (typeof is_blocked !== "boolean") {
    return res.status(400).json({ error: "is_blocked (boolean) required" });
  }
  await db.setClerkBlocked(Number(college_id), Number(user_id), is_blocked);
  return res.json({ ok: true, is_blocked });
}

async function toggleCollegeActive(req, res) {
  const { college_id } = req.params;
  const { is_active } = req.body;
  if (typeof is_active !== "boolean") {
    return res.status(400).json({ error: "is_active (boolean) required" });
  }
  await db.setCollegeActive(Number(college_id), is_active);
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

  const college_id = await db.createCollege(name.trim(), college_code);
  return res.status(201).json({ college_id, college_code, name: name.trim() });
}

async function listColleges(req, res) {
  const colleges = await db.getAllColleges();
  return res.json(colleges);
}

async function listClerks(req, res) {
  const { college_id } = req.params;
  const clerks = await db.getClerksByCollege(Number(college_id));
  return res.json(clerks);
}

async function createFirstClerk(req, res) {
  const { college_id, name, phone, password } = req.body;
  if (!college_id || !name || !phone || !password) {
    return res.status(400).json({ error: "college_id, name, phone, password required" });
  }

  const college = await db.getCollegeById(Number(college_id));
  if (!college) {
    return res.status(404).json({ error: "College not found" });
  }

  const existing = await db.getUserByPhone(Number(college_id), phone);
  if (existing) {
    return res.status(409).json({ error: "Phone already registered in this college" });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const user_id = await db.createUser(Number(college_id), "clerk", name.trim(), phone.trim(), password_hash);
  return res.status(201).json({ user_id, name: name.trim(), role: "clerk" });
}

module.exports = { createCollege, listColleges, listClerks, createFirstClerk, editClerk, removeClerk, blockClerk, toggleCollegeActive };
