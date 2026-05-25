const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  // Allow token via query param for file downloads (e.g. ?token=...)
  const token = (header && header.startsWith("Bearer ") ? header.slice(7) : null)
    || req.query.token;
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // college_id is ALWAYS taken from the verified token, never from client input
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
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
