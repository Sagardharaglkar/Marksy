const jwt = require("jsonwebtoken");
const db = require("../db/queries");

async function authenticate(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  // Reject tokens that were blacklisted on logout
  if (payload.jti && await db.isTokenBlacklisted(payload.jti)) {
    return res.status(401).json({ error: "Token has been revoked" });
  }
  // college_id is ALWAYS taken from the verified token, never from client input
  req.user = payload;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
