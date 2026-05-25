const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/queries");

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

  const payload = {
    user_id: user.user_id,
    college_id: user.college_id || null,
    role: user.role,
    name: user.name,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });
  return res.json({ token, user: { user_id: user.user_id, name: user.name, role: user.role } });
}

module.exports = { resolveCollegeCode, login };
